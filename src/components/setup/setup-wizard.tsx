"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  Palette,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  PROVIDERS,
  type CredentialField,
} from "@/components/settings/email-config-form";
import { LogoUploader } from "@/components/settings/logo-uploader";
import { ModeSelector } from "@/components/settings/mode-selector";
import { Section } from "@/components/settings/section";
import { ThemePicker } from "@/components/settings/theme-picker";
import { ColorField } from "@/components/theme/color-field";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CURRENCY_OPTIONS, getCurrencyMeta } from "@/lib/currencies";
import {
  DEFAULT_TENANT_THEME,
  getPredefinedTheme,
  resolvePalette,
  THEME_VAR_LABELS,
  THEME_VARS,
  type TenantTheme,
  type ThemeId,
  type ThemeMode,
  type ThemeVar,
} from "@/lib/theme-config";
import { cn } from "@/lib/utils";

export const TIMEZONES = [
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "admin", label: "Admin", icon: ShieldCheck },
  { id: "email", label: "Email", icon: Mail },
  { id: "branding", label: "Branding & theme", icon: Palette },
  { id: "review", label: "Review", icon: Sparkles },
] as const;

function emptyCredentials(): Record<string, Record<string, string>> {
  return Object.fromEntries(
    PROVIDERS.map((provider) => [
      provider.value,
      Object.fromEntries(provider.credentials.map((field) => [field.key, ""])),
    ]),
  );
}

/** First-run setup wizard: org → admin → email → branding → review. Demo only. */
export function SetupWizard() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState("");
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [currency, setCurrency] = useState("USD");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [adminEmail, setAdminEmail] = useState("");

  const [provider, setProvider] = useState(PROVIDERS[0].value);
  const [credentials, setCredentials] = useState(emptyCredentials);
  const [senderName, setSenderName] = useState("Gente HR");
  const [senderEmail, setSenderEmail] = useState("");

  const [draft, setDraft] = useState<TenantTheme>(DEFAULT_TENANT_THEME);
  const [customActive, setCustomActive] = useState(false);

  const emailProvider =
    PROVIDERS.find((item) => item.value === provider) ?? PROVIDERS[0];

  /* ------------------------- first-run status -------------------------- */

  // When the workspace is already configured, send visitors straight to login.
  useEffect(() => {
    fetch("/api/setup/status")
      .then((response) => response.json())
      .then((body) => {
        if (body?.ok && body.data?.configured) {
          window.location.replace("/login");
        }
      })
      .catch(() => {
        // No DB yet — keep showing the wizard.
      });
  }, []);

  /* ----------------------------- step actions ----------------------------- */

  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (!orgName.trim()) return "Organization name is required.";
      return null;
    }
    if (index === 1) {
      if (!EMAIL_RE.test(adminEmail.trim())) {
        return "Enter a valid admin email.";
      }
      return null;
    }
    if (index === 2) {
      if (!EMAIL_RE.test(senderEmail.trim())) {
        return "Enter a valid sender email.";
      }
      const missing = emailProvider.credentials.find(
        (field) => field.required && !credentials[provider][field.key].trim(),
      );
      if (missing)
        return `${emailProvider.label.split(" — ")[0]}: ${missing.label} is required.`;
      return null;
    }
    return null;
  };

  const next = () => {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  /* ------------------------------ theme draft ----------------------------- */

  const enableCustom = () => {
    setCustomActive(true);
    setDraft((current) => {
      if (current.themeId === "custom") return current;
      const palette = resolvePalette(current).light;
      const seeded: Partial<Record<ThemeVar, string>> = {};
      for (const key of THEME_VARS) {
        seeded[key] = current.custom?.[key] ?? palette[key];
      }
      return { ...current, themeId: "custom", custom: seeded };
    });
  };

  const selectTheme = (id: ThemeId) => {
    if (id === "custom") {
      enableCustom();
      return;
    }
    setCustomActive(false);
    setDraft((current) => ({ ...current, themeId: id }));
  };

  const setMode = (mode: ThemeMode) =>
    setDraft((current) => ({ ...current, mode }));

  const changeColor = (variable: ThemeVar, value: string) => {
    setDraft((current) => ({
      ...current,
      custom: { ...current.custom, [variable]: value },
    }));
  };

  const updateCredential =
    (field: CredentialField) => (event: { target: { value: string } }) =>
      setCredentials((current) => ({
        ...current,
        [provider]: { ...current[provider], [field.key]: event.target.value },
      }));

  /* --------------------------------- done --------------------------------- */

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const message = validateStep(0) ?? validateStep(1) ?? validateStep(2);
    if (message) {
      setError(message);
      setStep(
        message.includes("Organization") || message.includes("name")
          ? 0
          : message.includes("admin")
            ? 1
            : 2,
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization: {
            name: orgName.trim(),
            website: website.trim() || undefined,
            timezone,
            currency,
            logoUrl: logoUrl ?? undefined,
          },
          admin: { email: adminEmail.trim().toLowerCase() },
          email: {
            provider,
            credentials: credentials[provider],
            senderName: senderName.trim(),
            senderEmail: senderEmail.trim().toLowerCase(),
          },
          theme: {
            themeId: draft.themeId,
            mode: draft.mode ?? "system",
            ...(draft.custom ? { custom: draft.custom } : {}),
          },
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!body?.ok) {
        const apiMessage = body?.error ?? "Could not provision the workspace";
        setError(apiMessage);
        setStep(
          apiMessage.includes("Organization") || apiMessage.includes("name")
            ? 0
            : apiMessage.includes("admin")
              ? 1
              : 2,
        );
        return;
      }
      setDone(true);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const themeName =
    draft.themeId === "custom"
      ? "Custom theme"
      : (getPredefinedTheme(draft.themeId)?.name ?? "Default Blue");

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-12 text-success" />
        <div>
          <p className="text-lg font-semibold">Workspace ready</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {orgName.trim() || "Your workspace"} is configured. An invite was
            sent to{" "}
            <span className="font-medium text-foreground">{adminEmail}</span> to
            set up the admin account.
          </p>
        </div>
        <Link href="/login">
          <Button>Go to login</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-6">
      {/* ------------------------------ stepper ------------------------------ */}
      <ol className="flex items-center gap-1">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          const state =
            index < step ? "done" : index === step ? "active" : "todo";
          return (
            <li
              key={item.id}
              className="flex min-w-0 flex-1 items-center gap-1"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  state === "done" && "bg-success text-white",
                  state === "active" && "bg-primary text-primary-foreground",
                  state === "todo" && "bg-muted text-muted-foreground",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3.5" />
                ) : (
                  <Icon className="size-3.5" />
                )}
              </span>
              <span
                className={cn(
                  "hidden truncate text-xs font-medium sm:block",
                  state === "active"
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
              {index < STEPS.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1",
                    index < step ? "bg-success" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* ------------------------------ content ------------------------------ */}
      {step === 0 && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="setup-org">Organization name</Label>
            <Input
              id="setup-org"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder="e.g. Acme Inc."
              autoFocus
              required
            />
          </div>
          <LogoUploader
            label="Logo"
            hint="Recommended: 200×200px PNG, under 512KB"
            value={logoUrl}
            onUpload={setLogoUrl}
            onRemove={() => setLogoUrl(null)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="setup-website">Website (optional)</Label>
              <Input
                id="setup-website"
                type="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://acme.example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup-timezone">Timezone</Label>
              <Select
                id="setup-timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
              >
                {TIMEZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="setup-currency">Base currency</Label>
              <Select
                id="setup-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                searchPlaceholder="Search currency or country…"
                renderOption={(option) => {
                  const meta = getCurrencyMeta(option.value);
                  return meta ? <CountryFlag code={meta.flag} /> : null;
                }}
              >
                {CURRENCY_OPTIONS.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                    data-search={item.search}
                  >
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="setup-admin">Admin email</Label>
            <Input
              id="setup-admin"
              type="email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              placeholder="you@company.com"
              autoFocus
              required
            />
          </div>
          <p className="rounded-lg border border-border bg-background/50 p-3 text-xs text-muted-foreground">
            This address receives the invite to manage the workspace. Admin
            accounts get access to every organization created under it.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="setup-provider">Email provider</Label>
            <Select
              id="setup-provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
            >
              {PROVIDERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              {emailProvider.description}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {emailProvider.credentials.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`setup-cred-${field.key}`}>
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-destructive" aria-hidden="true">
                      *
                    </span>
                  )}
                </Label>
                <Input
                  id={`setup-cred-${field.key}`}
                  type={field.type ?? "text"}
                  value={credentials[provider][field.key]}
                  onChange={updateCredential(field)}
                  placeholder={field.placeholder}
                  required={field.required}
                  autoComplete="off"
                />
                {field.hint && (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="setup-sender-name">Sender name</Label>
              <Input
                id="setup-sender-name"
                value={senderName}
                onChange={(event) => setSenderName(event.target.value)}
                placeholder="e.g. Acme HR"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup-sender-email">Sender email</Label>
              <Input
                id="setup-sender-email"
                type="email"
                value={senderEmail}
                onChange={(event) => setSenderEmail(event.target.value)}
                placeholder="noreply@yourcompany.com"
                required
              />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <Section
            title="Default color mode"
            description="Applies across the dashboard; employees can still override it."
          >
            <ModeSelector value={draft.mode ?? "system"} onChange={setMode} />
          </Section>
          <Section
            title="Theme"
            description="Pick a palette — you can start from one and customize it."
          >
            <ThemePicker
              selectedId={draft.themeId}
              customActive={customActive}
              onSelect={selectTheme}
              onApply={selectTheme}
              onCustomApply={enableCustom}
            />
          </Section>
          {customActive && (
            <Section
              title="Custom palette"
              description="Define your own colors — applied in both light and dark mode."
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {THEME_VARS.map((variable) => (
                  <ColorField
                    key={variable}
                    variable={variable}
                    label={THEME_VAR_LABELS[variable]}
                    value={
                      draft.custom?.[variable] ??
                      resolvePalette(draft).light[variable]
                    }
                    onChange={(value) => changeColor(variable, value)}
                  />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Organization
            </p>
            <div className="mt-2 flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URLs can't use next/image
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="size-10 rounded-lg border border-border object-contain"
                />
              ) : (
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-5" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {orgName.trim() || "—"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {website.trim() || "No website"} · {timezone}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Base currency
              </p>
              <p className="mt-2 flex items-center gap-2 font-semibold">
                <CountryFlag code={getCurrencyMeta(currency)?.flag ?? ""} />
                {currency}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Admin
              </p>
              <p className="mt-2 truncate font-semibold">{adminEmail}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Email
            </p>
            <p className="mt-2 font-semibold">
              {emailProvider.label.split(" — ")[0]}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {senderName} · {senderEmail || "—"}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Branding &amp; theme
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex -space-x-1.5">
                {Object.values(resolvePalette(draft).light)
                  .slice(0, 5)
                  .map((color, index) => (
                    <span
                      key={index}
                      className="size-5 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
              </div>
              <p className="font-semibold">
                {themeName} ·{" "}
                <span className="capitalize text-muted-foreground">
                  {draft.mode ?? "system"}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* ------------------------------- footer ------------------------------- */}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={back}
          disabled={step === 0 || busy}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Next
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {busy ? "Setting up…" : "Create workspace"}
          </Button>
        )}
      </div>
    </form>
  );
}
