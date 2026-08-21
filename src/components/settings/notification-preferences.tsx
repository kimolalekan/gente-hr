"use client";

import { useState } from "react";
import { BellOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Preference {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
}

const DEFAULT_PREFERENCES: Preference[] = [
  {
    id: "leave",
    label: "Leave requests",
    description: "New requests and approvals",
    email: true,
    push: true,
  },
  {
    id: "payroll",
    label: "Payroll",
    description: "Payroll run confirmations and payslips",
    email: true,
    push: false,
  },
  {
    id: "approvals",
    label: "Approvals",
    description: "Timesheets and expense approvals",
    email: true,
    push: true,
  },
  {
    id: "announcements",
    label: "Company announcements",
    description: "Company-wide updates",
    email: false,
    push: true,
  },
  {
    id: "security",
    label: "Security alerts",
    description: "Sign-ins and account changes",
    email: true,
    push: true,
  },
];

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
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
                Email
                <Switch
                  checked={pref.email}
                  onCheckedChange={() => toggle(pref.id, "email")}
                  aria-label={`Email notifications for ${pref.label}`}
                />
              </span>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                Push
                <Switch
                  checked={pref.push}
                  onCheckedChange={() => toggle(pref.id, "push")}
                  aria-label={`Push notifications for ${pref.label}`}
                />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saved}>
          {saved ? <Check /> : <BellOff />}
          {saved ? "Saved" : "Save preferences"}
        </Button>
        {saved && (
          <span className={cn("text-sm text-success")}>
            Preferences updated
          </span>
        )}
      </div>
    </div>
  );
}
