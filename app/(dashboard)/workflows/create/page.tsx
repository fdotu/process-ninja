"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
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

export default function CreateWorkflowPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { stepOrder: 1, stepType: "FORM", name: "Submit Form", config: {} },
    { stepOrder: 2, stepType: "APPROVAL", name: "Manager Approval", config: {} },
  ]);
  const [formFields, setFormFields] = useState<FormField[]>([]);

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
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          steps: steps.map((step, index) => ({
            ...step,
            stepOrder: index + 1,
          })),
          formSchema: formFields.length > 0 ? { fields: formFields } : undefined,
        }),
      });

      if (res.ok) {
        const workflow = await res.json();
        toast.success("Workflow created successfully");
        router.push(`/workflows/${workflow.id}/edit`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create workflow");
      }
    } catch {
      toast.error("Failed to create workflow");
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-2xl font-bold">Create Workflow</h1>
            <p className="text-muted-foreground">
              Design a new workflow template
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Workflow"}
        </Button>
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
