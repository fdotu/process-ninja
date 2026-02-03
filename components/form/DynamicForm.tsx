"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

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
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function DynamicForm({
  fields,
  values,
  onChange,
  errors = {},
  disabled = false,
}: Props) {
  const [datePopoverOpen, setDatePopoverOpen] = useState<Record<string, boolean>>({});

  function handleChange(name: string, value: unknown) {
    onChange({ ...values, [name]: value });
  }

  function isFieldVisible(field: FormField): boolean {
    if (!field.conditionalOn) return true;
    const dependentValue = values[field.conditionalOn.fieldId];
    return dependentValue === field.conditionalOn.value;
  }

  function renderField(field: FormField) {
    if (!isFieldVisible(field)) return null;

    const error = errors[field.name];
    const value = values[field.name];

    switch (field.type) {
      case "text":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              value={(value as string) || ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={disabled}
              maxLength={field.validation?.maxLength as number}
              minLength={field.validation?.minLength as number}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "number":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              value={(value as number) ?? ""}
              onChange={(e) =>
                handleChange(
                  field.name,
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              disabled={disabled}
              min={field.validation?.min as number}
              max={field.validation?.max as number}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "currency":
        const currency = (field.validation?.currency as string) || "USD";
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currency === "USD"
                  ? "$"
                  : currency === "EUR"
                  ? "€"
                  : currency === "GBP"
                  ? "£"
                  : currency === "JPY"
                  ? "¥"
                  : "$"}
              </span>
              <Input
                id={field.name}
                type="number"
                step="0.01"
                value={(value as number) ?? ""}
                onChange={(e) =>
                  handleChange(
                    field.name,
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                disabled={disabled}
                className="pl-8"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "date":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Popover
              open={datePopoverOpen[field.name]}
              onOpenChange={(open) =>
                setDatePopoverOpen({ ...datePopoverOpen, [field.name]: open })
              }
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !value && "text-muted-foreground"
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(new Date(value as string), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value ? new Date(value as string) : undefined}
                  onSelect={(date) => {
                    handleChange(field.name, date?.toISOString());
                    setDatePopoverOpen({ ...datePopoverOpen, [field.name]: false });
                  }}
                />
              </PopoverContent>
            </Popover>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "dropdown":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={(value as string) || ""}
              onValueChange={(v) => handleChange(field.name, v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={(value as string) || ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={disabled}
              rows={(field.validation?.rows as number) || 4}
              maxLength={field.validation?.maxLength as number}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "file":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleChange(field.name, file.name);
                }
              }}
              disabled={disabled}
              accept={field.validation?.accept as string}
            />
            {typeof value === "string" && value && (
              <p className="text-sm text-muted-foreground">
                Selected: {value}
              </p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => renderField(field))}
      {fields.length === 0 && (
        <p className="text-muted-foreground text-center py-4">
          No form fields defined for this workflow
        </p>
      )}
    </div>
  );
}

export function validateFormData(
  fields: FormField[],
  values: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = values[field.name];

    // Check required
    if (field.required) {
      if (value === undefined || value === null || value === "") {
        errors[field.name] = `${field.label} is required`;
        continue;
      }
    }

    // Skip validation for empty non-required fields
    if (value === undefined || value === null || value === "") {
      continue;
    }

    // Type-specific validation
    if (field.type === "text" && typeof value === "string") {
      const minLength = field.validation?.minLength as number | undefined;
      const maxLength = field.validation?.maxLength as number | undefined;

      if (minLength && value.length < minLength) {
        errors[field.name] = `${field.label} must be at least ${minLength} characters`;
      }
      if (maxLength && value.length > maxLength) {
        errors[field.name] = `${field.label} must be no more than ${maxLength} characters`;
      }
    }

    if ((field.type === "number" || field.type === "currency") && typeof value === "number") {
      const min = field.validation?.min as number | undefined;
      const max = field.validation?.max as number | undefined;

      if (min !== undefined && value < min) {
        errors[field.name] = `${field.label} must be at least ${min}`;
      }
      if (max !== undefined && value > max) {
        errors[field.name] = `${field.label} must be no more than ${max}`;
      }
    }
  }

  return errors;
}
