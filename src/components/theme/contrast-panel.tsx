"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { useTranslations } from "@/lib/i18n/provider";
import { evaluatePairs, formatRatio } from "@/lib/contrast";
import { cn } from "@/lib/utils";
import type { ThemePalette } from "@/lib/theme-config";

/**
 * WCAG 2.1 automated contrast check for the current palette. Pairs that fall
 * below 4.5:1 (AA for normal text) are flagged with a warning.
 */
export function ContrastPanel({ palette }: { palette: ThemePalette }) {
  const { t } = useTranslations();
  const pairs = evaluatePairs(palette);

  return (
    <div className="space-y-2">
      {pairs.map((pair) => {
        const status = pair.status;
        const failing = status && !status.pass;
        return (
          <div
            key={pair.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm"
          >
            <span className="min-w-0 truncate text-muted-foreground">
              {pair.label}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {pair.ratio === null ? "—" : formatRatio(pair.ratio)}
              </span>
              {status && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    failing
                      ? "bg-destructive/10 text-destructive"
                      : "bg-success/10 text-success",
                  )}
                >
                  {failing
                    ? t("theme.contrastBelowAA")
                    : status.label === "AAA"
                      ? "AAA"
                      : "AA"}
                </span>
              )}
            </span>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        {t("theme.contrastExplanation")}
      </p>
    </div>
  );
}

/** Current mode label helper for the preview header. */
export function usePreviewModeLabel(): string {
  const { effectiveMode, userMode, tenantMode } = useTheme();
  const { t } = useTranslations();
  if (userMode === "light" || userMode === "dark")
    return t("theme.modeLabel", { mode: userMode });
  if (tenantMode === "light" || tenantMode === "dark")
    return t("theme.modeCompanyDefault", { mode: tenantMode });
  return t("theme.modeSystemLabel", { mode: effectiveMode });
}
