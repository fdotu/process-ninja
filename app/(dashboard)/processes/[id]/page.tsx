"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  User,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { ProcessTimeline } from "@/components/process/ProcessTimeline";

interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
}

interface Process {
  id: string;
  status: string;
  formData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  workflowTemplate: {
    id: string;
    name: string;
    formSchema: {
      fields: FormField[];
    } | null;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  steps: Array<{
    id: string;
    status: string;
    comments: string | null;
    actedAt: string | null;
    workflowStep: {
      id: string;
      name: string;
      stepType: string;
      stepOrder: number;
    };
    actedBy: {
      id: string;
      name: string;
    } | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    notes: string | null;
    changedAt: string;
    changedBy: {
      id: string;
      name: string;
    };
  }>;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  PENDING: { icon: Clock, color: "text-gray-600", bg: "bg-gray-100" },
  IN_PROGRESS: { icon: Clock, color: "text-blue-600", bg: "bg-blue-100" },
  COMPLETED: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  APPROVED: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  REJECTED: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  CHANGES_REQUESTED: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-100" },
};

export default function ProcessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [process, setProcess] = useState<Process | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "approve" | "reject" | "request_changes";
    stepId: string;
  } | null>(null);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProcess();
  }, [id]);

  async function fetchProcess() {
    try {
      const res = await fetch(`/api/processes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProcess(data);
      } else {
        toast.error("Process not found");
        router.push("/processes");
      }
    } catch {
      toast.error("Failed to fetch process");
    } finally {
      setLoading(false);
    }
  }

  async function handleAction() {
    if (!actionDialog || !process) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/processes/${process.id}/steps/${actionDialog.stepId}/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: actionDialog.action,
            comments: comments || undefined,
          }),
        }
      );

      if (res.ok) {
        const updated = await res.json();
        setProcess(updated);
        toast.success(
          actionDialog.action === "approve"
            ? "Request approved"
            : actionDialog.action === "reject"
            ? "Request rejected"
            : "Changes requested"
        );
        setActionDialog(null);
        setComments("");
        fetchProcess(); // Refresh to get audit logs
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to process action");
      }
    } catch {
      toast.error("Failed to process action");
    } finally {
      setSubmitting(false);
    }
  }

  function canTakeAction() {
    if (!session?.user) return false;
    return ["ADMIN", "APPROVER"].includes(session.user.role);
  }

  function getPendingApprovalStep() {
    if (!process) return null;
    return process.steps.find(
      (s) => s.status === "PENDING" && s.workflowStep.stepType === "APPROVAL"
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!process) return null;

  const StatusIcon = statusConfig[process.status]?.icon || Clock;
  const pendingStep = getPendingApprovalStep();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/processes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {process.workflowTemplate.name}
              </h1>
              <Badge
                className={`${statusConfig[process.status]?.bg} ${statusConfig[process.status]?.color}`}
                variant="secondary"
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {process.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Submitted by {process.createdBy.name} ·{" "}
              {formatDistanceToNow(new Date(process.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Form Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {process.workflowTemplate.formSchema?.fields.length ? (
                <dl className="grid gap-4 md:grid-cols-2">
                  {process.workflowTemplate.formSchema.fields.map((field) => {
                    const value = process.formData[field.name];
                    return (
                      <div key={field.id}>
                        <dt className="text-sm font-medium text-muted-foreground">
                          {field.label}
                        </dt>
                        <dd className="mt-1">
                          {value !== undefined && value !== null
                            ? field.type === "date"
                              ? format(new Date(value as string), "PPP")
                              : field.type === "currency"
                              ? `$${value}`
                              : String(value)
                            : "-"}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <p className="text-muted-foreground">No form data</p>
              )}
            </CardContent>
          </Card>

          {/* Approval Actions */}
          {canTakeAction() && pendingStep && process.status === "IN_PROGRESS" && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Action Required</CardTitle>
                <CardDescription>
                  Review and take action on: {pendingStep.workflowStep.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button
                  onClick={() =>
                    setActionDialog({
                      open: true,
                      action: "approve",
                      stepId: pendingStep.id,
                    })
                  }
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setActionDialog({
                      open: true,
                      action: "request_changes",
                      stepId: pendingStep.id,
                    })
                  }
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Request Changes
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    setActionDialog({
                      open: true,
                      action: "reject",
                      stepId: pendingStep.id,
                    })
                  }
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Recent actions on this request</CardDescription>
            </CardHeader>
            <CardContent>
              {process.auditLogs.length === 0 ? (
                <p className="text-muted-foreground">No activity yet</p>
              ) : (
                <div className="space-y-4">
                  {process.auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="mt-1">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{log.changedBy.name}</span>{" "}
                          {log.notes || log.action.toLowerCase().replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.changedAt), "PPP 'at' p")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>Workflow steps</CardDescription>
            </CardHeader>
            <CardContent>
              <ProcessTimeline steps={process.steps} />
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(new Date(process.createdAt), "PPP 'at' p")}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Submitted By</p>
                <p className="font-medium">{process.createdBy.name}</p>
                <p className="text-sm text-muted-foreground">
                  {process.createdBy.email}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {format(new Date(process.updatedAt), "PPP 'at' p")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialog */}
      <AlertDialog
        open={actionDialog?.open}
        onOpenChange={(open) => !open && setActionDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog?.action === "approve"
                ? "Approve Request"
                : actionDialog?.action === "reject"
                ? "Reject Request"
                : "Request Changes"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog?.action === "approve"
                ? "Are you sure you want to approve this request?"
                : actionDialog?.action === "reject"
                ? "Are you sure you want to reject this request? This action cannot be undone."
                : "Provide details about the changes needed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="comments">
              Comments {actionDialog?.action !== "approve" && "(recommended)"}
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments or notes..."
              rows={3}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={submitting}
              className={
                actionDialog?.action === "reject"
                  ? "bg-red-600 hover:bg-red-700"
                  : actionDialog?.action === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : ""
              }
            >
              {submitting
                ? "Processing..."
                : actionDialog?.action === "approve"
                ? "Approve"
                : actionDialog?.action === "reject"
                ? "Reject"
                : "Request Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
