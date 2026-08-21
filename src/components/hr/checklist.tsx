"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  id: string;
  name: string;
  done: boolean;
}

/**
 * Interactive checklist with local state — used for onboarding task lists
 * and offboarding exit checklists (demo: not persisted).
 */
export function Checklist({
  items,
  label,
}: {
  items: ChecklistItem[];
  label: string;
}) {
  const [state, setState] = useState(items);

  const toggle = (id: string) => {
    setState((current) =>
      current.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  };

  const doneCount = state.filter((item) => item.done).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {doneCount} of {state.length} done
        </p>
      </div>
      <div className="space-y-1.5">
        {state.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            aria-pressed={item.done}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
              item.done && "opacity-70",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border",
                item.done
                  ? "border-success bg-success text-white"
                  : "border-border text-transparent",
              )}
            >
              <Check className="size-3" />
            </span>
            <span className={cn(item.done && "line-through")}>{item.name}</span>
          </button>
        ))}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.round((doneCount / state.length) * 100)}%` }}
        />
      </div>
    </div>
  );
}
