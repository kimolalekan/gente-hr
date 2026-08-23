"use client";

import { usePathname, useRouter } from "next/navigation";
import { CalendarRange, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { defaultRange, todayIso } from "@/lib/report-dates";

/**
 * Shared date-range control. Writes `?from=…&to=…` back into the URL so the
 * server component re-renders with the new period. Pages default the range to
 * the last 7 days server-side (`parseRange`).
 */
export function DateRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const apply = (nextFrom: string, nextTo: string) => {
    const params = new URLSearchParams();
    params.set("from", nextFrom);
    params.set("to", nextTo);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const resetWeek = () => {
    const range = defaultRange();
    apply(range.from, range.to);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <CalendarRange className="size-4" />
        Date range
      </span>
      <DatePicker
        value={from}
        onChange={(value) => apply(value, to)}
        aria-label="From date"
        placeholder="From"
        max={to}
      />
      <span className="text-xs text-muted-foreground">to</span>
      <DatePicker
        value={to}
        onChange={(value) => apply(from, value)}
        aria-label="To date"
        placeholder="To"
        min={from}
        max={todayIso()}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={resetWeek}
        className="gap-1.5 text-muted-foreground"
      >
        <RotateCcw className="size-3.5" />
        Last 7 days
      </Button>
    </div>
  );
}
