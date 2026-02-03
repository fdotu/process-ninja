"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  GripVertical,
  FileText,
  CheckCircle,
  Bell,
  Settings,
} from "lucide-react";

interface WorkflowStep {
  id?: string;
  stepOrder: number;
  stepType: "FORM" | "APPROVAL" | "NOTIFICATION";
  name: string;
  config: Record<string, unknown>;
}

interface Props {
  steps: WorkflowStep[];
  onStepsChange: (steps: WorkflowStep[]) => void;
}

const stepTypeIcons = {
  FORM: FileText,
  APPROVAL: CheckCircle,
  NOTIFICATION: Bell,
};

const stepTypeColors = {
  FORM: "bg-blue-100 text-blue-600",
  APPROVAL: "bg-green-100 text-green-600",
  NOTIFICATION: "bg-yellow-100 text-yellow-600",
};

export function WorkflowStepsList({ steps, onStepsChange }: Props) {
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);

  function handleAddStep() {
    const newStep: WorkflowStep = {
      stepOrder: steps.length + 1,
      stepType: "APPROVAL",
      name: "",
      config: {},
    };
    setEditingStep(newStep);
    setIsNew(true);
    setDialogOpen(true);
  }

  function handleEditStep(step: WorkflowStep) {
    setEditingStep({ ...step });
    setIsNew(false);
    setDialogOpen(true);
  }

  function handleSaveStep() {
    if (!editingStep || !editingStep.name.trim()) return;

    if (isNew) {
      onStepsChange([...steps, editingStep]);
    } else {
      onStepsChange(
        steps.map((s) =>
          s.stepOrder === editingStep.stepOrder ? editingStep : s
        )
      );
    }
    setDialogOpen(false);
    setEditingStep(null);
  }

  function handleDeleteStep(stepOrder: number) {
    const newSteps = steps
      .filter((s) => s.stepOrder !== stepOrder)
      .map((s, index) => ({ ...s, stepOrder: index + 1 }));
    onStepsChange(newSteps);
  }

  function handleMoveStep(index: number, direction: "up" | "down") {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [
      newSteps[targetIndex],
      newSteps[index],
    ];

    // Update stepOrder
    newSteps.forEach((step, i) => {
      step.stepOrder = i + 1;
    });

    onStepsChange(newSteps);
  }

  return (
    <div className="space-y-4">
      {steps.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No steps defined</p>
          <Button onClick={handleAddStep}>
            <Plus className="mr-2 h-4 w-4" />
            Add First Step
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {steps.map((step, index) => {
              const Icon = stepTypeIcons[step.stepType];
              return (
                <Card key={step.stepOrder} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveStep(index, "up")}
                          disabled={index === 0}
                        >
                          <GripVertical className="h-4 w-4 rotate-90" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveStep(index, "down")}
                          disabled={index === steps.length - 1}
                        >
                          <GripVertical className="h-4 w-4 rotate-90" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-medium text-sm">
                        {index + 1}
                      </div>
                      <div
                        className={`p-2 rounded-lg ${stepTypeColors[step.stepType]}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{step.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {step.stepType.toLowerCase()} step
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditStep(step)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteStep(step.stepOrder)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Button variant="outline" onClick={handleAddStep}>
            <Plus className="mr-2 h-4 w-4" />
            Add Step
          </Button>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "Add Step" : "Edit Step"}</DialogTitle>
            <DialogDescription>
              Configure the workflow step
            </DialogDescription>
          </DialogHeader>
          {editingStep && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="step-name">Step Name *</Label>
                <Input
                  id="step-name"
                  value={editingStep.name}
                  onChange={(e) =>
                    setEditingStep({ ...editingStep, name: e.target.value })
                  }
                  placeholder="e.g., Manager Approval"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="step-type">Step Type *</Label>
                <Select
                  value={editingStep.stepType}
                  onValueChange={(value) =>
                    setEditingStep({
                      ...editingStep,
                      stepType: value as "FORM" | "APPROVAL" | "NOTIFICATION",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FORM">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Form
                      </div>
                    </SelectItem>
                    <SelectItem value="APPROVAL">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Approval
                      </div>
                    </SelectItem>
                    <SelectItem value="NOTIFICATION">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notification
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStep} disabled={!editingStep?.name.trim()}>
              {isNew ? "Add Step" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
