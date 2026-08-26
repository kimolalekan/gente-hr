"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import type { LeaveRequest, LeaveType } from "@/lib/hr-data";

const LEAVE_TYPES: LeaveType[] = ["vacation", "sick", "parental", "other"];

function todayIso(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Days between two YYYY-MM-DD dates, inclusive. */
function diffDays(start: string, end: string): number {
  return (
    Math.round(
      (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
        86400000,
    ) + 1
  );
}

/** Shape of a leave row returned by `POST /api/leave`. */
interface ApiLeaveRow {
  id?: string;
  employeeId?: string;
  type?: string;
  startDate?: string | null;
  endDate?: string | null;
  days?: number;
  reason?: string | null;
  status?: string;
}

function isLeaveType(value: string): value is LeaveType {
  return LEAVE_TYPES.includes(value as LeaveType);
}

function toRequest(
  row: ApiLeaveRow,
  fallback: {
    employeeId: string;
    type: LeaveType;
    start: string;
    end: string;
    days: number;
    reason?: string;
  },
): LeaveRequest {
  return {
    id: row.id ?? `lv_${Date.now().toString(36)}`,
    employeeId: row.employeeId ?? fallback.employeeId,
    type: row.type && isLeaveType(row.type) ? row.type : fallback.type,
    start: row.startDate ?? fallback.start,
    end: row.endDate ?? fallback.end,
    days: row.days ?? fallback.days,
    status:
      row.status === "approved" ||
      row.status === "pending" ||
      row.status === "declined" ||
      row.status === "cancelled"
        ? row.status
        : "pending",
    reason: row.reason ?? fallback.reason,
  };
}

/**
 * Request-leave modal for the signed-in employee. Submits to
 * `POST /api/leave` (validates balance server-side); falls back to local
 * state when the API is unreachable (e.g. no database).
 */
export function LeaveRequestModal({
  open,
  onClose,
  employeeId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  onCreated: (request: LeaveRequest) => void;
}) {
  const { t } = useTranslations();
  const [type, setType] = useState<LeaveType>("vacation");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = start && end && end >= start ? diffDays(start, end) : 0;

  const handleClose = () => {
    setType("vacation");
    setStart("");
    setEnd("");
    setReason("");
    setError(null);
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!start || !end) {
      setError(t("leave.selectDates"));
      return;
    }
    if (end < start) {
      setError(t("leave.invalidDateRange"));
      return;
    }
    setBusy(true);
    setError(null);
    const fallback = {
      employeeId,
      type,
      start,
      end,
      days,
      reason: reason.trim() || undefined,
    };
    let apiError: string | null = null;
    try {
      const response = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          start,
          end,
          reason: reason.trim() || undefined,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: ApiLeaveRow;
      } | null;
      if (!body?.ok) {
        apiError = body?.error ?? t("errors.submitFailed");
        throw new Error(apiError);
      }
      onCreated(toRequest(body.data ?? {}, fallback));
      handleClose();
    } catch {
      if (apiError) {
        setError(apiError);
        return;
      }
      // Fallback: demo state so requesting leave works without a database.
      onCreated(toRequest({}, fallback));
      handleClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("leave.requestTitle")}
      description={t("leave.modalDescription")}
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="leave-request-form" disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {busy ? t("common.submitting") : t("payroll.loans.submitRequest")}
          </Button>
        </>
      }
    >
      <form
        id="leave-request-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="leave-type">{t("leave.type")}</Label>
          <Select
            id="leave-type"
            value={type}
            onChange={(event) => {
              const next = event.target.value;
              if (isLeaveType(next)) setType(next);
            }}
          >
            {LEAVE_TYPES.map((option) => (
              <option key={option} value={option}>
                {t(`statusLabels.leaveType.${option}` as TranslationKey)}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="leave-start">{t("leave.startDate")}</Label>
            <DatePicker
              id="leave-start"
              value={start}
              onChange={setStart}
              min={todayIso()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave-end">{t("leave.endDate")}</Label>
            <DatePicker
              id="leave-end"
              value={end}
              onChange={setEnd}
              min={start || todayIso()}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {days > 0
            ? `${t("leave.workingDays", {
                days,
                s: days === 1 ? "" : "s",
              })}.`
            : t("leave.pickDatesHint")}
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="leave-reason">
            {t("leave.reason")} ({t("common.optional")})
          </Label>
          <Input
            id="leave-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("leave.reasonPlaceholder")}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
