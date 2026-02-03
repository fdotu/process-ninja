import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view full audit log
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const processId = searchParams.get("processId");
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (processId) where.processInstanceId = processId;
    if (userId) where.changedById = userId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.changedAt = {};
      if (startDate) (where.changedAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.changedAt as Record<string, Date>).lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { changedAt: "desc" },
        skip,
        take: limit,
        include: {
          changedBy: {
            select: { id: true, name: true, email: true },
          },
          processInstance: {
            select: {
              id: true,
              workflowTemplate: { select: { name: true } },
            },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    // Get unique actions for filter dropdown
    const actions = await db.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
    });

    // Get users for filter dropdown
    const users = await db.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      logs,
      actions: actions.map((a) => a.action),
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
