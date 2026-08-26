/**
 * Pure translation core — no JSON imports, safe on both server and client.
 * The active dictionary is passed in (server renders it from the tenant
 * language; the client provider receives it via context).
 */
import type { Dictionary, TranslationKey } from "./types";

function lookup(dictionary: Dictionary, path: string): unknown {
  let current: unknown = dictionary;
  for (const part of path.split(".")) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/** Replace `{name}` tokens in a translated string with the given params. */
export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Translate a key against a dictionary. The dictionaries are structurally
 * validated against en.json, so a missing key returns the key path itself.
 */
export function translate(
  dictionary: Dictionary,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const value = lookup(dictionary, key);
  return typeof value === "string" ? interpolate(value, params) : key;
}

/** A bound translator for one dictionary. */
export type Translator = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

export function createTranslator(dictionary: Dictionary): Translator {
  return (key, params) => translate(dictionary, key, params);
}
