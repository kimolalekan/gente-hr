/**
 * Theme configuration — types, validation, palette resolution and the DOM
 * application logic shared by the inline bootstrap script (no React) and the
 * client-side ThemeProvider. Everything here is side-effect free except
 * `applyThemeToDocument`, which is guarded to run only in the browser.
 */
import {
  getPredefinedTheme,
  PREDEFINED_THEMES,
  THEME_VARS,
  type ThemeId,
  type ThemePalette,
  type ThemePaletteMap,
  type ThemeVar,
} from "./themes";

export {
  PREDEFINED_THEMES,
  THEME_VARS,
  THEME_VAR_LABELS,
  getPredefinedTheme,
  type PredefinedTheme,
  type ThemeId,
  type ThemePalette,
  type ThemePaletteMap,
  type ThemeVar,
} from "./themes";

export type ThemeMode = "light" | "dark" | "system";

/**
 * The tenant's persisted theme configuration (stored in `tenants.theme_config`).
 * `mode` is the company-wide default color mode; users can override it with
 * their own preference. `custom` colors apply to BOTH light and dark mode.
 */
export interface TenantTheme {
  themeId: ThemeId;
  /** Tenant-wide default mode — users can still override per-account. */
  mode?: ThemeMode;
  /** Hex colors for a custom theme (applied to both light & dark mode). */
  custom?: Partial<Record<ThemeVar, string>>;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  updatedAt?: string;
}

export const DEFAULT_TENANT_THEME: TenantTheme = {
  themeId: "default",
  mode: "system",
};

export const STORAGE_KEYS = {
  /** Last applied theme, cached for instant restore on the next visit. */
  themeCache: "gente:theme-cache",
} as const;

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function isThemeId(value: unknown): value is ThemeId {
  return (
    PREDEFINED_THEMES.some((theme) => theme.id === value) || value === "custom"
  );
}

export function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

/** Normalize "#fff"/"#FFFFFF" → "#ffffff" (6-digit lowercase). Returns null if invalid. */
export function normalizeHex(value: string): string | null {
  const hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex
      .split("")
      .map((c) => c + c)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return `#${hex.toLowerCase()}`;
  }
  return null;
}

/**
 * Resolve the full light/dark palette for a tenant theme. Custom themes merge
 * the user's hex values over the default palette and apply to both modes.
 */
export function resolvePalette(theme: TenantTheme): ThemePaletteMap {
  const base =
    getPredefinedTheme(theme.themeId)?.palette ?? PREDEFINED_THEMES[0].palette;
  if (theme.themeId !== "custom") return base;

  const light: ThemePalette = { ...base.light };
  const dark: ThemePalette = { ...base.dark };
  for (const key of THEME_VARS) {
    const raw = theme.custom?.[key];
    const normalized = raw ? normalizeHex(raw) : null;
    if (normalized) {
      light[key] = normalized;
      dark[key] = normalized;
    }
  }
  return { light, dark };
}

/**
 * Mode precedence: explicit user preference → tenant default mode → OS setting.
 * (User preference takes precedence over system, per the spec.)
 */
export function resolveEffectiveMode(
  userMode: ThemeMode,
  tenantMode: ThemeMode,
  systemDark: boolean,
): "light" | "dark" {
  if (userMode === "light" || userMode === "dark") return userMode;
  if (tenantMode === "light" || tenantMode === "dark") return tenantMode;
  return systemDark ? "dark" : "light";
}

/**
 * Validate + sanitize an untrusted theme payload (from the API). Drops unknown
 * variables, normalizes hex colors, and clamps URL fields.
 */
export function sanitizeThemeConfig(input: unknown): TenantTheme {
  const raw = (input ?? {}) as Record<string, unknown>;

  const themeId: ThemeId = isThemeId(raw.themeId) ? raw.themeId : "default";
  const mode: ThemeMode = isThemeMode(raw.mode) ? raw.mode : "system";

  const custom: Partial<Record<ThemeVar, string>> = {};
  if (raw.custom && typeof raw.custom === "object") {
    for (const key of THEME_VARS) {
      const value = (raw.custom as Record<string, unknown>)[key];
      if (typeof value === "string") {
        const normalized = normalizeHex(value);
        if (normalized) custom[key] = normalized;
      }
    }
  }

  const cleanUrl = (value: unknown): string | undefined => {
    if (typeof value !== "string" || value.length === 0) return undefined;
    // Keep data-URL logos under 1MB and cap URL length.
    if (value.length > 1_000_000) return undefined;
    return value;
  };

  return {
    themeId,
    mode,
    ...(Object.keys(custom).length > 0 ? { custom } : {}),
    logoUrl: cleanUrl(raw.logoUrl),
    faviconUrl: cleanUrl(raw.faviconUrl),
    updatedAt: new Date().toISOString(),
  };
}

export interface ApplyThemeOptions {
  /** Animate color transitions (skip during live preview keystrokes). */
  animate?: boolean;
}

/**
 * Apply a theme to the document: sets every CSS custom property on <html>,
 * toggles the `.dark` class, and records `data-theme` / `data-mode`.
 * `systemDark` is the OS/browser preference, resolved by the caller so that
 * preference changes re-trigger the applying effect.
 */
export function applyThemeToDocument(
  userMode: ThemeMode,
  theme: TenantTheme,
  systemDark: boolean,
  options: ApplyThemeOptions = {},
): void {
  if (typeof document === "undefined") return;

  const palette = resolvePalette(theme);
  const effective = resolveEffectiveMode(
    userMode,
    theme.mode ?? "system",
    systemDark,
  );
  const vars = palette[effective];

  const root = document.documentElement;
  for (const key of THEME_VARS) {
    root.style.setProperty(`--${key}`, vars[key]);
  }
  root.classList.toggle("dark", effective === "dark");
  root.setAttribute("data-theme", theme.themeId);
  root.setAttribute("data-mode", userMode);

  if (options.animate) {
    root.classList.add("theme-anim");
    window.setTimeout(() => root.classList.remove("theme-anim"), 300);
  }
}
