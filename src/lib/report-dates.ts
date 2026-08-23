/**
 * Date-range helpers for reports. All values are local-time `YYYY-MM-DD`
 * strings (matching the app's date convention). Shared by the report API
 * routes (default/validation) and the report pages' date-range picker.
 */

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toIso(new Date());
}

/** Add a signed number of days to a `YYYY-MM-DD` date (local time). */
export function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return toIso(new Date(year, month - 1, day + days));
}

/** Default report period — the last 7 days, inclusive. */
export function defaultRange(): { from: string; to: string } {
  const to = todayIso();
  return { from: addDaysIso(to, -6), to };
}

/**
 * Parse & validate `from`/`to` query values. Invalid or missing values fall
 * back to the last 7 days; an inverted range is swapped so `from <= to`.
 */
export function parseRange(
  from?: string | null,
  to?: string | null,
): { from: string; to: string } {
  const valid = (value?: string | null): value is string =>
    typeof value === "string" && ISO_RE.test(value);
  const fallback = defaultRange();
  const f = valid(from) ? from : fallback.from;
  const t = valid(to) ? to : fallback.to;
  return f <= t ? { from: f, to: t } : { from: t, to: f };
}
