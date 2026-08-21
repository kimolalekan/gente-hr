"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, Loader2, Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface CredentialField {
  key: string;
  label: string;
  type?: "password" | "text";
  placeholder?: string;
  required?: boolean;
  hint?: string;
}

export interface ProviderDef {
  value: string;
  label: string;
  description: string;
  credentials: CredentialField[];
}

export const PROVIDERS: ProviderDef[] = [
  {
    value: "resend",
    label: "Resend — modern API, developer friendly",
    description: "Single API key; supports React Email templates.",
    credentials: [
      {
        key: "apiKey",
        label: "API key",
        type: "password",
        placeholder: "re_1234567890…",
        required: true,
        hint: "Found in the Resend dashboard under API Keys.",
      },
    ],
  },
  {
    value: "zeptomail",
    label: "ZeptoMail — high deliverability, dedicated IPs",
    description: "Token-based auth with dedicated bounce handling.",
    credentials: [
      {
        key: "apiToken",
        label: "API token",
        type: "password",
        placeholder: "Zoho-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        required: true,
        hint: "Created per mailing domain in the ZeptoMail dashboard.",
      },
      {
        key: "returnPath",
        label: "Return-path (bounce) address",
        placeholder: "bounces@yourdomain.com",
        hint: "Bounce domain must be verified with your DNS records.",
      },
    ],
  },
  {
    value: "mailgun",
    label: "Mailgun — high-volume transactional",
    description: "Key + secret pair scoped to a verified sending domain.",
    credentials: [
      {
        key: "apiKey",
        label: "API key",
        type: "password",
        placeholder: "key-0123456789abcdef…",
        required: true,
        hint: "Private API key from the Mailgun dashboard.",
      },
      {
        key: "apiSecret",
        label: "API secret",
        type: "password",
        placeholder: "••••••••••••",
        required: true,
        hint: "Used for webhook signature validation.",
      },
      {
        key: "domain",
        label: "Sending domain",
        placeholder: "mg.yourdomain.com",
        required: true,
        hint: "A verified domain in your Mailgun account.",
      },
    ],
  },
  {
    value: "brevo",
    label: "Brevo (Sendinblue) — email + marketing",
    description: "Transactional API key, with an optional SMTP key.",
    credentials: [
      {
        key: "apiKey",
        label: "API key (v3)",
        type: "password",
        placeholder: "xkeysib-…",
        required: true,
        hint: "Transactional API key from Brevo → SMTP & API.",
      },
      {
        key: "apiSecret",
        label: "SMTP key (optional)",
        type: "password",
        placeholder: "xsmtpsib-…",
        hint: "Only needed if you route through Brevo SMTP.",
      },
    ],
  },
];

const TEMPLATES = [
  { id: "otp", name: "OTP verification", channel: "Both" },
  { id: "welcome", name: "Welcome email", channel: "Email" },
  { id: "leave_request", name: "Leave request / approval", channel: "Email" },
  { id: "payslip", name: "Payslip delivery", channel: "Email" },
  { id: "onboarding", name: "Onboarding task assignment", channel: "Email" },
  { id: "offboarding", name: "Offboarding confirmation", channel: "Email" },
];

function emptyCredentials(): Record<string, Record<string, string>> {
  return Object.fromEntries(
    PROVIDERS.map((provider) => [
      provider.value,
      Object.fromEntries(provider.credentials.map((field) => [field.key, ""])),
    ]),
  );
}

export function EmailConfigForm() {
  const [values, setValues] = useState({
    provider: "resend",
    senderName: "Gente HR",
    senderEmail: "noreply@gente.dev",
    replyTo: "people@gente.dev",
    tracking: true,
    batchLimit: "200",
  });
  const [credentials, setCredentials] = useState(emptyCredentials);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const provider =
    PROVIDERS.find((item) => item.value === values.provider) ?? PROVIDERS[0];

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="provider">Email provider</Label>
          <Select
            id="provider"
            value={values.provider}
            onChange={update("provider")}
          >
            {PROVIDERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            {provider.description}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="senderName">Sender name</Label>
          <Input
            id="senderName"
            value={values.senderName}
            onChange={update("senderName")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="senderEmail">Sender email</Label>
          <Input
            id="senderEmail"
            type="email"
            value={values.senderEmail}
            onChange={update("senderEmail")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="replyTo">Reply-to address</Label>
          <Input
            id="replyTo"
            type="email"
            value={values.replyTo}
            onChange={update("replyTo")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="batchLimit">Batch sending limit</Label>
          <Input
            id="batchLimit"
            type="number"
            value={values.batchLimit}
            onChange={update("batchLimit")}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background/50 p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <KeyRound className="size-4 text-primary" />
          {provider.label.split(" — ")[0]} credentials
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Stored encrypted; never exposed after saving.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {provider.credentials.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`cred-${field.key}`}>
                {field.label}
                {field.required && (
                  <span className="ml-1 text-destructive" aria-hidden="true">
                    *
                  </span>
                )}
              </Label>
              <Input
                id={`cred-${field.key}`}
                type={field.type ?? "text"}
                value={credentials[values.provider][field.key]}
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
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
        <div>
          <p className="text-sm font-medium">Open &amp; click tracking</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Track delivery, opens and clicks where the provider supports it.
          </p>
        </div>
        <Switch
          checked={values.tracking}
          onCheckedChange={(checked) =>
            setValues((current) => ({ ...current, tracking: checked }))
          }
          aria-label="Enable open and click tracking"
        />
      </div>

      <div className="rounded-lg border border-border bg-background/50 p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <Mail className="size-4 text-primary" />
          Email templates
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Transactional templates powered by these triggers.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
            >
              <span>{template.name}</span>
              <span className="text-xs text-muted-foreground">
                {template.channel}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save configuration
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
