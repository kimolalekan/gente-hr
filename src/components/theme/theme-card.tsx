"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import type { PredefinedTheme, ThemeVar } from "@/lib/themes";

const SWATCH_KEYS: ThemeVar[] = [
  "primary",
  "primary-background",
  "primary-foreground",
  "accent",
  "ring",
  "destructive",
  "success",
  "warning",
  "info",
  "background",
  "foreground",
  "muted",
  "muted-foreground",
  "border",
];

export function ThemeCard({
  theme,
  selected,
  onSelect,
  onApply,
}: {
  theme: PredefinedTheme;
  selected: boolean;
  onSelect: () => void;
  onApply: () => void;
}) {
  const { t } = useTranslations();
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md",
        selected ? "border-primary ring-2 ring-ring" : "border-border",
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="w-full cursor-pointer rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              {theme.name}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {t(`theme.descriptions.${theme.id}` as TranslationKey)}
            </p>
          </div>
          {selected && (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-3" />
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {SWATCH_KEYS.map((key) => (
            <span
              key={key}
              title={key}
              className="size-4 rounded border border-black/10"
              style={{ backgroundColor: theme.palette.light[key] }}
            />
          ))}
        </div>
      </button>

      <Button
        size="sm"
        variant={selected ? "default" : "outline"}
        className="mt-3 w-full"
        onClick={onApply}
      >
        {t("theme.applyTheme")}
      </Button>
    </div>
  );
}

export function CustomThemeCard({
  selected,
  onSelect,
}: {
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslations();
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-dashed bg-card p-4 shadow-sm transition-all hover:shadow-md",
        selected ? "border-primary ring-2 ring-ring" : "border-border",
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="w-full cursor-pointer rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              {t("settings.branding.customTheme")}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {t("settings.branding.customThemeCardHint")}
            </p>
          </div>
          {selected && (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-3" />
            </span>
          )}
        </div>

        <div
          className="mt-3 h-8 rounded-md border border-black/10"
          style={{
            background:
              "conic-gradient(from 90deg, var(--primary), var(--accent), var(--info), var(--success), var(--warning), var(--destructive), var(--primary))",
          }}
        />
      </button>

      <Button
        size="sm"
        variant={selected ? "default" : "outline"}
        className="mt-3 w-full"
        onClick={onSelect}
      >
        {t("settings.branding.customizeTheme")}
      </Button>
    </div>
  );
}
