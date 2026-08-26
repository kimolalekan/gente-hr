"use client";

import { useState } from "react";
import { Ban, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import type { LeaveRequest, LeaveStatus } from "@/lib/hr-data";

/** Raw leave row returned by the PATCH action endpoints. */
interface ApiLeaveRow {
  status?: string;
}

function isLeaveStatus(value: string | undefined): value is LeaveStatus {
  return (
    value === "approved" ||
    value === "pending" ||
    value === "declined" ||
    value === "cancelled"
  );
}

/**
 * Approve / Reject / Cancel actions for a leave request, persisted via the
 * `/api/leave/[id]/{approve,reject,cancel}` endpoints. Only shown while the
 * request is pending ("active"); once decided, it explains the outcome.
 */
export function LeaveRequestActions({ request }: { request: LeaveRequest }) {
  const { t } = useTranslations();
  const [status, setStatus] = useState<LeaveStatus>(request.status);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (action: "approve" | "reject" | "cancel") => {
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/leave/${request.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: ApiLeaveRow;
      } | null;
      if (!body?.ok || !body.data) {
        setError(body?.error ?? t("errors.updateFailed"));
        return;
      }
      if (isLeaveStatus(body.data.status)) setStatus(body.data.status);
    } catch {
      setError(t("errors.updateFailed"));
    } finally {
      setBusy(null);
    }
  };

  if (status !== "pending") {
    return (
      <div className="rounded-lg border border-border bg-background/50 p-3 text-sm">
        <p className="text-muted-foreground">
          {t("leave.noFurtherActions", {
            status: t(`statusLabels.leaveStatus.${status}` as TranslationKey),
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          {error}
        </p>
      )}
      <Button
        variant="success"
        className="w-full"
        disabled={busy !== null}
        onClick={() => decide("approve")}
      >
        {busy === "approve" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        {t("leave.approve")}
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="destructive"
          disabled={busy !== null}
          onClick={() => decide("reject")}
        >
          <X className="size-4" />
          {t("leave.reject")}
        </Button>
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() => decide("cancel")}
        >
          <Ban className="size-4" />
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
