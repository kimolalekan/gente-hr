"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applyThemeToDocument,
  DEFAULT_TENANT_THEME,
  resolveEffectiveMode,
  STORAGE_KEYS,
  type TenantTheme,
  type ThemeMode,
} from "@/lib/theme-config";
import { patchTenantTheme, patchUserMode } from "@/lib/client/theme-api";

export interface ThemeContextValue {
  /** The signed-in user's own mode preference. */
  userMode: ThemeMode;
  /** The company-wide default mode from the tenant theme config. */
  tenantMode: ThemeMode;
  /** The committed (persisted) tenant theme. */
  theme: TenantTheme;
  themeId: TenantTheme["themeId"];
  effectiveMode: "light" | "dark";
  isDark: boolean;
  /** True while an unsaved draft preview is being applied. */
  isDrafting: boolean;
  /** Persist a user-level mode preference (optimistic, rolls back on failure). */
  setUserMode: (mode: ThemeMode) => Promise<boolean>;
  /** Preview an unsaved theme on the document (no persistence). */
  preview: (theme: TenantTheme | null) => void;
  /** Persist a tenant theme and apply it. */
  commit: (theme: TenantTheme) => Promise<boolean>;
  /** Reset the tenant theme to the default. */
  resetTheme: () => Promise<boolean>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

export function ThemeProvider({
  initialMode,
  initialTheme,
  children,
}: {
  initialMode: ThemeMode;
  initialTheme: TenantTheme;
  children: ReactNode;
}) {
  const [userMode, setUserModeState] = useState<ThemeMode>(initialMode);
  const [theme, setThemeState] = useState<TenantTheme>(initialTheme);
  const [previewTheme, setPreviewTheme] = useState<TenantTheme | null>(null);
  const [systemDark, setSystemDark] = useState(false);

  const userModeRef = useRef(userMode);
  const themeRef = useRef(theme);
  userModeRef.current = userMode;
  themeRef.current = theme;

  // Follow the server-rendered tenant: when the layout re-renders with a
  // different org (tenant switch), adopt its theme + default mode instead of
  // keeping the previous org's state.
  useEffect(() => {
    setUserModeState(initialMode);
    setThemeState(initialTheme);
    setPreviewTheme(null);
  }, [initialMode, initialTheme]);

  // Track the OS/browser color-scheme preference for "system" mode.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const appliedTheme = previewTheme ?? theme;

  // Apply CSS variables to the document whenever anything relevant changes.
  useEffect(() => {
    applyThemeToDocument(userMode, appliedTheme, systemDark, {
      animate: !previewTheme,
    });
  }, [userMode, appliedTheme, previewTheme, systemDark]);

  // Write-through localStorage cache for instant restore on the next visit.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.themeCache,
        JSON.stringify({ savedAt: Date.now(), mode: userMode, theme }),
      );
    } catch {
      // Private browsing / quota — cache is a best-effort optimization.
    }
  }, [userMode, theme]);

  const setUserMode = useCallback(async (next: ThemeMode): Promise<boolean> => {
    const previous = userModeRef.current;
    setUserModeState(next);
    try {
      await patchUserMode(next);
      return true;
    } catch (error) {
      setUserModeState(previous);
      console.error("[theme] failed to save user mode preference", error);
      return false;
    }
  }, []);

  const preview = useCallback((next: TenantTheme | null) => {
    setPreviewTheme(next);
  }, []);

  const commit = useCallback(async (next: TenantTheme): Promise<boolean> => {
    const previous = themeRef.current;
    setThemeState(next);
    setPreviewTheme(null);
    try {
      const saved = await patchTenantTheme(next);
      setThemeState(saved);
      return true;
    } catch (error) {
      setThemeState(previous);
      console.error("[theme] failed to save tenant theme", error);
      return false;
    }
  }, []);

  const resetTheme = useCallback(async () => {
    return commit({
      ...DEFAULT_TENANT_THEME,
      updatedAt: new Date().toISOString(),
    });
  }, [commit]);

  const tenantMode = theme.mode ?? "system";
  const effectiveMode = resolveEffectiveMode(userMode, tenantMode, systemDark);
  const isDark = effectiveMode === "dark";

  const value = useMemo<ThemeContextValue>(
    () => ({
      userMode,
      tenantMode,
      theme,
      themeId: theme.themeId,
      effectiveMode,
      isDark,
      isDrafting: previewTheme !== null,
      setUserMode,
      preview,
      commit,
      resetTheme,
    }),
    [
      userMode,
      tenantMode,
      theme,
      effectiveMode,
      isDark,
      previewTheme,
      setUserMode,
      preview,
      commit,
      resetTheme,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
