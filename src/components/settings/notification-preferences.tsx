"use client";

import { useState } from "react";
import { BellOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

interface Preference {
  id: string;
  label: string;
  labelKey: TranslationKey | null;
  description: string;
  descriptionKey: TranslationKey | null;
  email: boolean;
  push: boolean;
}

const DEFAULT_PREFERENCES: Preference[] = [
  {
    id: "leave",
    label: "Leave requests",
    labelKey: "settings.notificationPrefs.leaveRequests",
    description: "New requests and approvals",
    descriptionKey: "settings.notificationPrefs.leaveRequestsDescription",
    email: true,
    push: true,
  },
  {
    id: "payroll",
    label: "Payroll",
    labelKey: "notifications.typePayroll",
    description: "Payroll run confirmations and payslips",
    descriptionKey: "settings.notificationPrefs.payrollDescription",
    email: true,
    push: false,
  },
  {
    id: "approvals",
    label: "Approvals",
    labelKey: "settings.notificationPrefs.approvals",
    description: "Timesheets and expense approvals",
    descriptionKey: "settings.notificationPrefs.approvalsDescription",
    email: true,
    push: true,
  },
  {
    id: "announcements",
    label: "Company announcements",
    labelKey: "settings.notificationPrefs.announcements",
    description: "Company-wide updates",
    descriptionKey: "settings.notificationPrefs.announcementsDescription",
    email: false,
    push: true,
  },
  {
    id: "security",
    label: "Security alerts",
    labelKey: "settings.notificationPrefs.security",
    description: "Sign-ins and account changes",
    descriptionKey: "settings.notificationPrefs.securityDescription",
    email: true,
    push: true,
  },
];

export function NotificationPreferences() {
  const { t } = useTranslations();
  const [preferences, setPreferences] = useState<Preference[]>(() =>
    DEFAULT_PREFERENCES.map((pref) => ({
      ...pref,
      label: pref.labelKey ? t(pref.labelKey) : pref.label,
      description: pref.descriptionKey
        ? t(pref.descriptionKey)
        : pref.description,
    })),
  );
  const [saved, setSaved] = useState(false);

  const toggle = (id: string, channel: "email" | "push") => {
    setPreferences((current) =>
      current.map((pref) =>
        pref.id === id ? { ...pref, [channel]: !pref[channel] } : pref,
      ),
    );
    setSaved(false);
  };

  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4">
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {preferences.map((pref) => (
          <div
            key={pref.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{pref.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {pref.description}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                {t("common.email")}
                <Switch
                  checked={pref.email}
                  onCheckedChange={() => toggle(pref.id, "email")}
                  aria-label={t("settings.notificationPrefs.emailAria", {
                    label: pref.label,
                  })}
                />
              </span>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                {t("common.push")}
                <Switch
                  checked={pref.push}
                  onCheckedChange={() => toggle(pref.id, "push")}
                  aria-label={t("settings.notificationPrefs.pushAria", {
                    label: pref.label,
                  })}
                />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saved}>
          {saved ? <Check /> : <BellOff />}
          {saved ? t("common.saved") : t("settings.notificationPrefs.save")}
        </Button>
        {saved && (
          <span className={cn("text-sm text-success")}>
            {t("settings.notificationPrefs.updated")}
          </span>
        )}
      </div>
    </div>
  );
}
