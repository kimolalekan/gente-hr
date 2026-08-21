import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  getEmployee,
  LEAVE_REQUESTS,
  LEAVE_TYPE_LABELS,
  type LeaveRequest,
} from "@/lib/hr-data";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const YEAR = 2026;
const MONTH = 7; // August (0-indexed)

function initials(name: string | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Team leave calendar for the current month. Days with two or more
 * overlapping requests are flagged as conflicts.
 */
export function LeaveCalendar() {
  const firstDay = new Date(YEAR, MONTH, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(YEAR, MONTH + 1, 0).getDate();

  const leaveByDay = new Map<number, LeaveRequest[]>();
  for (const request of LEAVE_REQUESTS) {
    if (request.status === "declined" || request.status === "cancelled")
      continue;
    const start = new Date(`${request.start}T00:00:00`);
    const end = new Date(`${request.end}T00:00:00`);
    for (let day = start; day <= end; day.setDate(day.getDate() + 1)) {
      if (day.getFullYear() === YEAR && day.getMonth() === MONTH) {
        const list = leaveByDay.get(day.getDate()) ?? [];
        list.push(request);
        leaveByDay.set(day.getDate(), list);
      }
    }
  }

  const cells = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const requests = leaveByDay.get(day) ?? [];
    return { day, requests, conflict: requests.length > 1 };
  });

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary/20" /> Leave
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="size-3 text-warning" /> Conflict (overlap)
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((weekday) => (
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
              {cell.requests.slice(0, 2).map((request) => {
                const employee = getEmployee(request.employeeId);
                return (
                  <Link
                    key={request.id}
                    href={`/leave/${request.id}`}
                    title={`${employee?.name ?? ""} — ${LEAVE_TYPE_LABELS[request.type]}`}
                    className="flex items-center gap-1 rounded bg-primary/15 px-1 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/25"
                  >
                    {initials(employee?.name)}
                  </Link>
                );
              })}
              {cell.requests.length > 2 && (
                <p className="px-1 text-[10px] text-muted-foreground">
                  +{cell.requests.length - 2} more
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
