/**
 * Language ↔ locale mapping for the supported app languages.
 * The tenant language (`tenants.settings.language`) is one of these codes.
 */
export const LANGUAGE_LOCALES: Record<string, string> = {
  en: "en-US",
  fr: "fr",
  es: "es",
  pt: "pt-BR",
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_LOCALES);

/** Map an app language code to a BCP-47 locale (defaults to en-US). */
export function resolveLocale(language?: string | null): string {
  return (language && LANGUAGE_LOCALES[language]) || LANGUAGE_LOCALES.en;
}

/**
 * Normalize a formatter locale argument: app language codes ("fr") map to
 * their BCP-47 locale; anything else (already a locale like "fr-FR") passes
 * through unchanged.
 */
export function normalizeLocale(locale: string): string {
  return LANGUAGE_LOCALES[locale] ?? locale;
}

/** Locale of the currently rendered document (client-side), or en-US. */
export function getClientLocale(): string {
  if (typeof document !== "undefined" && document.documentElement?.lang) {
    return normalizeLocale(document.documentElement.lang);
  }
  return LANGUAGE_LOCALES.en;
}
