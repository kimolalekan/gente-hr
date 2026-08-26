/**
 * Server-side dictionary loader. This module must only be imported by server
 * code — the client receives the active dictionary via the provider context
 * instead of bundling every locale.
 */
import "server-only";
import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import pt from "./pt.json";
import type { Dictionary } from "./types";

const DICTIONARIES: Record<string, Dictionary> = {
  en: en as Dictionary,
  es: es as Dictionary,
  fr: fr as Dictionary,
  pt: pt as Dictionary,
};

/** The dictionary for an app language code (defaults to English). */
export function getDictionary(language?: string | null): Dictionary {
  return (language && DICTIONARIES[language]) || DICTIONARIES.en;
}
