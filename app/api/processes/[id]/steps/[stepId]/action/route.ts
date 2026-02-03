import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { notifyProcessCreator, notifyApprovers } from "@/lib/notifications";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "request_changes"]),
  comments: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and approvers can take action
    if (!["ADMIN", "APPROVER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: processId, stepId } = await params;
    const body = await request.json();
    const result = actionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { action, comments } = result.data;

    // Get the step instance
    const stepInstance = await db.processStepInstance.findUnique({
      where: { id: stepId },
      include: {
        processInstance: {
          include: {
            workflowTemplate: {
              include: {
                steps: { orderBy: { stepOrder: "asc" } },
              },
            },
            createdBy: { select: { id: true, name: true } },
            steps: {
              include: { workflowStep: true },
              orderBy: { workflowStep: { stepOrder: "asc" } },
            },
          },
        },
        workflowStep: true,
      },
    });

    if (!stepInstance) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    if (stepInstance.processInstanceId !== processId) {
      return NextResponse.json(
        { error: "Step does not belong to this process" },
        { status: 400 }
      );
    }

    if (stepInstance.status !== "PENDING") {
      return NextResponse.json(
        { error: "Step is not pending" },
        { status: 400 }
      );
    }

    if (stepInstance.workflowStep.stepType !== "APPROVAL") {
      return NextResponse.json(
        { error: "This step type does not support approval actions" },
        { status: 400 }
      );
    }

    const process = stepInstance.processInstance;
    const workflow = process.workflowTemplate;
    const currentStepOrder = stepInstance.workflowStep.stepOrder;

    // Update the step instance and process
    await db.$transaction(async (tx) => {
      // Update step instance
      await tx.processStepInstance.update({
        where: { id: stepId },
        data: {
          status: action === "approve" ? "COMPLETED" : "REJECTED",
          actedById: session.user.id,
          actedAt: new Date(),
          comments,
        },
      });

      if (action === "approve") {
        // Check if there are more steps
        const nextStepOrder = currentStepOrder + 1;
        const nextWorkflowStep = workflow.steps.find(
          (s) => s.stepOrder === nextStepOrder
        );

        if (nextWorkflowStep) {
          // There's a next step - find and activate it
          const nextStepInstance = process.steps.find(
            (s) => s.workflowStep.stepOrder === nextStepOrder
          );

          if (nextStepInstance) {
            if (nextWorkflowStep.stepType === "NOTIFICATION") {
              // Auto-complete notification steps
              await tx.processStepInstance.update({
                where: { id: nextStepInstance.id },
                data: {
                  status: "COMPLETED",
                  actedAt: new Date(),
                },
              });

              // Check for another next step
              const subsequentStep = workflow.steps.find(
                (s) => s.stepOrder === nextStepOrder + 1
              );
              if (!subsequentStep) {
                // No more steps - process is complete
                await tx.processInstance.update({
                  where: { id: processId },
                  data: { status: "COMPLETED" },
                });
              }
            } else {
              // Set next step to pending (it already is, but mark process as in progress)
              await tx.processInstance.update({
                where: { id: processId },
                data: { status: "IN_PROGRESS" },
              });
            }
          }
        } else {
          // No more steps - process is complete
          await tx.processInstance.update({
            where: { id: processId },
            data: { status: "COMPLETED" },
          });
        }
      } else if (action === "reject") {
        // Reject the entire process
        await tx.processInstance.update({
          where: { id: processId },
          data: { status: "REJECTED" },
        });
      } else if (action === "request_changes") {
        // Request changes - keep process in a special status
        await tx.processInstance.update({
          where: { id: processId },
          data: { status: "CHANGES_REQUESTED" },
        });
      }
    });

    // Create audit log
    const actionMap = {
      approve: "STEP_COMPLETED",
      reject: "STEP_REJECTED",
      request_changes: "CHANGES_REQUESTED",
    };

    await createAuditLog({
      processInstanceId: processId,
      action: actionMap[action],
      changedById: session.user.id,
      newValue: { stepName: stepInstance.workflowStep.name, action, comments },
      notes: `${stepInstance.workflowStep.name}: ${action}${comments ? ` - ${comments}` : ""}`,
    });

    // Notify creator
    const notificationAction =
      action === "approve"
        ? "approved"
        : action === "reject"
        ? "rejected"
        : "changes_requested";

    // Get current user's name for notification
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    await notifyProcessCreator(
      processId,
      process.createdById,
      notificationAction,
      workflow.name,
      currentUser?.name
    );

    // If approved and there's a next approval step, notify approvers
    if (action === "approve") {
      const nextStepOrder = currentStepOrder + 1;
      const nextWorkflowStep = workflow.steps.find(
        (s) => s.stepOrder === nextStepOrder && s.stepType === "APPROVAL"
      );
      if (nextWorkflowStep) {
        await notifyApprovers(processId, workflow.name);
      }
    }

    // Fetch updated process
    const updatedProcess = await db.processInstance.findUnique({
      where: { id: processId },
      include: {
        workflowTemplate: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        steps: {
          include: {
            workflowStep: true,
            actedBy: { select: { id: true, name: true } },
          },
          orderBy: { workflowStep: { stepOrder: "asc" } },
        },
      },
    });

    return NextResponse.json(updatedProcess);
  } catch (error) {
    console.error("Error processing action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}
