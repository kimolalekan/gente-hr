/**
 * Typed translation keys derived from the English dictionary, so `t("…")`
 * calls are checked at compile time against the JSON structure.
 */
import type en from "./en.json";

export type Dictionary = typeof en;

type DeepKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${DeepKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

/** Every leaf path in en.json, e.g. "common.save" | "leave.title" | … */
export type TranslationKey = DeepKeyOf<Dictionary>;
