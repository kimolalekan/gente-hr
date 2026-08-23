"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CountryFlag } from "@/components/ui/country-flag";
import { CURRENCY_OPTIONS, getCurrencyMeta } from "@/lib/currencies";
import { cn } from "@/lib/utils";

export interface CompanyProfile {
  name: string;
  website: string;
  about: string;
  supportEmail: string;
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  logo: string | null;
  address: string | null;
  subscriptionTier: string;
  officeDays: string[];
  employeePrefix: string;
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "pt", label: "Portuguese" },
  { value: "es", label: "Spanish" },
];

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Stockholm",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "America/New_York",
];

const DAY_OPTIONS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

/** Company profile form — loaded from /api/settings/company, saved via PATCH. */
export function CompanyProfileForm({ initial }: { initial: CompanyProfile }) {
  const [values, setValues] = useState({
    companyName: initial.name,
    website: initial.website,
    about: initial.about,
    supportEmail: initial.supportEmail,
    language: initial.language,
    timezone: initial.timezone,
    currency: initial.currency,
    officeDays: initial.officeDays,
    employeePrefix: initial.employeePrefix,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update =
    (key: keyof typeof values) => (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  const toggleDay = (day: string) =>
    setValues((current) => ({
      ...current,
      officeDays: current.officeDays.includes(day)
        ? current.officeDays.filter((d) => d !== day)
        : [...current.officeDays, day],
    }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (values.officeDays.length === 0) {
      setError("Select at least one office day.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/settings/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.companyName,
          website: values.website,
          about: values.about,
          supportEmail: values.supportEmail,
          language: values.language,
          timezone: values.timezone,
          currency: values.currency,
          officeDays: values.officeDays,
          employeePrefix: values.employeePrefix,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? "Failed to save company profile");
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save company profile",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="companyName">Company name</Label>
          <Input
            id="companyName"
            value={values.companyName}
            onChange={update("companyName")}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={values.website}
            onChange={update("website")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="supportEmail">Support email</Label>
          <Input
            id="supportEmail"
            type="email"
            value={values.supportEmail}
            onChange={update("supportEmail")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="language">Language</Label>
          <Select
            id="language"
            value={values.language}
            onChange={update("language")}
          >
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Organization language — used across the workspace.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            id="timezone"
            value={values.timezone}
            onChange={update("timezone")}
          >
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="currency">Base currency</Label>
          <Select
            id="currency"
            value={values.currency}
            onChange={update("currency")}
            searchPlaceholder="Search currency or country…"
            emptyText="No currency matches that search"
            renderOption={(option) => {
              const meta = getCurrencyMeta(option.value);
              return meta ? <CountryFlag code={meta.flag} /> : null;
            }}
          >
            {CURRENCY_OPTIONS.map((currency) => (
              <option
                key={currency.value}
                value={currency.value}
                data-search={currency.search}
              >
                {currency.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            {(() => {
              const meta = getCurrencyMeta(values.currency);
              if (!meta) return null;
              const count = meta.countries.length;
              return `${count} ${count === 1 ? "country" : "countries"} use${count === 1 ? "s" : ""} ${values.currency}`;
            })()}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="about">About organization</Label>
        <Textarea
          id="about"
          value={values.about}
          onChange={update("about")}
          rows={4}
          placeholder="What does your organization do? A short company description…"
        />
        <p className="text-xs text-muted-foreground">
          Shown on company profiles and reports.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="employeePrefix">Employee ID prefix</Label>
        <Input
          id="employeePrefix"
          value={values.employeePrefix}
          onChange={update("employeePrefix")}
          placeholder="EMP"
          maxLength={6}
        />
        <p className="text-xs text-muted-foreground">
          Used to generate employee IDs (e.g. EMP-014). Letters and numbers only
          — max 6 characters.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Office / business days</Label>
        <div className="flex flex-wrap gap-2">
          {DAY_OPTIONS.map((day) => {
            const active = values.officeDays.includes(day.key);
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => toggleDay(day.key)}
                aria-pressed={active}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/60",
                )}
              >
                {day.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Days the office is open. At least one day is required.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save changes
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" />
            Saved
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
