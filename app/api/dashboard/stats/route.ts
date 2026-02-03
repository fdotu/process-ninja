import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      activeProcesses,
      pendingApprovals,
      completedProcesses,
      rejectedProcesses,
      processesByStatus,
      recentActivity,
      workflowStats,
    ] = await Promise.all([
      // Active processes count
      db.processInstance.count({
        where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
      }),

      // Pending approvals count (for approvers/admins)
      session.user.role !== "USER"
        ? db.processStepInstance.count({
            where: {
              status: "PENDING",
              workflowStep: { stepType: "APPROVAL" },
            },
          })
        : Promise.resolve(0),

      // Completed processes count
      db.processInstance.count({
        where: { status: "COMPLETED" },
      }),

      // Rejected processes count
      db.processInstance.count({
        where: { status: "REJECTED" },
      }),

      // Processes grouped by status
      db.processInstance.groupBy({
        by: ["status"],
        _count: { status: true },
      }),

      // Recent activity
      db.auditLog.findMany({
        take: 10,
        orderBy: { changedAt: "desc" },
        include: {
          changedBy: { select: { name: true } },
          processInstance: {
            select: {
              id: true,
              workflowTemplate: { select: { name: true } },
            },
          },
        },
      }),

      // Workflow stats
      db.workflowTemplate.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          _count: { select: { processes: true } },
        },
        orderBy: { processes: { _count: "desc" } },
        take: 5,
      }),
    ]);

    // My pending items (for current user)
    const myPendingProcesses = await db.processInstance.count({
      where: {
        createdById: session.user.id,
        status: { in: ["PENDING", "IN_PROGRESS", "CHANGES_REQUESTED"] },
      },
    });

    return NextResponse.json({
      activeProcesses,
      pendingApprovals,
      completedProcesses,
      rejectedProcesses,
      myPendingProcesses,
      processesByStatus: processesByStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      }, {} as Record<string, number>),
      recentActivity,
      workflowStats,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
