import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  steps: z
    .array(
      z.object({
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
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where = status ? { status: status as "DRAFT" | "ACTIVE" | "ARCHIVED" } : {};

    const [workflows, total] = await Promise.all([
      db.workflowTemplate.findMany({
        where,
        include: {
          steps: {
            orderBy: { stepOrder: "asc" },
          },
          formSchema: true,
          _count: {
            select: { processes: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      db.workflowTemplate.count({ where }),
    ]);

    return NextResponse.json({
      workflows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
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

    // Only admins can create workflows
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = createWorkflowSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, steps, formSchema } = result.data;

    const workflow = await db.workflowTemplate.create({
      data: {
        name,
        description,
        steps: steps
          ? {
              create: steps.map((step) => ({
                stepOrder: step.stepOrder,
                stepType: step.stepType,
                name: step.name,
                config: (step.config || {}) as Prisma.InputJsonValue,
              })),
            }
          : undefined,
        formSchema: formSchema
          ? {
              create: {
                fields: formSchema.fields as Prisma.InputJsonValue,
              },
            }
          : undefined,
      },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
        },
        formSchema: true,
      },
    });

    await createAuditLog({
      action: "WORKFLOW_CREATED",
      changedById: session.user.id,
      newValue: { id: workflow.id, name: workflow.name },
      notes: `Workflow "${workflow.name}" created`,
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}
