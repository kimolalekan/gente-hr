import { CURRENCIES, type CurrencyEntry } from "./currency-data";

export interface CurrencyOption {
  /** ISO 4217 code (select value). */
  value: string;
  /** Display label, e.g. "USD — US Dollar". */
  label: string;
  /** Extra search terms (currency name + countries that use it). */
  search: string;
}

const OPTIONS: CurrencyOption[] = CURRENCIES.map((entry) => ({
  value: entry.code,
  label: `${entry.code} — ${entry.name}`,
  search: `${entry.code} ${entry.name} ${entry.countries.join(" ")}`,
}));

const BY_CODE = new Map<string, CurrencyEntry>(
  CURRENCIES.map((entry) => [entry.code, entry]),
);

/** All currencies (ISO 4217) as select options, searchable by name/country. */
export const CURRENCY_OPTIONS: CurrencyOption[] = OPTIONS;

/** Every country/territory in the currency dataset, sorted (for selects). */
export const COUNTRIES: string[] = Array.from(
  new Set(CURRENCIES.flatMap((entry) => entry.countries)),
).sort();

/** Currency metadata for a code (flag + name), or null. */
export function getCurrencyMeta(code: string): CurrencyEntry | null {
  return BY_CODE.get(code) ?? null;
}
