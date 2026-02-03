"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Save, Play, Archive } from "lucide-react";
import Link from "next/link";
import { WorkflowStepsList } from "@/components/workflow/WorkflowStepsList";
import { FormBuilder } from "@/components/form/FormBuilder";

interface WorkflowStep {
  id?: string;
  stepOrder: number;
  stepType: "FORM" | "APPROVAL" | "NOTIFICATION";
  name: string;
  config: Record<string, unknown>;
}

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
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  steps: WorkflowStep[];
  formSchema: {
    fields: FormField[];
  } | null;
}

const statusColors = {
  DRAFT: "bg-gray-100 text-gray-800",
  ACTIVE: "bg-green-100 text-green-800",
  ARCHIVED: "bg-yellow-100 text-yellow-800",
};

export default function EditWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [formFields, setFormFields] = useState<FormField[]>([]);

  useEffect(() => {
    fetchWorkflow();
  }, [id]);

  async function fetchWorkflow() {
    try {
      const res = await fetch(`/api/workflows/${id}`);
      if (res.ok) {
        const data = await res.json();
        setWorkflow(data);
        setName(data.name);
        setDescription(data.description || "");
        setSteps(data.steps);
        setFormFields(data.formSchema?.fields || []);
      } else {
        toast.error("Workflow not found");
        router.push("/workflows");
      }
    } catch {
      toast.error("Failed to fetch workflow");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Workflow name is required");
      return;
    }

    if (steps.length === 0) {
      toast.error("Workflow must have at least one step");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          steps: steps.map((step, index) => ({
            ...step,
            stepOrder: index + 1,
          })),
          formSchema: formFields.length > 0 ? { fields: formFields } : null,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setWorkflow(updated);
        toast.success("Workflow saved successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save workflow");
      }
    } catch {
      toast.error("Failed to save workflow");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: string) {
    try {
      const res = await fetch(`/api/workflows/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        const updated = await res.json();
        setWorkflow(updated);
        toast.success(`Workflow ${status.toLowerCase()}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
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
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!workflow) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/workflows">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{workflow.name}</h1>
              <Badge className={statusColors[workflow.status]} variant="secondary">
                {workflow.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">Edit workflow template</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {workflow.status === "DRAFT" && (
            <Button variant="outline" onClick={() => handleStatusChange("ACTIVE")}>
              <Play className="mr-2 h-4 w-4" />
              Activate
            </Button>
          )}
          {workflow.status === "ACTIVE" && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("ARCHIVED")}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          )}
          {workflow.status === "ARCHIVED" && (
            <Button variant="outline" onClick={() => handleStatusChange("ACTIVE")}>
              <Play className="mr-2 h-4 w-4" />
              Reactivate
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="form">Form Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Details</CardTitle>
              <CardDescription>
                Basic information about your workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Leave Request, Expense Approval"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this workflow..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="steps">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Steps</CardTitle>
              <CardDescription>
                Define the sequence of steps in your workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowStepsList steps={steps} onStepsChange={setSteps} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form">
          <Card>
            <CardHeader>
              <CardTitle>Form Builder</CardTitle>
              <CardDescription>
                Design the form that users will fill out when starting a process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormBuilder fields={formFields} onFieldsChange={setFormFields} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
