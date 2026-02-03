import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workflowId = searchParams.get("workflowId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const approverId = searchParams.get("approverId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (workflowId) where.workflowTemplateId = workflowId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate)
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate)
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    // Filter by approver if specified
    if (approverId) {
      where.steps = {
        some: {
          actedById: approverId,
        },
      };
    }

    const [processes, total, workflows, approvers] = await Promise.all([
      db.processInstance.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
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
              actedBy: { select: { id: true, name: true } },
            },
            orderBy: { workflowStep: { stepOrder: "asc" } },
          },
        },
      }),
      db.processInstance.count({ where }),
      db.workflowTemplate.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.user.findMany({
        where: { role: { in: ["ADMIN", "APPROVER"] } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      processes,
      workflows,
      approvers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
