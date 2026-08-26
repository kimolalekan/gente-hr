/**
 * Locale-aware date/time formatters (native Intl — all supported languages
 * are covered without extra dependencies). Accepts either an app language
 * code ("fr") or a BCP-47 locale ("fr-FR"); defaults to en-US.
 */
import { normalizeLocale } from "./locales";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

const WEEKDAY_SHORT_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
};

const WEEKDAY_LONG_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
};

const MONTH_YEAR_FORMAT: Intl.DateTimeFormatOptions = {
  month: "long",
  year: "numeric",
};

/** "Aug 26, 2026" — locale-aware (e.g. "26 août 2026" in French). */
export function formatDate(iso: string, locale = "en-US"): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(
    normalizeLocale(locale),
    DATE_FORMAT,
  );
}

/** "Aug 26, 2026, 2:00 PM" — locale-aware date + time. */
export function formatDateTime(
  value: string | Date,
  locale = "en-US",
): string {
  return new Date(value).toLocaleString(normalizeLocale(locale), DATE_TIME_FORMAT);
}

/** "2:00 PM" (or "14:00") — locale-aware time. */
export function formatTime(value: string | Date, locale = "en-US"): string {
  return new Date(value).toLocaleTimeString(normalizeLocale(locale), TIME_FORMAT);
}

/** Short weekday for a YYYY-MM-DD string, e.g. "Mon" / "lun." / "lun". */
export function formatWeekdayShort(
  dateStr: string,
  locale = "en-US",
): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(
    normalizeLocale(locale),
    WEEKDAY_SHORT_FORMAT,
  );
}

/** Long weekday for a Date, e.g. "Monday" / "lundi". */
export function formatWeekdayLong(date: Date, locale = "en-US"): string {
  return date.toLocaleDateString(normalizeLocale(locale), WEEKDAY_LONG_FORMAT);
}

/** "August 2026" — locale-aware month + year (calendar headers). */
export function formatMonthYear(date: Date, locale = "en-US"): string {
  return date.toLocaleDateString(normalizeLocale(locale), MONTH_YEAR_FORMAT);
}

/** Locale-aware number, e.g. "1,234" vs "1 234". */
export function formatShortNumber(value: number, locale = "en-US"): string {
  return value.toLocaleString(normalizeLocale(locale));
}
