"use client";

import { useEffect, useState } from "react";
import { getClientLocale } from "./locales";

/**
 * Locale of the currently rendered document (from `<html lang>`), resolved
 * after mount so the server-rendered HTML and the client stay consistent.
 * Defaults to en-US.
 */
export function useLocale(): string {
  const [locale, setLocale] = useState("en-US");
  useEffect(() => {
    setLocale(getClientLocale());
  }, []);
  return locale;
}
