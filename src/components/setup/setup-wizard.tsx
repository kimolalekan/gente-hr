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
import { useTranslations } from "@/lib/i18n/provider";
import { CountryFlag } from "@/components/ui/country-flag";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CURRENCY_OPTIONS, getCurrencyMeta } from "@/lib/currencies";
import {
  DEFAULT_TENANT_THEME,
  getPredefinedTheme,
  resolvePalette,
  THEME_VARS,
  type TenantTheme,
  type ThemeId,
  type ThemeMode,
  type ThemeVar,
} from "@/lib/theme-config";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n/types";

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

const LANGUAGES = [
  { value: "en", labelKey: "languages.en" },
  { value: "fr", labelKey: "languages.fr" },
  { value: "pt", labelKey: "languages.pt" },
  { value: "es", labelKey: "languages.es" },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A contentEditable that only contains markup/whitespace counts as empty. */
function isRichTextEmpty(html: string): boolean {
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .trim().length === 0
  );
}

const STEPS = [
  { id: "organization", labelKey: "setup.steps.organization", icon: Building2 },
  { id: "admin", labelKey: "setup.steps.admin", icon: ShieldCheck },
  { id: "email", labelKey: "setup.steps.email", icon: Mail },
  { id: "branding", labelKey: "setup.steps.branding", icon: Palette },
  { id: "review", labelKey: "setup.steps.review", icon: Sparkles },
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
  const { t, setLanguage: setUiLanguage } = useTranslations();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState("");
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("en");
  const [about, setAbout] = useState("");
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
      if (!orgName.trim()) return t("setup.orgNameRequired");
      return null;
    }
    if (index === 1) {
      if (!EMAIL_RE.test(adminEmail.trim())) {
        return t("setup.adminEmailRequired");
      }
      return null;
    }
    if (index === 2) {
      if (!EMAIL_RE.test(senderEmail.trim())) {
        return t("setup.senderEmailRequired");
      }
      const missing = emailProvider.credentials.find(
        (field) => field.required && !credentials[provider][field.key].trim(),
      );
      if (missing)
        return t("setup.fieldRequired", {
          provider: emailProvider.label.split(" — ")[0],
          field: missing.label,
        });
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

  const updateCredentialBoolean =
    (field: CredentialField) => (checked: boolean) =>
      setCredentials((current) => ({
        ...current,
        [provider]: { ...current[provider], [field.key]: String(checked) },
      }));

  /* --------------------------------- done --------------------------------- */

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const message = validateStep(0) ?? validateStep(1) ?? validateStep(2);
    if (message) {
      setError(message);
      // Validation messages are translated, so pick the step by re-checking
      // each rule in order instead of inspecting the message text.
      setStep(validateStep(0) ? 0 : validateStep(1) ? 1 : 2);
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
            language,
            about: isRichTextEmpty(about) ? undefined : about,
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
        const apiMessage = body?.error ?? t("setup.provisionFailed");
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
      setError(t("setup.createNetworkError"));
    } finally {
      setBusy(false);
    }
  };

  const themeName =
    draft.themeId === "custom"
      ? t("setup.customTheme")
      : (getPredefinedTheme(draft.themeId)?.name ?? "Default Blue");

  const selectedLanguageKey = LANGUAGES.find(
    (item) => item.value === language,
  )?.labelKey;

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-12 text-success" />
        <div>
          <p className="text-lg font-semibold">{t("setup.workspaceReady")}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {t("setup.doneMessage", {
              org: orgName.trim() || t("setup.yourWorkspace"),
              email: adminEmail,
            })}
          </p>
        </div>
        <Link href="/login">
          <Button>{t("auth.goToLogin")}</Button>
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
                {t(item.labelKey)}
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
            <Label htmlFor="setup-org">{t("setup.orgName")}</Label>
            <Input
              id="setup-org"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder={t("setup.orgNamePlaceholder")}
              autoFocus
              required
            />
          </div>
          <LogoUploader
            label={t("setup.logo")}
            hint={t("setup.logoHint")}
            value={logoUrl}
            onUpload={setLogoUrl}
            onRemove={() => setLogoUrl(null)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="setup-website">
                {t("setup.websiteOptional")}
              </Label>
              <Input
                id="setup-website"
                type="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder={t("setup.websitePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup-timezone">{t("setup.timezone")}</Label>
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
            <div className="space-y-1.5">
              <Label htmlFor="setup-language">{t("setup.language")}</Label>
              <Select
                id="setup-language"
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value);
                  // Reflect the selection in the wizard UI immediately.
                  setUiLanguage(event.target.value);
                }}
              >
                {LANGUAGES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.labelKey)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup-currency">{t("setup.baseCurrency")}</Label>
              <Select
                id="setup-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                searchPlaceholder={t("setup.currencySearchPlaceholder")}
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

          <div className="space-y-1.5">
            <Label htmlFor="setup-about">{t("setup.about")}</Label>
            <RichTextEditor
              id="setup-about"
              value={about}
              onChange={setAbout}
              placeholder={t("setup.aboutPlaceholder")}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="setup-admin">{t("setup.adminEmail")}</Label>
            <Input
              id="setup-admin"
              type="email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              placeholder={t("setup.adminEmailPlaceholder")}
              autoFocus
              required
            />
          </div>
          <p className="rounded-lg border border-border bg-background/50 p-3 text-xs text-muted-foreground">
            {t("setup.adminHint")}
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="setup-provider">{t("setup.emailProvider")}</Label>
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
                {field.type === "boolean" ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
                    <Switch
                      checked={credentials[provider][field.key] === "true"}
                      onCheckedChange={updateCredentialBoolean(field)}
                      aria-label={field.label}
                    />
                  </div>
                ) : (
                  <Input
                    id={`setup-cred-${field.key}`}
                    type={field.type ?? "text"}
                    value={credentials[provider][field.key]}
                    onChange={updateCredential(field)}
                    placeholder={field.placeholder}
                    required={field.required}
                    autoComplete="off"
                  />
                )}
                {field.hint && (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="setup-sender-name">{t("setup.senderName")}</Label>
              <Input
                id="setup-sender-name"
                value={senderName}
                onChange={(event) => setSenderName(event.target.value)}
                placeholder={t("setup.senderNamePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup-sender-email">
                {t("setup.senderEmail")}
              </Label>
              <Input
                id="setup-sender-email"
                type="email"
                value={senderEmail}
                onChange={(event) => setSenderEmail(event.target.value)}
                placeholder={t("setup.senderEmailPlaceholder")}
                required
              />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <Section
            title={t("setup.defaultColorMode")}
            description={t("setup.defaultColorModeHint")}
          >
            <ModeSelector value={draft.mode ?? "system"} onChange={setMode} />
          </Section>
          <Section title={t("setup.theme")} description={t("setup.themeHint")}>
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
              title={t("setup.customPalette")}
              description={t("setup.customPaletteHint")}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {THEME_VARS.map((variable) => (
                  <ColorField
                    key={variable}
                    variable={variable}
                    label={t(`theme.varLabels.${variable}` as TranslationKey)}
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
              {t("setup.steps.organization")}
            </p>
            <div className="mt-2 flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URLs can't use next/image
                <img
                  src={logoUrl}
                  alt={t("setup.logo")}
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
                  {website.trim() || t("setup.noWebsite")} · {timezone} ·{" "}
                  {selectedLanguageKey ? t(selectedLanguageKey) : language}
                </p>
                {!isRichTextEmpty(about) && (
                  <div
                    className="rich-content mt-1 line-clamp-2 text-xs text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: about }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("setup.baseCurrency")}
              </p>
              <p className="mt-2 flex items-center gap-2 font-semibold">
                <CountryFlag code={getCurrencyMeta(currency)?.flag ?? ""} />
                {currency}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("setup.steps.admin")}
              </p>
              <p className="mt-2 truncate font-semibold">{adminEmail}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("setup.steps.email")}
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
              {t("setup.steps.branding")}
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
                  {draft.mode === "light"
                    ? t("common.modeLight")
                    : draft.mode === "dark"
                      ? t("common.modeDark")
                      : t("common.modeSystem")}
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
          {t("common.back")}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            {t("common.next")}
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {busy ? t("setup.settingUp") : t("setup.createWorkspace")}
          </Button>
        )}
      </div>
    </form>
  );
}
