"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import type { ThemeMode } from "@/lib/theme-config";

const OPTIONS: Array<{
  value: ThemeMode;
  labelKey: TranslationKey;
  hintKey: TranslationKey;
  icon: typeof Sun;
}> = [
  {
    value: "system",
    labelKey: "common.modeSystem",
    hintKey: "settings.branding.modeSystemHint",
    icon: Monitor,
  },
  {
    value: "light",
    labelKey: "common.modeLight",
    hintKey: "settings.branding.modeLightHint",
    icon: Sun,
  },
  {
    value: "dark",
    labelKey: "common.modeDark",
    hintKey: "settings.branding.modeDarkHint",
    icon: Moon,
  },
];

/**
 * Company-wide default mode selector used on the branding settings page.
 * Sets the tenant's `theme_config.mode`; individual users override it from
 * their header toggle.
 */
export function ModeSelector({
  value,
  onChange,
}: {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}) {
  const { t } = useTranslations();
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
              active
                ? "border-primary bg-primary/5 ring-2 ring-ring"
                : "border-border bg-background/50 hover:border-primary/50",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md border",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {t(option.labelKey)}
                {active && <Check className="size-3.5 text-primary" />}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t(option.hintKey)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
