"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/provider";

export interface ChecklistItem {
  id: string;
  name: string;
  done: boolean;
}

/**
 * Interactive checklist. When `offboardingId` is provided, toggles are
 * persisted via `PATCH /api/offboarding/[id]/checklist/[itemId]`; otherwise
 * state stays local (e.g. previews).
 */
export function Checklist({
  items,
  label,
  offboardingId,
}: {
  items: ChecklistItem[];
  label: string;
  offboardingId?: string;
}) {
  const [state, setState] = useState(items);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslations();

  const toggle = async (item: ChecklistItem) => {
    const done = !item.done;
    setBusyId(item.id);
    setError(null);
    try {
      if (offboardingId) {
        const response = await fetch(
          `/api/offboarding/${offboardingId}/checklist/${item.id}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ done }),
          },
        );
        const body = await response.json();
        if (!body?.ok) {
          throw new Error(body?.error ?? `Request failed (${response.status})`);
        }
      }
      setState((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, done } : entry,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("offboarding.checklistUpdateFailed"),
      );
    } finally {
      setBusyId(null);
    }
  };

  const doneCount = state.filter((item) => item.done).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {t("offboarding.checklistCount", {
            done: doneCount,
            total: state.length,
          })}
        </p>
      </div>
      <div className="space-y-1.5">
        {state.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item)}
            disabled={busyId === item.id}
            aria-pressed={item.done}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 disabled:opacity-60",
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
        {state.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">
            {t("offboarding.noChecklistItems")}
          </p>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{
            width: `${state.length === 0 ? 0 : Math.round((doneCount / state.length) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
