"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TASK_STATUS_LABELS,
  type OnboardingTask,
  type TaskStatus,
} from "@/lib/hr-data";

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  pending: "in_progress",
  in_progress: "completed",
  completed: "pending",
};

/**
 * Interactive onboarding task checklist. Clicking a task cycles its status
 * (pending → in_progress → completed → pending) via
 * `PATCH /api/onboarding/[id]/tasks/[taskId]` and refreshes the page so the
 * plan status / progress stay in sync with the server.
 */
export function OnboardingTasks({
  planId,
  tasks: initial,
}: {
  planId: string;
  tasks: OnboardingTask[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cycle = async (task: OnboardingTask) => {
    const status = NEXT_STATUS[task.status];
    setBusyId(task.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/onboarding/${planId}/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, status } : item,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <button
          key={task.id}
          type="button"
          disabled={busyId === task.id}
          onClick={() => cycle(task)}
          aria-pressed={task.status === "completed"}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 disabled:opacity-60",
            task.status === "completed" && "opacity-70",
          )}
        >
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full",
              task.status === "completed"
                ? "bg-success text-white"
                : "border border-border text-transparent",
            )}
          >
            <CheckCircle2 className="size-3" />
          </span>
          <span
            className={cn(
              "flex-1",
              task.status === "completed" && "text-muted-foreground line-through",
            )}
          >
            {task.name}
          </span>
          <Badge variant="outline" className="hidden sm:inline-flex">
            {task.department}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {TASK_STATUS_LABELS[task.status]}
          </span>
        </button>
      ))}
      {tasks.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">
          No tasks assigned yet — they are created when the new hire submits
          their details.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
