"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Settings,
  Type,
  Hash,
  Calendar,
  List,
  FileText,
  DollarSign,
  File,
} from "lucide-react";
import { v4 as uuid } from "uuid";

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

interface Props {
  fields: FormField[];
  onFieldsChange: (fields: FormField[]) => void;
}

const fieldTypes = [
  { value: "text", label: "Text", icon: Type },
  { value: "number", label: "Number", icon: Hash },
  { value: "date", label: "Date", icon: Calendar },
  { value: "dropdown", label: "Dropdown", icon: List },
  { value: "textarea", label: "Textarea", icon: FileText },
  { value: "currency", label: "Currency", icon: DollarSign },
  { value: "file", label: "File Upload", icon: File },
];

const fieldTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  text: Type,
  number: Hash,
  date: Calendar,
  dropdown: List,
  textarea: FileText,
  currency: DollarSign,
  file: File,
};

export function FormBuilder({ fields, onFieldsChange }: Props) {
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [optionsText, setOptionsText] = useState("");

  function handleAddField() {
    const newField: FormField = {
      id: uuid(),
      name: "",
      label: "",
      type: "text",
      required: false,
    };
    setEditingField(newField);
    setIsNew(true);
    setOptionsText("");
    setDialogOpen(true);
  }

  function handleEditField(field: FormField) {
    setEditingField({ ...field });
    setOptionsText(field.options?.join("\n") || "");
    setIsNew(false);
    setDialogOpen(true);
  }

  function handleSaveField() {
    if (!editingField || !editingField.name.trim() || !editingField.label.trim()) {
      return;
    }

    const fieldToSave = { ...editingField };

    // Parse options for dropdown
    if (fieldToSave.type === "dropdown" && optionsText.trim()) {
      fieldToSave.options = optionsText
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);
    }

    if (isNew) {
      onFieldsChange([...fields, fieldToSave]);
    } else {
      onFieldsChange(fields.map((f) => (f.id === fieldToSave.id ? fieldToSave : f)));
    }
    setDialogOpen(false);
    setEditingField(null);
  }

  function handleDeleteField(id: string) {
    onFieldsChange(fields.filter((f) => f.id !== id));
  }

  function handleMoveField(index: number, direction: "up" | "down") {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === fields.length - 1)
    ) {
      return;
    }

    const newFields = [...fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [
      newFields[targetIndex],
      newFields[index],
    ];
    onFieldsChange(newFields);
  }

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No form fields defined</p>
          <Button onClick={handleAddField}>
            <Plus className="mr-2 h-4 w-4" />
            Add First Field
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {fields.map((field, index) => {
              const Icon = fieldTypeIcons[field.type] || Type;
              return (
                <Card key={field.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => handleMoveField(index, "up")}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => handleMoveField(index, "down")}
                          disabled={index === fields.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-100">
                        <Icon className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{field.label}</p>
                          {field.required && (
                            <Badge variant="outline" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {field.name} · {field.type}
                          {field.options && ` · ${field.options.length} options`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditField(field)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteField(field.id)}
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
          <Button variant="outline" onClick={handleAddField}>
            <Plus className="mr-2 h-4 w-4" />
            Add Field
          </Button>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add Field" : "Edit Field"}</DialogTitle>
            <DialogDescription>Configure the form field</DialogDescription>
          </DialogHeader>
          {editingField && (
            <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="field-label">Label *</Label>
                <Input
                  id="field-label"
                  value={editingField.label}
                  onChange={(e) =>
                    setEditingField({ ...editingField, label: e.target.value })
                  }
                  placeholder="e.g., Full Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field-name">Field Name *</Label>
                <Input
                  id="field-name"
                  value={editingField.name}
                  onChange={(e) =>
                    setEditingField({
                      ...editingField,
                      name: e.target.value.replace(/\s+/g, "_").toLowerCase(),
                    })
                  }
                  placeholder="e.g., full_name"
                />
                <p className="text-xs text-muted-foreground">
                  Used as the field identifier (no spaces)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="field-type">Field Type *</Label>
                <Select
                  value={editingField.type}
                  onValueChange={(value) =>
                    setEditingField({ ...editingField, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="field-required"
                  checked={editingField.required}
                  onCheckedChange={(checked) =>
                    setEditingField({
                      ...editingField,
                      required: checked === true,
                    })
                  }
                />
                <Label htmlFor="field-required">Required field</Label>
              </div>

              {editingField.type === "dropdown" && (
                <div className="space-y-2">
                  <Label htmlFor="field-options">Options (one per line) *</Label>
                  <Textarea
                    id="field-options"
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    placeholder={"Option 1\nOption 2\nOption 3"}
                    rows={4}
                  />
                </div>
              )}

              {editingField.type === "text" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-length">Min Length</Label>
                    <Input
                      id="min-length"
                      type="number"
                      value={
                        (editingField.validation?.minLength as number) || ""
                      }
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          validation: {
                            ...editingField.validation,
                            minLength: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-length">Max Length</Label>
                    <Input
                      id="max-length"
                      type="number"
                      value={
                        (editingField.validation?.maxLength as number) || ""
                      }
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          validation: {
                            ...editingField.validation,
                            maxLength: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {editingField.type === "number" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min-value">Min Value</Label>
                    <Input
                      id="min-value"
                      type="number"
                      value={(editingField.validation?.min as number) || ""}
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          validation: {
                            ...editingField.validation,
                            min: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-value">Max Value</Label>
                    <Input
                      id="max-value"
                      type="number"
                      value={(editingField.validation?.max as number) || ""}
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          validation: {
                            ...editingField.validation,
                            max: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {editingField.type === "currency" && (
                <div className="space-y-2">
                  <Label htmlFor="currency-code">Currency Code</Label>
                  <Select
                    value={
                      (editingField.validation?.currency as string) || "USD"
                    }
                    onValueChange={(value) =>
                      setEditingField({
                        ...editingField,
                        validation: {
                          ...editingField.validation,
                          currency: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveField}
              disabled={
                !editingField?.name.trim() ||
                !editingField?.label.trim() ||
                (editingField?.type === "dropdown" && !optionsText.trim())
              }
            >
              {isNew ? "Add Field" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
