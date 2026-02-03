"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Download, Eye } from "lucide-react";
import { format } from "date-fns";
import Papa from "papaparse";

interface Process {
  id: string;
  status: string;
  formData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  workflowTemplate: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  steps: Array<{
    id: string;
    status: string;
    actedAt: string | null;
    workflowStep: {
      name: string;
      stepType: string;
    };
    actedBy: {
      id: string;
      name: string;
    } | null;
  }>;
}

interface Workflow {
  id: string;
  name: string;
}

interface Approver {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  COMPLETED: "bg-green-100 text-green-800",
  CHANGES_REQUESTED: "bg-yellow-100 text-yellow-800",
};

export default function ReportsPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowFilter, setWorkflowFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [approverFilter, setApproverFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchReports();
  }, [workflowFilter, statusFilter, approverFilter, startDate, endDate]);

  async function fetchReports() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (workflowFilter !== "all") params.set("workflowId", workflowFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (approverFilter !== "all") params.set("approverId", approverFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("limit", "100");

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProcesses(data.processes);
        setWorkflows(data.workflows);
        setApprovers(data.approvers);
        setTotal(data.pagination.total);
      } else {
        toast.error("Failed to fetch reports");
      }
    } catch {
      toast.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  }

  function exportToCSV() {
    const csvData = processes.map((process) => ({
      ID: process.id,
      Workflow: process.workflowTemplate.name,
      Status: process.status,
      "Created By": process.createdBy.name,
      "Created By Email": process.createdBy.email,
      "Created At": format(new Date(process.createdAt), "yyyy-MM-dd HH:mm:ss"),
      "Updated At": format(new Date(process.updatedAt), "yyyy-MM-dd HH:mm:ss"),
      "Last Approver": process.steps
        .filter((s) => s.actedBy)
        .map((s) => s.actedBy?.name)
        .filter(Boolean)
        .pop() || "",
      "Completion Date": process.status === "COMPLETED"
        ? format(new Date(process.updatedAt), "yyyy-MM-dd HH:mm:ss")
        : "",
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `process-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report exported successfully");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and export process reports
          </p>
        </div>
        <Button onClick={exportToCSV} disabled={processes.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-44">
              <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by workflow" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workflows</SelectItem>
                  {workflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-44">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="CHANGES_REQUESTED">Changes Requested</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-44">
              <Select value={approverFilter} onValueChange={setApproverFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by approver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Approvers</SelectItem>
                  {approvers.map((approver) => (
                    <SelectItem key={approver.id} value={approver.id}>
                      {approver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
                placeholder="Start date"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
                placeholder="End date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 text-sm text-muted-foreground">
        Showing {processes.length} of {total} results
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : processes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No processes match your filters
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              processes.map((process) => (
                <TableRow key={process.id}>
                  <TableCell className="font-medium">
                    {process.workflowTemplate.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusColors[process.status]}
                      variant="secondary"
                    >
                      {process.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{process.createdBy.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(process.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(process.updatedAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/processes/${process.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
