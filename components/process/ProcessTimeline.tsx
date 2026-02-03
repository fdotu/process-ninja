"use client";

import { CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Step {
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
}

interface Props {
  steps: Step[];
}

const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string; lineColor: string }
> = {
  PENDING: {
    icon: Clock,
    color: "text-gray-400",
    bgColor: "bg-gray-100",
    lineColor: "bg-gray-200",
  },
  IN_PROGRESS: {
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    lineColor: "bg-blue-200",
  },
  COMPLETED: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
    lineColor: "bg-green-500",
  },
  REJECTED: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    lineColor: "bg-red-500",
  },
  SKIPPED: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    lineColor: "bg-yellow-500",
  },
};

export function ProcessTimeline({ steps }: Props) {
  const sortedSteps = [...steps].sort(
    (a, b) => a.workflowStep.stepOrder - b.workflowStep.stepOrder
  );

  return (
    <div className="relative">
      {sortedSteps.map((step, index) => {
        const config = statusConfig[step.status] || statusConfig.PENDING;
        const Icon = config.icon;
        const isLast = index === sortedSteps.length - 1;
        const isCompleted = step.status === "COMPLETED";

        return (
          <div key={step.id} className="relative pb-8">
            {/* Connecting line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-4 top-8 -ml-px h-full w-0.5",
                  isCompleted ? "bg-green-500" : "bg-gray-200"
                )}
              />
            )}

            <div className="relative flex items-start">
              {/* Icon */}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white",
                  config.bgColor
                )}
              >
                <Icon className={cn("h-4 w-4", config.color)} />
              </div>

              {/* Content */}
              <div className="ml-4 min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{step.workflowStep.name}</p>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      config.bgColor,
                      config.color
                    )}
                  >
                    {step.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground capitalize">
                  {step.workflowStep.stepType.toLowerCase()} step
                </p>
                {step.actedBy && step.actedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.actedBy.name} ·{" "}
                    {format(new Date(step.actedAt), "MMM d, h:mm a")}
                  </p>
                )}
                {step.comments && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    &quot;{step.comments}&quot;
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
