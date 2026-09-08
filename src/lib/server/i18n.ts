/**
 * Server helpers for the current tenant's language/locale. The language is
 * stored in `tenants.settings.language` (see `/api/settings/company`).
 */
import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getTenantId } from "./auth";
import { createTranslator, type Translator } from "@/lib/i18n/core";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { resolveLocale, SUPPORTED_LANGUAGES } from "@/lib/i18n/locales";

/** Tenant language code (en | fr | pt | es), defaulting to "en". */
export async function getTenantLanguage(): Promise<string> {
  return (await getTenantPrefs()).language;
}

/** Tenant's ISO 4217 currency code, e.g. "USD" (from `tenants.currency`). */
export async function getTenantCurrency(): Promise<string> {
  return (await getTenantPrefs()).currency;
}

/**
 * Read the tenant columns that drive localized rendering (language + currency)
 * in one query, memoized per request via React `cache`.
 */
const getTenantPrefs = cache(
  async (): Promise<{
    language: string;
    currency: string;
  }> => {
    try {
      const { drizzle } = await import("drizzle-orm/node-postgres");
      const { Pool } = await import("pg");
      const { tenants } = await import("@db/schema");
      const tenantId = await getTenantId();
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
      });
      try {
        const db = drizzle(pool);
        const [row] = await db
          .select({ settings: tenants.settings, currency: tenants.currency })
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);
        const language =
          typeof row?.settings?.language === "string" &&
          SUPPORTED_LANGUAGES.includes(row.settings.language)
            ? row.settings.language
            : "en";
        const currency =
          typeof row?.currency === "string" && row.currency.trim()
            ? row.currency.trim()
            : "USD";
        return { language, currency };
      } finally {
        await pool.end();
      }
    } catch {
      return { language: "en", currency: "USD" };
    }
  },
);

/** Tenant locale (BCP-47), e.g. "fr" / "pt-BR". */
export async function getTenantLocale(): Promise<string> {
  return resolveLocale(await getTenantLanguage());
}

/**
 * Translator bound to the current tenant's language. Memoized per request
 * (React `cache`) so pages can call `const t = await getTranslator()` once.
 */
export const getTranslator = cache(async (): Promise<Translator> => {
  const language = await getTenantLanguage();
  return createTranslator(getDictionary(language));
});
