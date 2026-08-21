/**
 * Theme data model — the 8 predefined company themes from the branding spec.
 * Every variable has a light and a dark value so the palette flips correctly
 * with the active color mode.
 */

export const THEME_VARS = [
  "primary",
  "primary-background",
  "primary-foreground",
  "accent",
  "background",
  "foreground",
  "muted",
  "muted-foreground",
  "border",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "ring",
  "destructive",
  "success",
  "warning",
  "info",
] as const;

export type ThemeVar = (typeof THEME_VARS)[number];

/** A full set of CSS custom-property values for one color mode. */
export type ThemePalette = Record<ThemeVar, string>;

export type ThemePaletteMap = { light: ThemePalette; dark: ThemePalette };

export type ThemeId =
  | "default"
  | "emerald"
  | "purple"
  | "crimson"
  | "amber"
  | "mint"
  | "ocean"
  | "rose"
  | "custom";

export interface PredefinedTheme {
  id: Exclude<ThemeId, "custom">;
  name: string;
  description: string;
  palette: ThemePaletteMap;
}

export const THEME_VAR_LABELS: Record<ThemeVar, string> = {
  primary: "Primary color",
  "primary-background": "Primary background",
  "primary-foreground": "Primary foreground",
  accent: "Accent color",
  background: "Background",
  foreground: "Foreground",
  muted: "Muted background",
  "muted-foreground": "Muted foreground",
  border: "Border",
  card: "Card background",
  "card-foreground": "Card foreground",
  popover: "Popover background",
  "popover-foreground": "Popover foreground",
  ring: "Ring (focus)",
  destructive: "Destructive",
  success: "Success",
  warning: "Warning",
  info: "Info",
};

/** Neutral surface colors shared by every theme. */
const NEUTRALS_LIGHT: Pick<
  ThemePalette,
  | "background"
  | "foreground"
  | "muted"
  | "muted-foreground"
  | "border"
  | "card"
  | "card-foreground"
  | "popover"
  | "popover-foreground"
> = {
  background: "#FFFFFF",
  foreground: "#1E293B",
  muted: "#F1F5F9",
  "muted-foreground": "#64748B",
  border: "#E2E8F0",
  card: "#FFFFFF",
  "card-foreground": "#1E293B",
  popover: "#FFFFFF",
  "popover-foreground": "#1E293B",
};

const NEUTRALS_DARK: typeof NEUTRALS_LIGHT = {
  background: "#0F172A",
  foreground: "#F1F5F9",
  muted: "#1E293B",
  "muted-foreground": "#94A3B8",
  border: "#334155",
  card: "#1E293B",
  "card-foreground": "#F1F5F9",
  popover: "#1E293B",
  "popover-foreground": "#F1F5F9",
};

/** Semantic status colors — identical across every theme unless overridden. */
const SEMANTIC_LIGHT: Pick<ThemePalette, "success" | "warning" | "info"> = {
  success: "#22C55E",
  warning: "#F59E0B",
  info: "#06B6D4",
};

const SEMANTIC_DARK = SEMANTIC_LIGHT;

export const PREDEFINED_THEMES: PredefinedTheme[] = [
  {
    id: "default",
    name: "Default Blue",
    description: "Professional & trustworthy — the classic Gente look.",
    palette: {
      light: {
        primary: "#2563EB",
        "primary-background": "#EFF6FF",
        "primary-foreground": "#FFFFFF",
        accent: "#3B82F6",
        ring: "#3B82F6",
        destructive: "#EF4444",
        ...NEUTRALS_LIGHT,
        ...SEMANTIC_LIGHT,
      },
      dark: {
        primary: "#3B82F6",
        "primary-background": "#1E293B",
        "primary-foreground": "#FFFFFF",
        accent: "#60A5FA",
        ring: "#3B82F6",
        destructive: "#EF4444",
        ...NEUTRALS_DARK,
        ...SEMANTIC_DARK,
      },
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Corporate & finance — trustworthy greens.",
    palette: {
      light: {
        primary: "#059669",
        "primary-background": "#ECFDF5",
        "primary-foreground": "#FFFFFF",
        accent: "#10B981",
        ring: "#10B981",
        destructive: "#EF4444",
        ...NEUTRALS_LIGHT,
        ...SEMANTIC_LIGHT,
      },
      dark: {
        primary: "#10B981",
        "primary-background": "#064E3B",
        "primary-foreground": "#FFFFFF",
        accent: "#34D399",
        ring: "#10B981",
        destructive: "#EF4444",
        ...NEUTRALS_DARK,
        ...SEMANTIC_DARK,
      },
    },
  },
  {
    id: "purple",
    name: "Royal Purple",
    description: "Creative & consulting — bold and distinctive.",
    palette: {
      light: {
        primary: "#7C3AED",
        "primary-background": "#F5F3FF",
        "primary-foreground": "#FFFFFF",
        accent: "#8B5CF6",
        ring: "#8B5CF6",
        destructive: "#EF4444",
        ...NEUTRALS_LIGHT,
        ...SEMANTIC_LIGHT,
      },
      dark: {
        primary: "#8B5CF6",
        "primary-background": "#2E1065",
        "primary-foreground": "#FFFFFF",
        accent: "#A78BFA",
        ring: "#8B5CF6",
        destructive: "#EF4444",
        ...NEUTRALS_DARK,
        ...SEMANTIC_DARK,
      },
    },
  },
  {
    id: "crimson",
    name: "Crimson",
    description: "Passionate & retail — energetic reds.",
    palette: {
      light: {
        primary: "#DC2626",
        "primary-background": "#FEF2F2",
        "primary-foreground": "#FFFFFF",
        accent: "#EF4444",
        ring: "#EF4444",
        destructive: "#DC2626",
        ...NEUTRALS_LIGHT,
        ...SEMANTIC_LIGHT,
      },
      dark: {
        primary: "#EF4444",
        "primary-background": "#450A0A",
        "primary-foreground": "#FFFFFF",
        accent: "#F87171",
        ring: "#EF4444",
        destructive: "#EF4444",
        ...NEUTRALS_DARK,
        ...SEMANTIC_DARK,
      },
    },
  },
  {
    id: "amber",
    name: "Amber",
    description: "Startup & energy — warm and optimistic.",
    palette: {
      light: {
        primary: "#D97706",
        "primary-background": "#FFFBEB",
        "primary-foreground": "#FFFFFF",
        accent: "#F59E0B",
        ring: "#F59E0B",
        destructive: "#EF4444",
        ...NEUTRALS_LIGHT,
        ...SEMANTIC_LIGHT,
        warning: "#D97706",
      },
      dark: {
        primary: "#F59E0B",
        "primary-background": "#451A03",
        "primary-foreground": "#000000",
        accent: "#FBBF24",
        ring: "#F59E0B",
        destructive: "#EF4444",
        ...NEUTRALS_DARK,
        ...SEMANTIC_DARK,
      },
    },
  },
  {
    id: "mint",
    name: "Mint",
    description: "Health & wellness — calm and refreshing.",
    palette: {
      light: {
        primary: "#0D9488",
        "primary-background": "#F0FDFA",
        "primary-foreground": "#FFFFFF",
        accent: "#14B8A6",
        ring: "#14B8A6",
        destructive: "#EF4444",
        ...NEUTRALS_LIGHT,
        ...SEMANTIC_LIGHT,
      },
      dark: {
        primary: "#14B8A6",
        "primary-background": "#042F2E",
        "primary-foreground": "#FFFFFF",
        accent: "#2DD4BF",
        ring: "#14B8A6",
        destructive: "#EF4444",
        ...NEUTRALS_DARK,
        ...SEMANTIC_DARK,
      },
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Tech & IT — cool, focused blues.",
    palette: {
      light: {
        primary: "#0284C7",
        "primary-background": "#F0F9FF",
        "primary-foreground": "#FFFFFF",
        accent: "#0EA5E9",
        ring: "#0EA5E9",
        destructive: "#EF4444",
        ...NEUTRALS_LIGHT,
        ...SEMANTIC_LIGHT,
      },
      dark: {
        primary: "#0EA5E9",
        "primary-background": "#0C4A6E",
        "primary-foreground": "#FFFFFF",
        accent: "#38BDF8",
        ring: "#0EA5E9",
        destructive: "#EF4444",
        ...NEUTRALS_DARK,
        ...SEMANTIC_DARK,
      },
    },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Fashion & lifestyle — modern and vibrant.",
    palette: {
      light: {
        primary: "#E11D48",
        "primary-background": "#FFF1F2",
        "primary-foreground": "#FFFFFF",
        accent: "#F43F5E",
        ring: "#F43F5E",
        destructive: "#E11D48",
        ...NEUTRALS_LIGHT,
        ...SEMANTIC_LIGHT,
      },
      dark: {
        primary: "#F43F5E",
        "primary-background": "#4C0519",
        "primary-foreground": "#FFFFFF",
        accent: "#FB7185",
        ring: "#F43F5E",
        destructive: "#F43F5E",
        ...NEUTRALS_DARK,
        ...SEMANTIC_DARK,
      },
    },
  },
];

export const DEFAULT_PALETTE = PREDEFINED_THEMES[0].palette;

export function getPredefinedTheme(id: string): PredefinedTheme | undefined {
  return PREDEFINED_THEMES.find((theme) => theme.id === id);
}
