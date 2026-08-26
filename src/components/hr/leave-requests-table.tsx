"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CalendarPlus, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useLocale } from "@/lib/i18n/use-locale";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { formatDate, type LeaveStatus, type LeaveType } from "@/lib/hr-data";

const STATUS_VARIANT: Record<
  LeaveStatus,
  "success" | "warning" | "destructive" | "secondary"
> = {
  approved: "success",
  pending: "warning",
  declined: "destructive",
  cancelled: "secondary",
};

/** Leave request row as returned by `GET /api/leave`. */
export interface LeaveRow {
  id: string;
  employeeId: string;
  employeeName?: string | null;
  type: LeaveType;
  start: string;
  end: string;
  days: number;
  reason?: string | null;
  status: LeaveStatus;
  createdAt?: string;
}

/** Raw leave row returned by the PATCH action endpoints. */
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

const LEAVE_TYPES: LeaveType[] = ["vacation", "sick", "parental", "other"];

function isLeaveType(value: string | undefined): value is LeaveType {
  return value != null && LEAVE_TYPES.includes(value as LeaveType);
}

function isLeaveStatus(value: string | undefined): value is LeaveStatus {
  return (
    value === "approved" ||
    value === "pending" ||
    value === "declined" ||
    value === "cancelled"
  );
}

/** Merge the PATCH response (raw DB row) back into the list row. */
function applyPatch(current: LeaveRow, row: ApiLeaveRow): LeaveRow {
  return {
    ...current,
    type: isLeaveType(row.type) ? row.type : current.type,
    start: row.startDate ?? current.start,
    end: row.endDate ?? current.end,
    days: row.days ?? current.days,
    reason: row.reason ?? current.reason,
    status: isLeaveStatus(row.status) ? row.status : current.status,
  };
}

/**
 * Leave requests table with actions: approve, extend (adds days to the end
 * date) and cancel — all persisted via the `/api/leave/[id]/*` endpoints.
 * `readOnly` hides the management actions (used for the employee's own view).
 */
export function LeaveRequestsTable({
  requests,
  readOnly = false,
}: {
  requests: LeaveRow[];
  readOnly?: boolean;
}) {
  const [items, setItems] = useState(requests);
  const [extending, setExtending] = useState<LeaveRow | null>(null);
  const [extraDays, setExtraDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();
  const { t } = useTranslations();
  const [busyId, setBusyId] = useState<string | null>(null);

  const runAction = async (
    id: string,
    action: "approve" | "reject" | "cancel",
  ) => {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/leave/${id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: ApiLeaveRow;
      } | null;
      if (!body?.ok || !body.data) {
        setError(body?.error ?? t("errors.actionFailed", { action }));
        return;
      }
      const row = body.data;
      setItems((current) =>
        current.map((request) =>
          request.id === id ? applyPatch(request, row) : request,
        ),
      );
    } catch {
      setError(t("errors.actionFailed", { action }));
    } finally {
      setBusyId(null);
    }
  };

  const openExtend = (request: LeaveRow) => {
    setExtending(request);
    setExtraDays("");
    setError(null);
  };

  const submitExtend = async (event: FormEvent) => {
    event.preventDefault();
    if (!extending) return;
    const days = Math.round(Number(extraDays));
    if (!Number.isFinite(days) || days < 1 || days > 60) {
      setError(t("leave.invalidDays"));
      return;
    }
    setBusyId(extending.id);
    setError(null);
    try {
      const response = await fetch(`/api/leave/${extending.id}/extend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraDays: days }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: ApiLeaveRow;
      } | null;
      if (!body?.ok || !body.data) {
        setError(body?.error ?? t("errors.extendFailed"));
        return;
      }
      const row = body.data;
      setItems((current) =>
        current.map((request) =>
          request.id === extending.id ? applyPatch(request, row) : request,
        ),
      );
      setExtending(null);
    } catch {
      setError(t("errors.extendFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      {error && !extending && (
        <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2.5 pr-4 font-medium">
                {t("onboarding.employee")}
              </th>
              <th className="px-4 py-2.5 font-medium">{t("leave.type")}</th>
              <th className="px-4 py-2.5 font-medium">{t("common.dates")}</th>
              <th className="px-4 py-2.5 font-medium">{t("leave.days")}</th>
              <th className="px-4 py-2.5 font-medium">{t("common.status")}</th>
              <th className="py-2.5 pl-4 text-right font-medium">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((request) => {
              const actionable =
                request.status === "pending" || request.status === "approved";
              return (
                <tr
                  key={request.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 pr-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {request.employeeName ?? "—"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t(
                      `statusLabels.leaveType.${request.type}` as TranslationKey,
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(request.start, locale)} →{" "}
                    {formatDate(request.end, locale)}
                  </td>
                  <td className="px-4 py-3">{request.days}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[request.status]}>
                      {t(
                        `statusLabels.leaveStatus.${request.status}` as TranslationKey,
                      )}
                    </Badge>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/leave/${request.id}`}>
                        <Button variant="outline" size="sm">
                          {t("common.view")}
                        </Button>
                      </Link>
                      {!readOnly && actionable && (
                        <>
                          {request.status === "pending" && (
                            <Button
                              variant="success"
                              size="sm"
                              disabled={busyId !== null}
                              onClick={() => runAction(request.id, "approve")}
                            >
                              <Check className="size-3.5" />
                              {t("leave.approve")}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId !== null}
                            onClick={() => openExtend(request)}
                          >
                            <CalendarPlus className="size-3.5" />
                            {t("leave.extend")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId !== null}
                            onClick={() => runAction(request.id, "cancel")}
                          >
                            <X className="size-3.5" />
                            {t("common.cancel")}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={extending !== null}
        onClose={() => setExtending(null)}
        title={t("leave.extendTitle")}
        description={
          extending
            ? `${formatDate(extending.start, locale)} → ${formatDate(extending.end, locale)} · ${t(
                "leave.daysCount",
                {
                  days: extending.days,
                  s: extending.days === 1 ? "" : "s",
                },
              )}`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setExtending(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="extend-leave-form">
              <CalendarPlus className="size-4" />
              {t("leave.extendTitle")}
            </Button>
          </>
        }
      >
        <form
          id="extend-leave-form"
          onSubmit={submitExtend}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="extend-days">{t("leave.additionalDays")}</Label>
            <Input
              id="extend-days"
              type="number"
              min={1}
              max={60}
              value={extraDays}
              onChange={(event) => setExtraDays(event.target.value)}
              placeholder={t("leave.additionalDaysPlaceholder")}
              autoFocus
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("leave.extendHint")}
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
