"use client";

import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ContrastPanel } from "@/components/theme/contrast-panel";
import { ColorField } from "@/components/theme/color-field";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import {
  THEME_VARS,
  type ThemePalette,
  type ThemeVar,
} from "@/lib/theme-config";

export function CustomThemeEditor({
  enabled,
  colors,
  palette,
  onToggle,
  onChangeColor,
  onSave,
  onCancel,
  onExport,
  onImport,
  canSave,
}: {
  enabled: boolean;
  colors: Partial<Record<ThemeVar, string>>;
  /** Resolved palette for the contrast check (uses the active color mode). */
  palette: ThemePalette;
  onToggle: (enabled: boolean) => void;
  onChangeColor: (variable: ThemeVar, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onExport: () => void;
  onImport: () => void;
  canSave: boolean;
}) {
  const { t } = useTranslations();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/50 p-4">
        <div>
          <p className="text-sm font-medium">
            {t("settings.branding.enableCustomTheme")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("settings.branding.customThemeEnableHint")}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label={t("settings.branding.enableCustomTheme")}
        />
      </div>

      {enabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {THEME_VARS.map((variable) => (
              <ColorField
                key={variable}
                variable={variable}
                label={t(`theme.varLabels.${variable}` as TranslationKey)}
                value={colors[variable] ?? ""}
                onChange={(value) => onChangeColor(variable, value)}
              />
            ))}
          </div>

          <div className="rounded-lg border border-border bg-background/50 p-4">
            <h3 className="mb-3 text-sm font-medium">
              {t("settings.branding.contrastCheck")}
            </h3>
            <ContrastPanel palette={palette} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onSave} disabled={!canSave}>
              {t("settings.branding.saveChanges")}
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download />
              {t("settings.branding.exportJson")}
            </Button>
            <Button variant="outline" size="sm" onClick={onImport}>
              <Upload />
              {t("settings.branding.importJson")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
