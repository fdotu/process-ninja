import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const process = await db.processInstance.findUnique({
      where: { id },
      include: {
        workflowTemplate: {
          include: {
            steps: { orderBy: { stepOrder: "asc" } },
            formSchema: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        steps: {
          include: {
            workflowStep: true,
            actedBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: {
            workflowStep: { stepOrder: "asc" },
          },
        },
        auditLogs: {
          include: {
            changedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { changedAt: "desc" },
        },
      },
    });

    if (!process) {
      return NextResponse.json(
        { error: "Process not found" },
        { status: 404 }
      );
    }

    // Check access
    if (
      session.user.role === "USER" &&
      process.createdById !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(process);
  } catch (error) {
    console.error("Error fetching process:", error);
    return NextResponse.json(
      { error: "Failed to fetch process" },
      { status: 500 }
    );
  }
}
