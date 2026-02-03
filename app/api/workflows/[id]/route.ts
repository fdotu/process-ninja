import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  steps: z
    .array(
      z.object({
        id: z.string().optional(),
        stepOrder: z.number().int().min(1),
        stepType: z.enum(["FORM", "APPROVAL", "NOTIFICATION"]),
        name: z.string().min(1),
        config: z.record(z.string(), z.any()).optional(),
      })
    )
    .optional(),
  formSchema: z
    .object({
      fields: z.array(z.any()),
    })
    .optional()
    .nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const workflow = await db.workflowTemplate.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
        },
        formSchema: true,
        _count: {
          select: { processes: true },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Error fetching workflow:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateWorkflowSchema.safeParse(body);

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

    const { name, description, steps, formSchema } = result.data;

    // Update in a transaction
    const workflow = await db.$transaction(async (tx) => {
      // Update basic info
      await tx.workflowTemplate.update({
        where: { id },
        data: {
          name: name ?? existingWorkflow.name,
          description: description ?? existingWorkflow.description,
        },
      });

      // Update steps if provided
      if (steps) {
        // Delete existing steps
        await tx.workflowStep.deleteMany({
          where: { workflowTemplateId: id },
        });

        // Create new steps
        await tx.workflowStep.createMany({
          data: steps.map((step) => ({
            workflowTemplateId: id,
            stepOrder: step.stepOrder,
            stepType: step.stepType,
            name: step.name,
            config: (step.config || {}) as Prisma.InputJsonValue,
          })),
        });
      }

      // Update form schema if provided
      if (formSchema !== undefined) {
        if (formSchema === null) {
          // Delete form schema
          await tx.formSchema.deleteMany({
            where: { workflowTemplateId: id },
          });
        } else {
          // Upsert form schema
          await tx.formSchema.upsert({
            where: { workflowTemplateId: id },
            create: {
              workflowTemplateId: id,
              fields: formSchema.fields as Prisma.InputJsonValue,
            },
            update: {
              fields: formSchema.fields as Prisma.InputJsonValue,
            },
          });
        }
      }

      return tx.workflowTemplate.findUnique({
        where: { id },
        include: {
          steps: { orderBy: { stepOrder: "asc" } },
          formSchema: true,
        },
      });
    });

    await createAuditLog({
      action: "WORKFLOW_UPDATED",
      changedById: session.user.id,
      previousValue: { name: existingWorkflow.name },
      newValue: { name: workflow?.name },
      notes: `Workflow "${workflow?.name}" updated`,
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Error updating workflow:", error);
    return NextResponse.json(
      { error: "Failed to update workflow" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const workflow = await db.workflowTemplate.findUnique({
      where: { id },
      include: { _count: { select: { processes: true } } },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    if (workflow._count.processes > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete workflow with existing processes. Archive it instead.",
        },
        { status: 400 }
      );
    }

    await db.workflowTemplate.delete({
      where: { id },
    });

    await createAuditLog({
      action: "WORKFLOW_DELETED",
      changedById: session.user.id,
      previousValue: { id: workflow.id, name: workflow.name },
      notes: `Workflow "${workflow.name}" deleted`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return NextResponse.json(
      { error: "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
