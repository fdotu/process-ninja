import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { createNotification, notifyApprovers } from "@/lib/notifications";

const createProcessSchema = z.object({
  workflowTemplateId: z.string().min(1),
  formData: z.record(z.string(), z.any()),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const workflowId = searchParams.get("workflowId");
    const createdById = searchParams.get("createdById");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (workflowId) where.workflowTemplateId = workflowId;
    if (createdById) where.createdById = createdById;

    // Non-admins can only see their own processes or processes they need to act on
    if (session.user.role === "USER") {
      where.createdById = session.user.id;
    }

    const [processes, total] = await Promise.all([
      db.processInstance.findMany({
        where,
        include: {
          workflowTemplate: {
            select: { id: true, name: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          steps: {
            include: {
              workflowStep: true,
              actedBy: {
                select: { id: true, name: true },
              },
            },
            orderBy: {
              workflowStep: { stepOrder: "asc" },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.processInstance.count({ where }),
    ]);

    return NextResponse.json({
      processes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching processes:", error);
    return NextResponse.json(
      { error: "Failed to fetch processes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createProcessSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { workflowTemplateId, formData } = result.data;

    // Get workflow with steps
    const workflow = await db.workflowTemplate.findUnique({
      where: { id: workflowTemplateId },
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
        formSchema: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    if (workflow.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Workflow is not active" },
        { status: 400 }
      );
    }

    if (workflow.steps.length === 0) {
      return NextResponse.json(
        { error: "Workflow has no steps defined" },
        { status: 400 }
      );
    }

    // Create process instance with step instances
    const process = await db.$transaction(async (tx) => {
      const processInstance = await tx.processInstance.create({
        data: {
          workflowTemplateId,
          createdById: session.user.id,
          formData: formData as Prisma.InputJsonValue,
          status: "IN_PROGRESS",
        },
      });

      // Create step instances for each workflow step
      const stepInstances = await Promise.all(
        workflow.steps.map((step, index) =>
          tx.processStepInstance.create({
            data: {
              processInstanceId: processInstance.id,
              workflowStepId: step.id,
              // First step (usually form) is auto-completed
              status: index === 0 && step.stepType === "FORM" ? "COMPLETED" : "PENDING",
              actedById: index === 0 && step.stepType === "FORM" ? session.user.id : null,
              actedAt: index === 0 && step.stepType === "FORM" ? new Date() : null,
            },
          })
        )
      );

      return { processInstance, stepInstances };
    });

    // Create audit log
    await createAuditLog({
      processInstanceId: process.processInstance.id,
      action: "PROCESS_CREATED",
      changedById: session.user.id,
      newValue: { workflowName: workflow.name, formData },
      notes: `Process started for "${workflow.name}"`,
    });

    // Notify creator
    await createNotification({
      userId: session.user.id,
      processInstanceId: process.processInstance.id,
      message: `Your "${workflow.name}" request has been submitted`,
      type: "INFO",
    });

    // If there's an approval step pending, notify approvers
    const hasApprovalPending = workflow.steps.some(
      (step, index) =>
        step.stepType === "APPROVAL" &&
        (index === 0 || (index === 1 && workflow.steps[0].stepType === "FORM"))
    );

    if (hasApprovalPending) {
      await notifyApprovers(process.processInstance.id, workflow.name);
    }

    // Fetch complete process data
    const completeProcess = await db.processInstance.findUnique({
      where: { id: process.processInstance.id },
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

    return NextResponse.json(completeProcess, { status: 201 });
  } catch (error) {
    console.error("Error creating process:", error);
    return NextResponse.json(
      { error: "Failed to create process" },
      { status: 500 }
    );
  }
}
