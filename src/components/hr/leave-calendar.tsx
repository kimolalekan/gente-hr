import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import { formatWeekdayShort } from "@/lib/i18n/dates";
import type { TranslationKey } from "@/lib/i18n/types";
import type { LeaveStatus, LeaveType } from "@/lib/hr-data";
import { cn } from "@/lib/utils";

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** One leave on a calendar day, as returned by `GET /api/leave/calendar`. */
export interface CalendarLeave {
  id: string;
  employeeId: string;
  employeeName: string | null;
  type: LeaveType;
  start: string;
  end: string;
  status: LeaveStatus;
}

/** One calendar day with the leaves overlapping it. */
export interface LeaveCalendarDay {
  date: string;
  leaves: CalendarLeave[];
}

/**
 * Team leave calendar for a month (data from `/api/leave/calendar`). Days
 * with two or more overlapping requests are flagged as conflicts.
 */
export async function LeaveCalendar({
  month,
  days,
}: {
  month: string; // YYYY-MM
  days: LeaveCalendarDay[];
}) {
  const t = await getTranslator();
  const locale = await getTenantLocale();
  const [year, monthIndex] = month.split("-").map(Number);
  const firstDay = new Date(year, monthIndex - 1, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, monthIndex, 0).getDate();

  const leaveByDay = new Map<number, CalendarLeave[]>();
  for (const day of days) {
    leaveByDay.set(Number(day.date.slice(-2)), day.leaves);
  }

  const cells = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const requests = leaveByDay.get(day) ?? [];
    return { day, requests, conflict: requests.length > 1 };
  });

  // Monday-first weekday header labels, localized via the tenant locale.
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const offset = (index + firstWeekday) % 7;
    const date = `${year}-${String(monthIndex).padStart(2, "0")}-${String(offset + 1).padStart(2, "0")}`;
    return formatWeekdayShort(date, locale);
  });

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary/20" />{" "}
          {t("leave.title")}
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="size-3 text-warning" />{" "}
          {t("leave.conflictOverlap")}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weekdayLabels.map((weekday) => (
          <div
            key={weekday}
            className="pb-1 text-center text-xs font-medium text-muted-foreground"
          >
            {weekday}
          </div>
        ))}
        {cells.map((cell) => (
          <div
            key={cell.day}
            style={
              cell.day === 1 ? { gridColumnStart: startOffset + 1 } : undefined
            }
            className={cn(
              "min-h-16 rounded-lg border p-1.5",
              cell.conflict
                ? "border-warning/60 bg-warning/10"
                : cell.requests.length > 0
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-background/50",
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs font-medium",
                  cell.conflict ? "text-warning" : "text-muted-foreground",
                )}
              >
                {cell.day}
              </span>
              {cell.conflict && (
                <AlertTriangle className="size-3 text-warning" />
              )}
            </div>
            <div className="mt-1 space-y-1">
              {cell.requests.slice(0, 2).map((request) => (
                <Link
                  key={request.id}
                  href={`/leave/${request.id}`}
                  title={`${request.employeeName ?? ""} — ${t(`statusLabels.leaveType.${request.type}` as TranslationKey)}`}
                  className="flex items-center gap-1 rounded bg-primary/15 px-1 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/25"
                >
                  {initials(request.employeeName)}
                </Link>
              ))}
              {cell.requests.length > 2 && (
                <p className="px-1 text-[10px] text-muted-foreground">
                  {t("leave.moreCount", { n: cell.requests.length - 2 })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
