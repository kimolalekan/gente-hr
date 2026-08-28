"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, LogIn, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/hr-data";

const STATUS_META: Record<
  AttendanceStatus,
  { variant: "success" | "warning" | "secondary" | "destructive" }
> = {
  present: { variant: "success" },
  late: { variant: "warning" },
  remote: { variant: "secondary" },
  on_leave: { variant: "secondary" },
  absent: { variant: "destructive" },
};

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function todayIso(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Shape of an attendance record returned by the API. */
interface ApiAttendanceRecord {
  employeeId?: string | null;
  date?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  hours?: number | null;
  status?: string | null;
}

function toRecord(api: ApiAttendanceRecord): AttendanceRecord | null {
  if (!api.date) return null;
  return {
    employeeId: api.employeeId ?? "",
    date: api.date,
    checkIn: api.checkIn ?? "",
    checkOut: api.checkOut ?? "",
    hours: typeof api.hours === "number" ? api.hours : 0,
    status:
      api.status === "present" ||
      api.status === "late" ||
      api.status === "remote" ||
      api.status === "on_leave" ||
      api.status === "absent"
        ? api.status
        : "present",
  };
}

/** A record only counts as today when its date matches the current day. */
function isTodayRecord(
  record: AttendanceRecord | null | undefined,
): record is AttendanceRecord {
  return Boolean(record && record.date === todayIso());
}

/**
 * Daily check-in card for the signed-in employee. Persists via
 * `POST /api/attendance/check-in` / `check-out`; API failures surface as
 * errors — no local demo state.
 */
export function CheckInCard({
  initial,
}: {
  initial?: AttendanceRecord | null;
}) {
  const { t } = useTranslations();
  const [record, setRecord] = useState<AttendanceRecord | null>(() =>
    isTodayRecord(initial) ? initial : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const checkedIn = Boolean(record?.checkIn);
  const checkedOut = Boolean(record?.checkOut);

  // Load today's record from the API (member-scoped) on mount.
  useEffect(() => {
    const today = todayIso();
    fetch(`/api/attendance?from=${today}&to=${today}&pageSize=1`)
      .then((response) => response.json())
      .then((body) => {
        if (body?.ok && body.data?.items?.[0]) {
          const today = toRecord(body.data.items[0]);
          if (isTodayRecord(today)) setRecord(today);
        }
      })
      .catch(() => {
        // Keep the server-rendered `initial` record when the API is down.
      });
  }, []);

  const checkIn = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    let apiError: string | null = null;
    try {
      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "web" }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: ApiAttendanceRecord;
      } | null;
      if (!body?.ok || !body.data) {
        apiError = body?.error ?? t("errors.checkInFailed");
        throw new Error(apiError);
      }
      setRecord(toRecord(body.data));
      setNotice(
        t("attendance.checkedInAt", {
          time: body.data.checkIn ?? nowTime(),
        }),
      );
    } catch {
      // No local demo fallback — surface the failure so the user knows the
      // check-in was not recorded.
      setError(apiError ?? t("common.networkError"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  const checkOut = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    let apiError: string | null = null;
    try {
      const response = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: ApiAttendanceRecord;
      } | null;
      if (!body?.ok || !body.data) {
        apiError = body?.error ?? t("errors.checkOutFailed");
        throw new Error(apiError);
      }
      setRecord(toRecord(body.data));
      setNotice(
        t("attendance.checkedOutAt", {
          time: body.data.checkOut ?? nowTime(),
        }),
      );
    } catch {
      // No local demo fallback — surface the failure so the user knows the
      // check-out was not recorded.
      setError(apiError ?? t("common.networkError"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  const meta = STATUS_META[record?.status ?? "absent"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("common.today")}</CardTitle>
        <CardDescription>
          {t("attendance.dailyCheckInDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("common.status")}
          </span>
          <Badge variant={meta.variant}>
            {t(
              `statusLabels.attendance.${record?.status ?? "absent"}` as TranslationKey,
            )}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("attendance.checkIn")}
          </span>
          <span className="font-mono text-sm">{record?.checkIn ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("attendance.checkOut")}
          </span>
          <span className="font-mono text-sm">{record?.checkOut ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("attendance.hours")}
          </span>
          <span className="font-medium">
            {record && record.hours > 0 ? record.hours.toFixed(1) : "—"}
          </span>
        </div>

        {notice && (
          <p className="flex items-center gap-1.5 rounded-lg border border-border bg-background/50 p-2.5 text-xs text-success">
            <CheckCircle2 className="size-3.5" />
            {notice}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            {error}
          </p>
        )}

        {!checkedOut ? (
          <Button
            className="w-full"
            variant={checkedIn ? "outline" : "default"}
            onClick={checkedIn ? checkOut : checkIn}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : checkedIn ? (
              <LogOut className="size-4" />
            ) : (
              <LogIn className="size-4" />
            )}
            {busy
              ? t("common.saving")
              : checkedIn
                ? t("attendance.checkOut")
                : t("attendance.checkIn")}
          </Button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            {t("attendance.dayComplete")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
