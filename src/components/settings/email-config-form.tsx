"use client";

import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Save,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";

export interface CredentialField {
  key: string;
  label: string;
  labelKey?: TranslationKey;
  /** "boolean" renders a toggle switch (value stored as "true" | "false"). */
  type?: "password" | "text" | "boolean";
  placeholder?: string;
  required?: boolean;
  hint?: string;
  hintKey?: TranslationKey;
}

export interface ProviderDef {
  value: string;
  label: string;
  labelKey?: TranslationKey;
  description: string;
  descriptionKey?: TranslationKey;
  credentials: CredentialField[];
}

export const PROVIDERS: ProviderDef[] = [
  {
    value: "resend",
    label: "Resend — modern API, developer friendly",
    labelKey: "settings.email.providers.resend.label",
    description: "Single API key; supports React Email templates.",
    descriptionKey: "settings.email.providers.resend.description",
    credentials: [
      {
        key: "apiKey",
        label: "API key",
        labelKey: "settings.email.providers.resend.credentials.apiKey.label",
        type: "password",
        placeholder: "re_1234567890…",
        required: true,
        hint: "Found in the Resend dashboard under API Keys.",
        hintKey: "settings.email.providers.resend.credentials.apiKey.hint",
      },
    ],
  },
  {
    value: "zeptomail",
    label: "ZeptoMail — high deliverability, dedicated IPs",
    labelKey: "settings.email.providers.zeptomail.label",
    description: "Token-based auth with dedicated bounce handling.",
    descriptionKey: "settings.email.providers.zeptomail.description",
    credentials: [
      {
        key: "apiToken",
        label: "API token",
        labelKey:
          "settings.email.providers.zeptomail.credentials.apiToken.label",
        type: "password",
        placeholder: "eyJhbGciOiJIUzI1NiIs…",
        required: true,
        hint: "Paste the token only (without the leading 'Zoho-enczapikey ').",
        hintKey: "settings.email.providers.zeptomail.credentials.apiToken.hint",
      },
      {
        key: "returnPath",
        label: "Return-path (bounce) address",
        labelKey:
          "settings.email.providers.zeptomail.credentials.returnPath.label",
        placeholder: "bounces@yourdomain.com",
        hint: "Bounce domain must be verified with your DNS records.",
        hintKey:
          "settings.email.providers.zeptomail.credentials.returnPath.hint",
      },
    ],
  },
  {
    value: "mailgun",
    label: "Mailgun — high-volume transactional",
    labelKey: "settings.email.providers.mailgun.label",
    description: "Key + secret pair scoped to a verified sending domain.",
    descriptionKey: "settings.email.providers.mailgun.description",
    credentials: [
      {
        key: "apiKey",
        label: "API key",
        labelKey: "settings.email.providers.mailgun.credentials.apiKey.label",
        type: "password",
        placeholder: "key-0123456789abcdef…",
        required: true,
        hint: "Private API key from the Mailgun dashboard.",
        hintKey: "settings.email.providers.mailgun.credentials.apiKey.hint",
      },
      {
        key: "apiSecret",
        label: "API secret",
        labelKey:
          "settings.email.providers.mailgun.credentials.apiSecret.label",
        type: "password",
        placeholder: "••••••••••••",
        required: true,
        hint: "Used for webhook signature validation.",
        hintKey: "settings.email.providers.mailgun.credentials.apiSecret.hint",
      },
      {
        key: "domain",
        label: "Sending domain",
        labelKey: "settings.email.providers.mailgun.credentials.domain.label",
        placeholder: "mg.yourdomain.com",
        required: true,
        hint: "A verified domain in your Mailgun account.",
        hintKey: "settings.email.providers.mailgun.credentials.domain.hint",
      },
    ],
  },
  {
    value: "brevo",
    label: "Brevo (Sendinblue) — email + marketing",
    labelKey: "settings.email.providers.brevo.label",
    description: "Transactional API key, with an optional SMTP key.",
    descriptionKey: "settings.email.providers.brevo.description",
    credentials: [
      {
        key: "apiKey",
        label: "API key (v3)",
        labelKey: "settings.email.providers.brevo.credentials.apiKey.label",
        type: "password",
        placeholder: "xkeysib-…",
        required: true,
        hint: "Transactional API key from Brevo → SMTP & API.",
        hintKey: "settings.email.providers.brevo.credentials.apiKey.hint",
      },
      {
        key: "apiSecret",
        label: "SMTP key (optional)",
        labelKey: "settings.email.providers.brevo.credentials.apiSecret.label",
        type: "password",
        placeholder: "xsmtpsib-…",
        hint: "Only needed if you route through Brevo SMTP.",
        hintKey: "settings.email.providers.brevo.credentials.apiSecret.hint",
      },
    ],
  },
  {
    value: "smtp",
    label: "SMTP — direct server delivery",
    labelKey: "settings.email.providers.smtp.label",
    description:
      "Send through any SMTP server — Gmail, Outlook, or your own relay.",
    descriptionKey: "settings.email.providers.smtp.description",
    credentials: [
      {
        key: "host",
        label: "Host",
        labelKey: "settings.email.providers.smtp.credentials.host.label",
        placeholder: "smtp.example.com",
        required: true,
      },
      {
        key: "port",
        label: "Port",
        labelKey: "settings.email.providers.smtp.credentials.port.label",
        placeholder: "587",
        required: true,
      },
      {
        key: "username",
        label: "Username",
        labelKey: "settings.email.providers.smtp.credentials.username.label",
        placeholder: "user@example.com",
        required: true,
      },
      {
        key: "password",
        label: "Password",
        labelKey: "settings.email.providers.smtp.credentials.password.label",
        type: "password",
        placeholder: "••••••••",
        required: true,
      },
      {
        key: "secure",
        label: "Secure connection (TLS)",
        labelKey: "settings.email.providers.smtp.credentials.secure.label",
        type: "boolean",
        hint: "Use SSL/TLS from the start (port 465); leave off for STARTTLS on 587.",
        hintKey: "settings.email.providers.smtp.credentials.secure.hint",
      },
    ],
  },
  {
    value: "console",
    label: "Console — development logging",
    labelKey: "settings.email.providerConsole",
    description: "Logs emails instead of sending through a provider.",
    descriptionKey: "settings.email.providerConsoleHint",
    credentials: [],
  },
];

/** Wire shape of GET/PUT /api/settings/email (credentials are masked on GET). */
export interface EmailSettings {
  provider: string;
  credentials: Record<string, string>;
  senderName: string;
  senderEmail: string;
  replyTo: string | null;
  tracking: boolean;
  batchLimit: number;
}

const TEMPLATES: Array<{
  id: string;
  nameKey: TranslationKey;
  channelKey: TranslationKey;
}> = [
  {
    id: "otp",
    nameKey: "settings.email.templateNames.otp",
    channelKey: "settings.email.templateChannels.both",
  },
  {
    id: "welcome",
    nameKey: "settings.email.templateNames.welcome",
    channelKey: "settings.email.templateChannels.email",
  },
  {
    id: "leave_request",
    nameKey: "settings.email.templateNames.leave",
    channelKey: "settings.email.templateChannels.email",
  },
  {
    id: "payslip",
    nameKey: "settings.email.templateNames.payslip",
    channelKey: "settings.email.templateChannels.email",
  },
  {
    id: "onboarding",
    nameKey: "settings.email.templateNames.onboarding",
    channelKey: "settings.email.templateChannels.email",
  },
  {
    id: "offboarding",
    nameKey: "settings.email.templateNames.offboarding",
    channelKey: "settings.email.templateChannels.email",
  },
];

function emptyCredentials(): Record<string, Record<string, string>> {
  return Object.fromEntries(
    PROVIDERS.map((provider) => [
      provider.value,
      Object.fromEntries(provider.credentials.map((field) => [field.key, ""])),
    ]),
  );
}

export function EmailConfigForm({
  initial,
  userEmail = null,
}: {
  initial: EmailSettings;
  /** Signed-in user's email — prefilled for test sends. */
  userEmail?: string | null;
}) {
  const { t } = useTranslations();
  const [values, setValues] = useState({
    provider: initial.provider,
    senderName: initial.senderName,
    senderEmail: initial.senderEmail,
    replyTo: initial.replyTo ?? "",
    tracking: initial.tracking,
    batchLimit: String(initial.batchLimit),
  });
  const [credentials, setCredentials] = useState(emptyCredentials);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState(userEmail ?? initial.senderEmail);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  const provider =
    PROVIDERS.find((item) => item.value === values.provider) ?? PROVIDERS[0];

  // The saved provider shown in the send-test modal hint (not the draft).
  const savedProvider = PROVIDERS.find(
    (item) => item.value === initial.provider,
  );

  const update =
    (key: keyof typeof values) => (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  const updateCredential =
    (field: CredentialField) => (event: { target: { value: string } }) =>
      setCredentials((current) => ({
        ...current,
        [values.provider]: {
          ...current[values.provider],
          [field.key]: event.target.value,
        },
      }));

  const updateCredentialBoolean =
    (field: CredentialField) => (checked: boolean) =>
      setCredentials((current) => ({
        ...current,
        [values.provider]: {
          ...current[values.provider],
          [field.key]: String(checked),
        },
      }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/settings/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: values.provider,
          // Only fields the user actually typed are sent — masked values from
          // the API must never be written back over the real credentials.
          credentials: credentials[values.provider],
          senderName: values.senderName,
          senderEmail: values.senderEmail,
          replyTo: values.replyTo,
          tracking: values.tracking,
          batchLimit: Number(values.batchLimit),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? t("settings.email.saveFailed"));
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("settings.email.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTestSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const to = testEmail.trim();
    if (!to) return;
    setTesting(true);
    setTestError(null);
    try {
      const response = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? t("settings.email.testFailed"));
      }
      const recipient = body.data?.to ?? to;
      setTestResult({
        kind: "success",
        message:
          body.data?.channel === "email"
            ? t("settings.email.testSent", { email: recipient })
            : t("settings.email.testConsole"),
      });
      setTestOpen(false);
    } catch (testError) {
      setTestError(
        testError instanceof Error
          ? testError.message
          : t("settings.email.testFailed"),
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="provider">{t("settings.email.provider")}</Label>
            <Select
              id="provider"
              value={values.provider}
              onChange={update("provider")}
            >
              {PROVIDERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.labelKey ? t(item.labelKey) : item.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              {provider.descriptionKey
                ? t(provider.descriptionKey)
                : provider.description}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senderName">{t("settings.email.senderName")}</Label>
            <Input
              id="senderName"
              value={values.senderName}
              onChange={update("senderName")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senderEmail">
              {t("settings.email.senderEmail")}
            </Label>
            <Input
              id="senderEmail"
              type="email"
              value={values.senderEmail}
              onChange={update("senderEmail")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="replyTo">{t("settings.email.replyTo")}</Label>
            <Input
              id="replyTo"
              type="email"
              value={values.replyTo}
              onChange={update("replyTo")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="batchLimit">{t("settings.email.batchLimit")}</Label>
            <Input
              id="batchLimit"
              type="number"
              value={values.batchLimit}
              onChange={update("batchLimit")}
            />
          </div>
        </div>

        {provider.credentials.length > 0 && (
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-medium">
              <KeyRound className="size-4 text-primary" />
              {
                (provider.labelKey
                  ? t(provider.labelKey)
                  : provider.label
                ).split(" — ")[0]
              }{" "}
              {t("settings.email.credentials")}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("settings.email.credentialsStored")}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {provider.credentials.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`cred-${field.key}`}>
                    {field.labelKey ? t(field.labelKey) : field.label}
                    {field.required && (
                      <span
                        className="ml-1 text-destructive"
                        aria-hidden="true"
                      >
                        *
                      </span>
                    )}
                  </Label>
                  {field.type === "boolean" ? (
                    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
                      <Switch
                        checked={
                          credentials[values.provider][field.key] === "true"
                        }
                        onCheckedChange={updateCredentialBoolean(field)}
                        aria-label={
                          field.labelKey ? t(field.labelKey) : field.label
                        }
                      />
                    </div>
                  ) : (
                    <Input
                      id={`cred-${field.key}`}
                      type={field.type ?? "text"}
                      value={credentials[values.provider][field.key]}
                      onChange={updateCredential(field)}
                      placeholder={
                        initial.credentials[field.key] ?? field.placeholder
                      }
                      required={field.required}
                      autoComplete="off"
                    />
                  )}
                  {field.hint && (
                    <p className="text-xs text-muted-foreground">
                      {field.hintKey ? t(field.hintKey) : field.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
          <div>
            <p className="text-sm font-medium">
              {t("settings.email.tracking")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("settings.email.trackingHint")}
            </p>
          </div>
          <Switch
            checked={values.tracking}
            onCheckedChange={(checked) =>
              setValues((current) => ({ ...current, tracking: checked }))
            }
            aria-label={t("settings.email.trackingAria")}
          />
        </div>

        <div className="rounded-lg border border-border bg-background/50 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-medium">
            <Mail className="size-4 text-primary" />
            {t("settings.email.templates")}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("settings.email.templatesHint")}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
              >
                <span>{t(template.nameKey)}</span>
                <span className="text-xs text-muted-foreground">
                  {t(template.channelKey)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {t("settings.email.saveConfig")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setTestError(null);
              setTestOpen(true);
            }}
          >
            <Send className="size-4" />
            {t("settings.email.sendTest")}
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
          {testResult && (
            <span
              className={
                testResult.kind === "success"
                  ? "flex items-center gap-1.5 text-sm text-success"
                  : "flex items-center gap-1.5 text-sm text-destructive"
              }
            >
              {testResult.kind === "success" ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <XCircle className="size-4" />
              )}
              {testResult.message}
            </span>
          )}
        </div>
      </form>

      {/* Send-test modal — outside the form: a form nested inside the config
          form would be dropped by the browser, breaking submission. */}
      <Modal
        open={testOpen}
        onClose={() => setTestOpen(false)}
        title={t("settings.email.testModalTitle")}
        description={t("settings.email.testModalDescription")}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTestOpen(false)}
              disabled={testing}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              form="test-email-form"
              disabled={testing || !testEmail.trim()}
            >
              {testing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {t("settings.email.sendTest")}
            </Button>
          </>
        }
      >
        <form
          id="test-email-form"
          onSubmit={handleTestSubmit}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="test-email">
              {t("settings.email.recipientEmail")}
            </Label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(event) => {
                setTestEmail(event.target.value);
                if (testError) setTestError(null);
              }}
              placeholder="you@company.com"
              autoFocus
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("settings.email.testModalHint", {
                provider: savedProvider?.labelKey
                  ? t(savedProvider.labelKey)
                  : (savedProvider?.label ?? initial.provider),
              })}
            </p>
          </div>
          {testError && <p className="text-sm text-destructive">{testError}</p>}
        </form>
      </Modal>
    </>
  );
}
