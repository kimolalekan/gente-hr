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
        .select({ settings: tenants.settings })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      const language = row?.settings?.language;
      return typeof language === "string" &&
        SUPPORTED_LANGUAGES.includes(language)
        ? language
        : "en";
    } finally {
      await pool.end();
    }
  } catch {
    return "en";
  }
}

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
