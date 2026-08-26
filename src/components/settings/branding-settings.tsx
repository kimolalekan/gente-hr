"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, RotateCcw, Save, XCircle } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { useTranslations } from "@/lib/i18n/provider";
import { PreviewPanel } from "@/components/theme/preview-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  resolvePalette,
  sanitizeThemeConfig,
  THEME_VARS,
  type TenantTheme,
  type ThemeId,
  type ThemeMode,
  type ThemeVar,
} from "@/lib/theme-config";
import { ModeSelector } from "./mode-selector";
import { ThemePicker } from "./theme-picker";
import { CustomThemeEditor } from "./custom-theme-editor";
import { LogoUploader } from "./logo-uploader";
import { Section } from "./section";

interface ToastState {
  kind: "success" | "error";
  message: string;
}

/**
 * Branding & Theme settings (admin). Everything edits a local draft with an
 * instant live preview; changes are persisted via the ThemeProvider:
 * - Mode selector + predefined-theme "Apply" commit immediately.
 * - Custom palette + logo edits are saved with the sticky "Save changes" bar
 *   (or the custom editor's own Save button).
 */
export function BrandingSettings() {
  const { theme, effectiveMode, isDrafting, preview, commit, resetTheme } =
    useTheme();
  const { t } = useTranslations();
  const [draft, setDraft] = useState<TenantTheme>(theme);
  const [customEnabled, setCustomEnabled] = useState(
    theme.themeId === "custom",
  );
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | null>(null);
  const lastNonCustom = useRef<Exclude<ThemeId, "custom">>("default");

  // Keep the draft in sync with the committed theme (after saves/resets).
  useEffect(() => {
    setDraft(theme);
    setCustomEnabled(theme.themeId === "custom");
  }, [theme]);

  // Live preview of unsaved draft changes; revert to the committed theme on unmount.
  useEffect(() => {
    const dirty = JSON.stringify(draft) !== JSON.stringify(theme);
    if (dirty) preview(draft);
    else preview(null);
    return () => preview(null);
  }, [draft, theme, preview]);

  const showToast = useCallback((kind: ToastState["kind"], message: string) => {
    setToast({ kind, message });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(theme);

  /* ------------------------------- actions ------------------------------ */

  const saveDraft = useCallback(async () => {
    const ok = await commit(draft);
    showToast(
      ok ? "success" : "error",
      ok
        ? t("settings.branding.themeSaved")
        : t("settings.branding.failedToSave"),
    );
  }, [draft, commit, showToast, t]);

  const saveMode = useCallback(
    async (mode: ThemeMode) => {
      const ok = await commit({ ...theme, mode });
      showToast(
        ok ? "success" : "error",
        ok
          ? t("settings.branding.modeUpdated")
          : t("settings.branding.failedToUpdateMode"),
      );
    },
    [theme, commit, showToast, t],
  );

  const enableCustom = useCallback(() => {
    setCustomEnabled(true);
    setDraft((current) => {
      if (current.themeId !== "custom") lastNonCustom.current = current.themeId;
      // Seed the custom palette from the currently applied colors so the
      // editor starts from the look the company already has.
      const currentPalette = resolvePalette(current).light;
      const custom: Partial<Record<ThemeVar, string>> = {};
      for (const key of THEME_VARS)
        custom[key] = current.custom?.[key] ?? currentPalette[key];
      return { ...current, themeId: "custom", custom };
    });
  }, []);

  const disableCustom = useCallback(() => {
    setCustomEnabled(false);
    setDraft((current) => ({ ...current, themeId: lastNonCustom.current }));
  }, []);

  const selectTheme = useCallback(
    (id: ThemeId) => {
      if (id === "custom") {
        enableCustom();
        return;
      }
      lastNonCustom.current = id;
      setDraft((current) => ({ ...current, themeId: id }));
    },
    [enableCustom],
  );

  const applyTheme = useCallback(
    async (id: ThemeId) => {
      if (id === "custom") {
        enableCustom();
        return;
      }
      lastNonCustom.current = id;
      const ok = await commit({ ...draft, themeId: id });
      showToast(
        ok ? "success" : "error",
        ok
          ? t("settings.branding.themeApplied", { theme: id })
          : t("settings.branding.failedToSave"),
      );
    },
    [draft, commit, showToast, enableCustom, t],
  );

  const handleReset = useCallback(async () => {
    const ok = await resetTheme();
    showToast(
      ok ? "success" : "error",
      ok
        ? t("settings.branding.themeReset")
        : t("settings.branding.failedToReset"),
    );
  }, [resetTheme, showToast, t]);

  const changeColor = useCallback((variable: ThemeVar, value: string) => {
    setDraft((current) => ({
      ...current,
      custom: { ...current.custom, [variable]: value },
    }));
  }, []);

  const cancelCustom = useCallback(() => {
    setDraft(theme);
    setCustomEnabled(theme.themeId === "custom");
  }, [theme]);

  const exportJson = useCallback(() => {
    const data = {
      name: "Gente custom theme",
      mode: draft.mode ?? "system",
      themeId: draft.themeId,
      custom: draft.custom ?? {},
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "gente-theme.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [draft]);

  const importFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result)) as Record<
            string,
            unknown
          >;
          const sanitized = sanitizeThemeConfig({
            ...parsed,
            themeId: "custom",
          });
          setCustomEnabled(true);
          setDraft((current) => ({
            ...sanitized,
            themeId: "custom",
            logoUrl: current.logoUrl,
            faviconUrl: current.faviconUrl,
          }));
          showToast("success", t("settings.branding.customThemeImported"));
        } catch {
          showToast("error", t("settings.branding.invalidThemeFile"));
        }
      };
      reader.readAsText(file);
    },
    [showToast, t],
  );

  const draftPalette = resolvePalette(draft);
  const contrastPalette =
    effectiveMode === "dark" ? draftPalette.dark : draftPalette.light;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("settings.branding.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.branding.description")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ------------------------------ left column ----------------------------- */}
        <div className="min-w-0 space-y-6">
          <Section
            title={t("settings.branding.themeMode")}
            description={t("settings.branding.themeModeHint")}
          >
            <ModeSelector value={draft.mode ?? "system"} onChange={saveMode} />
          </Section>

          <Section
            title={t("settings.branding.predefinedThemes")}
            description={t("settings.branding.predefinedThemesHint")}
          >
            <ThemePicker
              selectedId={draft.themeId}
              customActive={draft.themeId === "custom"}
              onSelect={selectTheme}
              onApply={applyTheme}
              onCustomApply={enableCustom}
            />
          </Section>

          <Section
            title={t("settings.branding.customTheme")}
            description={t("settings.branding.customThemeHint")}
          >
            <CustomThemeEditor
              enabled={customEnabled}
              colors={draft.custom ?? {}}
              palette={contrastPalette}
              onToggle={(next) => (next ? enableCustom() : disableCustom())}
              onChangeColor={changeColor}
              onSave={saveDraft}
              onCancel={cancelCustom}
              onExport={exportJson}
              onImport={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "application/json,.json";
                input.onchange = () => {
                  const file = input.files?.[0];
                  if (file) importFile(file);
                };
                input.click();
              }}
              canSave={isDirty}
            />
          </Section>

          <Section
            title={t("settings.branding.logoFavicon")}
            description={t("settings.branding.logoFaviconHint")}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LogoUploader
                label={t("settings.branding.companyLogo")}
                hint={t("settings.branding.logoHint")}
                value={draft.logoUrl}
                onUpload={(url) => setDraft((d) => ({ ...d, logoUrl: url }))}
                onRemove={() => setDraft((d) => ({ ...d, logoUrl: undefined }))}
              />
              <LogoUploader
                label={t("settings.branding.favicon")}
                hint={t("settings.branding.faviconHint")}
                value={draft.faviconUrl}
                onUpload={(url) => setDraft((d) => ({ ...d, faviconUrl: url }))}
                onRemove={() =>
                  setDraft((d) => ({ ...d, faviconUrl: undefined }))
                }
                square
              />
            </div>
          </Section>
        </div>

        {/* ----------------------------- right column ----------------------------- */}
        <div className="h-fit space-y-3 xl:sticky xl:top-8">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t("settings.branding.livePreview")}{" "}
            <span className="capitalize">
              · {t("theme.modeLabel", { mode: effectiveMode })}
            </span>
          </h3>
          <PreviewPanel />
        </div>
      </div>

      {/* ------------------------------ save bar ------------------------------ */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-popover/95 p-3 shadow-lg backdrop-blur">
        {isDrafting && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-warning" />
            {t("settings.branding.unsavedChanges")}
          </span>
        )}
        <div className="flex-1" />
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw />
          {t("settings.branding.resetToDefault")}
        </Button>
        <Button onClick={saveDraft} disabled={!isDirty}>
          <Save />
          {t("settings.branding.saveChanges")}
        </Button>
      </div>

      {/* -------------------------------- toast -------------------------------- */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg",
            toast.kind === "success"
              ? "border-success/30"
              : "border-destructive/30",
          )}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 className="size-4 text-success" />
          ) : (
            <XCircle className="size-4 text-destructive" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
