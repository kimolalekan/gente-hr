"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createTranslator, type Translator } from "./core";
import type { Dictionary } from "./types";
import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import pt from "./pt.json";

/** Bundled dictionaries so the UI language can switch instantly on the client
 * (e.g. the setup wizard's language dropdown) without a server round trip. */
const CLIENT_DICTIONARIES: Record<string, Dictionary> = { en, es, fr, pt };

interface TranslationsValue {
  t: Translator;
  language: string;
  /** Switch the UI language immediately (client-side). */
  setLanguage: (language: string) => void;
}

const TranslationsContext = createContext<TranslationsValue | null>(null);

/**
 * Provides the active language's dictionary to the whole tree. The root
 * layout (server) passes the dictionary rendered for the tenant language;
 * `setLanguage` additionally allows an instant client-side override (used by
 * the setup wizard while provisioning a new workspace).
 */
export function TranslationsProvider({
  language,
  dictionary,
  children,
}: {
  language: string;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  // Client-side override, initialised from the server-rendered language and
  // re-synced whenever the server renders a new one (e.g. after the tenant
  // language is saved and the route is refreshed).
  const [activeLanguage, setActiveLanguage] = useState(language);
  useEffect(() => {
    setActiveLanguage(language);
  }, [language]);

  const value = useMemo<TranslationsValue>(
    () => ({
      t: createTranslator(CLIENT_DICTIONARIES[activeLanguage] ?? dictionary),
      language: activeLanguage,
      setLanguage: setActiveLanguage,
    }),
    [activeLanguage, dictionary],
  );
  return (
    <TranslationsContext.Provider value={value}>
      {children}
    </TranslationsContext.Provider>
  );
}

/** `t("key.path", { param })` — client-side translations. */
export function useTranslations(): TranslationsValue {
  const ctx = useContext(TranslationsContext);
  if (!ctx)
    throw new Error(
      "useTranslations must be used within <TranslationsProvider>",
    );
  return ctx;
}
