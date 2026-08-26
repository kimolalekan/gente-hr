"use client";

import { usePathname, useRouter } from "next/navigation";
import { CalendarRange, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { useTranslations } from "@/lib/i18n/provider";
import { defaultRange, todayIso } from "@/lib/report-dates";

/**
 * Shared date-range control. Writes `?from=…&to=…` back into the URL so the
 * server component re-renders with the new period. Pages default the range to
 * the last 7 days server-side (`parseRange`).
 */
export function DateRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslations();

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
        {t("common.dateRange")}
      </span>
      <DatePicker
        value={from}
        onChange={(value) => apply(value, to)}
        aria-label={t("common.fromDate")}
        placeholder={t("common.from")}
        max={to}
      />
      <span className="text-xs text-muted-foreground">
        {t("common.toSeparator")}
      </span>
      <DatePicker
        value={to}
        onChange={(value) => apply(from, value)}
        aria-label={t("common.toDate")}
        placeholder={t("common.to")}
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
        {t("common.last7Days")}
      </Button>
    </div>
  );
}
