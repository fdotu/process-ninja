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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Process {
  id: string;
  status: string;
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
    workflowStep: {
      name: string;
      stepType: string;
      stepOrder: number;
    };
  }>;
}

interface Workflow {
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

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [workflowFilter, setWorkflowFilter] = useState<string>("all");

  useEffect(() => {
    fetchWorkflows();
  }, []);

  useEffect(() => {
    fetchProcesses();
  }, [statusFilter, workflowFilter]);

  async function fetchWorkflows() {
    try {
      const res = await fetch("/api/workflows?status=ACTIVE");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows);
      }
    } catch {
      console.error("Failed to fetch workflows");
    }
  }

  async function fetchProcesses() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (workflowFilter !== "all") {
        params.set("workflowId", workflowFilter);
      }
      const res = await fetch(`/api/processes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProcesses(data.processes);
      } else {
        toast.error("Failed to fetch processes");
      }
    } catch {
      toast.error("Failed to fetch processes");
    } finally {
      setLoading(false);
    }
  }

  function getCurrentStep(process: Process) {
    const pendingStep = process.steps.find((s) => s.status === "PENDING");
    if (pendingStep) {
      return pendingStep.workflowStep.name;
    }
    const lastStep = process.steps[process.steps.length - 1];
    return lastStep?.workflowStep.name || "N/A";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Processes</h1>
          <p className="text-muted-foreground">View and manage process instances</p>
        </div>
        <Button asChild>
          <Link href="/processes/new">
            <Plus className="mr-2 h-4 w-4" />
            New Process
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
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

        <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
          <SelectTrigger className="w-52">
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Step</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : processes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">No processes found</p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link href="/processes/new">Start a new process</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              processes.map((process) => (
                <TableRow key={process.id}>
                  <TableCell>
                    <Link
                      href={`/processes/${process.id}`}
                      className="font-medium hover:underline"
                    >
                      {process.workflowTemplate.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusColors[process.status]}
                      variant="secondary"
                    >
                      {process.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getCurrentStep(process)}
                  </TableCell>
                  <TableCell>{process.createdBy.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(process.createdAt), {
                      addSuffix: true,
                    })}
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
