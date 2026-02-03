import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

const updateStatusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const result = updateStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const existingWorkflow = await db.workflowTemplate.findUnique({
      where: { id },
      include: { steps: true, formSchema: true },
    });

    if (!existingWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const { status } = result.data;

    // Validate before activating
    if (status === "ACTIVE") {
      if (existingWorkflow.steps.length === 0) {
        return NextResponse.json(
          { error: "Workflow must have at least one step to be activated" },
          { status: 400 }
        );
      }

      const hasFormStep = existingWorkflow.steps.some(
        (s) => s.stepType === "FORM"
      );
      if (hasFormStep && !existingWorkflow.formSchema) {
        return NextResponse.json(
          { error: "Workflow with form step must have a form schema defined" },
          { status: 400 }
        );
      }
    }

    const workflow = await db.workflowTemplate.update({
      where: { id },
      data: { status },
      include: {
        steps: { orderBy: { stepOrder: "asc" } },
        formSchema: true,
      },
    });

    await createAuditLog({
      action: "WORKFLOW_STATUS_CHANGED",
      changedById: session.user.id,
      previousValue: { status: existingWorkflow.status },
      newValue: { status: workflow.status },
      notes: `Workflow "${workflow.name}" status changed from ${existingWorkflow.status} to ${status}`,
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Error updating workflow status:", error);
    return NextResponse.json(
      { error: "Failed to update workflow status" },
      { status: 500 }
    );
  }
}
