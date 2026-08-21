"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CountryFlag } from "@/components/ui/country-flag";
import { CURRENCY_OPTIONS, getCurrencyMeta } from "@/lib/currencies";

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

/**
 * Company profile form. Persistence is wired to the tenant store in the same
 * way as themes — for now it's a local demo form with a save confirmation.
 */
export function CompanyProfileForm() {
  const [values, setValues] = useState({
    companyName: "Acme Inc.",
    website: "acme.example.com",
    supportEmail: "people@acme.example.com",
    timezone: "Europe/London",
    currency: "USD",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update =
    (key: keyof typeof values) => (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    // Simulate a request; wire to a settings API route later.
    window.setTimeout(() => {
      setSaving(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }, 600);
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
      </div>
    </form>
  );
}
