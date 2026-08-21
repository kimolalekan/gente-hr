"use client";

import type * as React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function parseIso(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayTime(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

function formatDisplay(value: string): string {
  const date = parseIso(value);
  return date
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
}

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Earliest selectable date (YYYY-MM-DD). */
  min?: string;
  /** Latest selectable date (YYYY-MM-DD). */
  max?: string;
  "aria-label"?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Calendar date picker: month grid with prev/next navigation, today/selected
 * highlighting, min/max constraints, and arrow-key day navigation.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
  min,
  max,
  "aria-label": ariaLabel,
  id,
  className,
  disabled = false,
}: DatePickerProps) {
  const selected = parseIso(value);
  const [open, setOpen] = useState(false);

  const [view, setView] = useState(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [cursor, setCursor] = useState<Date>(selected ?? new Date());
  const gridRef = useRef<HTMLDivElement>(null);

  const minTime = useMemo(
    () => (min ? dayTime(parseIso(min) ?? new Date()) : undefined),
    [min],
  );
  const maxTime = useMemo(
    () => (max ? dayTime(parseIso(max) ?? new Date()) : undefined),
    [max],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        const base = parseIso(value) ?? new Date();
        setView(new Date(base.getFullYear(), base.getMonth(), 1));
        setCursor(base);
        // Move focus into the calendar grid (roving-tabindex pattern).
        window.setTimeout(() => gridRef.current?.focus(), 0);
      }
    },
    [value],
  );

  const year = view.getFullYear();
  const month = view.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first

  const isDisabled = useCallback(
    (day: Date): boolean => {
      const time = dayTime(day);
      if (minTime !== undefined && time < minTime) return true;
      if (maxTime !== undefined && time > maxTime) return true;
      return false;
    },
    [minTime, maxTime],
  );

  const selectDay = useCallback(
    (day: Date) => {
      if (isDisabled(day)) return;
      onChange(toIso(day));
      setOpen(false);
    },
    [isDisabled, onChange],
  );

  const shiftMonth = (delta: number) => {
    setView(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  };

  const onGridKeyDown = (event: React.KeyboardEvent) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setCursor((current) => {
        const lastDay = new Date(year, month + 1, 0).getDate();
        const day = Math.min(
          Math.max(current.getDate() + move[0] + move[1] * 7, 1),
          lastDay,
        );
        return new Date(year, month, day);
      });
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectDay(cursor);
    }
  };

  const monthLabel = view.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const today = new Date();

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      aria-haspopup="dialog"
      contentClassName="w-[19rem]"
      trigger={
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? formatDisplay(value) : placeholder}
          </span>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        </button>
      }
    >
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="text-sm font-semibold">{monthLabel}</p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div
          ref={gridRef}
          role="grid"
          aria-label="Calendar"
          tabIndex={0}
          onKeyDown={onGridKeyDown}
          className="grid grid-cols-7 gap-1 outline-none"
        >
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="pb-1 text-center text-[10px] font-medium uppercase text-muted-foreground"
            >
              {weekday}
            </div>
          ))}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const date = new Date(year, month, day);
            const isSelected = selected !== null && isSameDay(date, selected);
            const isToday = isSameDay(date, today);
            const isCursor = isSameDay(date, cursor);
            const disabledDay = isDisabled(date);
            return (
              <button
                key={day}
                type="button"
                disabled={disabledDay}
                onClick={() => selectDay(date)}
                style={
                  day === 1 ? { gridColumnStart: startOffset + 1 } : undefined
                }
                aria-label={date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
                aria-pressed={isSelected}
                className={cn(
                  "flex h-8 w-full items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground"
                    : isToday
                      ? "font-semibold text-primary"
                      : "text-popover-foreground hover:bg-muted",
                  isCursor && !isSelected && "ring-2 ring-ring",
                  disabledDay &&
                    "cursor-not-allowed opacity-40 hover:bg-transparent",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </Popover>
  );
}
