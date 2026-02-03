"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { DynamicForm, validateFormData } from "@/components/form/DynamicForm";

interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  validation?: Record<string, unknown>;
  options?: string[];
  conditionalOn?: {
    fieldId: string;
    value: unknown;
  };
}

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  steps: Array<{
    id: string;
    name: string;
    stepType: string;
    stepOrder: number;
  }>;
  formSchema: {
    fields: FormField[];
  } | null;
}

export default function NewProcessPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  async function fetchWorkflows() {
    try {
      const res = await fetch("/api/workflows?status=ACTIVE");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows);
      } else {
        toast.error("Failed to fetch workflows");
      }
    } catch {
      toast.error("Failed to fetch workflows");
    } finally {
      setLoading(false);
    }
  }

  function handleWorkflowSelect(workflowId: string) {
    const workflow = workflows.find((w) => w.id === workflowId) || null;
    setSelectedWorkflow(workflow);
    setFormData({});
    setErrors({});
  }

  async function handleSubmit() {
    if (!selectedWorkflow) return;

    // Validate form
    const formFields = selectedWorkflow.formSchema?.fields || [];
    const validationErrors = validateFormData(formFields, formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fix the form errors");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/processes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowTemplateId: selectedWorkflow.id,
          formData,
        }),
      });

      if (res.ok) {
        const process = await res.json();
        toast.success("Process started successfully");
        router.push(`/processes/${process.id}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to start process");
      }
    } catch {
      toast.error("Failed to start process");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/processes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Start New Process</h1>
          <p className="text-muted-foreground">
            Select a workflow and fill out the form
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Workflow</CardTitle>
          <CardDescription>
            Choose which workflow you want to start
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : workflows.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-2">
                No active workflows available
              </p>
              <Button asChild variant="outline">
                <Link href="/workflows/create">Create a workflow</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Workflow</Label>
              <Select
                value={selectedWorkflow?.id || ""}
                onValueChange={handleWorkflowSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a workflow" />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedWorkflow?.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedWorkflow.description}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedWorkflow && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Workflow Steps</CardTitle>
              <CardDescription>
                This request will go through the following steps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedWorkflow.steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
                      <span className="text-xs text-gray-500">{index + 1}</span>
                      <span>{step.name}</span>
                    </div>
                    {index < selectedWorkflow.steps.length - 1 && (
                      <span className="mx-2 text-gray-400">→</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>Fill out the required information</CardDescription>
            </CardHeader>
            <CardContent>
              <DynamicForm
                fields={selectedWorkflow.formSchema?.fields || []}
                values={formData}
                onChange={setFormData}
                errors={errors}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" asChild>
              <Link href="/processes">Cancel</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
