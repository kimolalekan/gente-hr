"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import type { PayrollBreakdown, PayrollComponent } from "@/lib/hr-data";

const SECTIONS: Array<{
  id: keyof PayrollBreakdown;
  title: string;
  titleKey: TranslationKey;
  description: string;
  descriptionKey: TranslationKey;
}> = [
  {
    id: "earnings",
    title: "Earnings",
    titleKey: "settings.payroll.earnings",
    description: "Additions that make up gross pay.",
    descriptionKey: "settings.payroll.earningsDescription",
  },
  {
    id: "deductions",
    title: "Deductions",
    titleKey: "settings.payroll.deductions",
    description: "Amounts deducted from gross pay.",
    descriptionKey: "settings.payroll.deductionsDescription",
  },
];

/**
 * Payslip breakdown — which earnings/deduction components appear on payslips
 * and how each is labelled. Loaded from /api/settings/payroll and saved via PUT.
 */
export function PayrollBreakdownForm({
  initialBreakdown,
}: {
  initialBreakdown: PayrollBreakdown;
}) {
  const { t } = useTranslations();
  const [breakdown, setBreakdown] = useState(() => ({
    earnings: initialBreakdown.earnings.map((component) => ({ ...component })),
    deductions: initialBreakdown.deductions.map((component) => ({
      ...component,
    })),
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateComponent = (
    section: keyof PayrollBreakdown,
    key: string,
    patch: Partial<PayrollComponent>,
  ) => {
    setBreakdown((current) => ({
      ...current,
      [section]: current[section].map((component) =>
        component.key === key ? { ...component, ...patch } : component,
      ),
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/settings/payroll", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(breakdown),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? t("settings.payroll.saveFailed"));
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("settings.payroll.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {t("settings.payroll.breakdownHint")}
      </p>

      <div className="space-y-4">
        {SECTIONS.map((section) => {
          const components = breakdown[section.id];
          return (
            <div
              key={section.id}
              className="rounded-lg border border-border bg-background/50 p-4"
            >
              <p className="text-sm font-medium">{t(section.titleKey)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t(section.descriptionKey)}
              </p>
              <div className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border bg-background/40">
                {components.map((component) => (
                  <div
                    key={component.key}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <Input
                      value={component.label}
                      onChange={(event) =>
                        updateComponent(section.id, component.key, {
                          label: event.target.value,
                        })
                      }
                      aria-label={`${t(section.titleKey)} ${t(
                        "settings.payroll.componentLabel",
                      )}`}
                      className="h-8 max-w-xs"
                    />
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {component.enabled
                          ? t("settings.payroll.shown")
                          : t("settings.payroll.hidden")}
                      </span>
                      <Switch
                        checked={component.enabled}
                        onCheckedChange={(checked) =>
                          updateComponent(section.id, component.key, {
                            enabled: checked,
                          })
                        }
                        aria-label={t("settings.payroll.componentShowAria", {
                          label: component.label || component.key,
                        })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {t("settings.payroll.saveBreakdown")}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" />
            {t("common.saved")}
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1.5 text-sm text-destructive">
            <XCircle className="size-4" />
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
