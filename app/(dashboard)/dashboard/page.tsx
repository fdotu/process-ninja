import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

async function DashboardStats() {
  const session = await auth();
  if (!session?.user) return null;

  const [
    activeProcesses,
    pendingApprovals,
    completedProcesses,
    recentActivity,
  ] = await Promise.all([
    db.processInstance.count({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    }),
    db.processStepInstance.count({
      where: {
        status: "PENDING",
        workflowStep: {
          stepType: "APPROVAL",
        },
      },
    }),
    db.processInstance.count({
      where: {
        status: "COMPLETED",
      },
    }),
    db.auditLog.findMany({
      take: 10,
      orderBy: { changedAt: "desc" },
      include: {
        changedBy: { select: { name: true } },
        processInstance: {
          select: { id: true, workflowTemplate: { select: { name: true } } },
        },
      },
    }),
  ]);

  const stats = [
    {
      title: "Active Processes",
      value: activeProcesses,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Pending Approvals",
      value: pendingApprovals,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Completed",
      value: completedProcesses,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 mt-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across all processes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              ) : (
                recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="mt-1">
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{log.changedBy.name}</span>{" "}
                        {log.action.toLowerCase().replace(/_/g, " ")}
                        {log.processInstance && (
                          <>
                            {" on "}
                            <Link
                              href={`/processes/${log.processInstance.id}`}
                              className="text-primary hover:underline"
                            >
                              {log.processInstance.workflowTemplate.name}
                            </Link>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.changedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/processes/new"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Start New Process</p>
                <p className="text-sm text-muted-foreground">
                  Submit a new request or form
                </p>
              </div>
            </Link>
            <Link
              href="/workflows/create"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Create Workflow</p>
                <p className="text-sm text-muted-foreground">
                  Design a new approval workflow
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DashboardStatsSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 mt-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your workflow processes
        </p>
      </div>
      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  );
}
