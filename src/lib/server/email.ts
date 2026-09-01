/**
 * Email provider abstraction.
 *
 * Supports the providers configurable in Settings → Email:
 * - resend    → Resend API (api key from tenant credentials or `RESEND_API_KEY`)
 * - zeptomail → Zoho ZeptoMail API (api token)
 * - mailgun   → Mailgun API (key + sending domain)
 * - brevo     → Brevo/Sendinblue API (v3 transactional key)
 * - smtp      → any SMTP server (host/port/username/password via nodemailer)
 * - console   → development logging (default when no provider/credentials)
 * Any provider failure falls back to the console so callers never hard-fail.
 *
 * All emails render through the tenant's brand header (logo + org name) —
 * see `email-template.ts`.
 */
import "server-only";
import nodemailer from "nodemailer";
import {
  buildBrandedEmailHtml,
  DEFAULT_EMAIL_COLORS,
  type EmailBranding,
} from "./email-template";

export interface OtpEmailInput {
  to: string;
  code: string;
  expiresInMinutes: number;
  /** Tenant brand shown in the header (logo + org name). */
  branding?: EmailBranding;
  /** Provider key from the tenant's email settings (resend|zeptomail|mailgun|brevo|smtp). */
  provider?: string;
  /** Tenant's saved provider credentials. */
  credentials?: Record<string, string>;
  fromName?: string;
  fromEmail?: string;
}

export interface HtmlEmailInput {
  to: string;
  /** Extra recipients copied on the email. */
  cc?: string[];
  subject: string;
  /** Rendered HTML body (already branded). */
  html: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string | null;
  /** iCalendar invite payload → attached as invite.ics. */
  ics?: string;
  /** Provider key: resend | zeptomail | mailgun | brevo | smtp | console. */
  provider?: string;
  /** Tenant's saved provider credentials (apiKey / apiToken / domain …). */
  credentials?: Record<string, string>;
  /** Resend convenience — falls back to credentials / RESEND_API_KEY. */
  apiKey?: string;
}

export interface OtpDelivery {
  channel: "email" | "console";
  provider: string;
}

const RESEND_URL = "https://api.resend.com/emails";
const ZEPTOMAIL_URL = "https://api.zeptomail.com/v1.1/email";
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

function buildOtpHtml(input: OtpEmailInput): string {
  const branding = input.branding ?? { name: "Gente HR", logoUrl: null };
  const colors = branding.colors ?? DEFAULT_EMAIL_COLORS;
  return buildBrandedEmailHtml({
    branding,
    title: "Your sign-in code",
    body: `
      <p style="margin:0 0 24px;font-size:14px;color:${colors.mutedForeground}">Use the code below to sign in to ${branding.name}. It expires in ${input.expiresInMinutes} minutes.</p>
      <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:8px;color:${colors.primary};text-align:center;padding:16px;background:${colors.primaryBackground};border-radius:8px">${input.code}</p>
      <p style="margin:24px 0 0;font-size:12px;color:${colors.mutedForeground}">If you didn't request this code, you can safely ignore this email.</p>`,
  });
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  payload: Record<string, unknown>,
  provider: string,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `${provider} API error ${res.status}: ${body.slice(0, 300)}`,
    );
  }
}

function icsAttachment(content: string): {
  filename: string;
  content: string;
} {
  return {
    filename: "invite.ics",
    content: Buffer.from(content).toString("base64"),
  };
}

/* ------------------------------- providers ------------------------------ */

async function sendViaResendHtml(
  input: HtmlEmailInput,
  apiKey: string,
): Promise<void> {
  const fromName = input.fromName ?? "Gente HR";
  const fromEmail = input.fromEmail ?? "noreply@gente.dev";
  const payload: Record<string, unknown> = {
    from: `${fromName} <${fromEmail}>`,
    to: [input.to],
    subject: input.subject,
    html: input.html,
  };
  if (input.replyTo) payload.reply_to = input.replyTo;
  if (input.cc?.length) payload.cc = input.cc;
  if (input.ics) payload.attachments = [icsAttachment(input.ics)];
  await postJson(
    RESEND_URL,
    { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    payload,
    "Resend",
  );
}

async function sendViaZeptomail(input: HtmlEmailInput): Promise<void> {
  const stored = input.credentials?.apiToken;
  if (!stored) throw new Error("ZeptoMail API token is not configured");
  // Users often paste the whole Authorization header
  // ("Zoho-enczapikey <token>") instead of just the token — strip the
  // scheme prefix so the header isn't doubled.
  const token = stored.replace(/^zoho-enczapikey\s+/i, "").trim();
  if (!token) throw new Error("ZeptoMail API token is not configured");
  const fromName = input.fromName ?? "Gente HR";
  const fromEmail = input.fromEmail ?? "noreply@gente.dev";
  const payload: Record<string, unknown> = {
    from: { address: fromEmail, name: fromName },
    to: [{ email_address: { address: input.to } }],
    subject: input.subject,
    htmlbody: input.html,
  };
  if (input.cc?.length) {
    payload.cc = input.cc.map((email) => ({
      email_address: { address: email },
    }));
  }
  if (input.replyTo) {
    payload.reply_to = [{ email_address: { address: input.replyTo } }];
  }
  if (input.ics) {
    payload.attachments = [
      {
        ...icsAttachment(input.ics),
        mime_type: "text/calendar",
      },
    ];
  }
  await postJson(
    ZEPTOMAIL_URL,
    {
      Authorization: `Zoho-enczapikey ${token}`,
      "Content-Type": "application/json",
    },
    payload,
    "ZeptoMail",
  );
}

async function sendViaMailgun(input: HtmlEmailInput): Promise<void> {
  const apiKey = input.credentials?.apiKey;
  const domain = input.credentials?.domain;
  if (!apiKey || !domain) {
    throw new Error("Mailgun API key and sending domain are required");
  }
  const fromName = input.fromName ?? "Gente HR";
  const fromEmail = input.fromEmail ?? "noreply@gente.dev";
  const form = new FormData();
  form.set("from", `${fromName} <${fromEmail}>`);
  form.set("to", input.to);
  for (const email of input.cc ?? []) form.append("cc", email);
  form.set("subject", input.subject);
  form.set("html", input.html);
  if (input.replyTo) form.set("h:Reply-To", input.replyTo);
  if (input.ics) {
    form.append(
      "attachment",
      new Blob([input.ics], { type: "text/calendar" }),
      "invite.ics",
    );
  }
  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
    },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mailgun API error ${res.status}: ${body.slice(0, 300)}`);
  }
}

async function sendViaBrevo(input: HtmlEmailInput): Promise<void> {
  const apiKey = input.credentials?.apiKey;
  if (!apiKey) throw new Error("Brevo API key is not configured");
  const fromName = input.fromName ?? "Gente HR";
  const fromEmail = input.fromEmail ?? "noreply@gente.dev";
  const payload: Record<string, unknown> = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: input.to }],
    subject: input.subject,
    htmlContent: input.html,
  };
  if (input.cc?.length) payload.cc = input.cc.map((email) => ({ email }));
  if (input.replyTo) payload.replyTo = { email: input.replyTo };
  if (input.ics) {
    payload.attachment = [
      {
        name: "invite.ics",
        content: Buffer.from(input.ics).toString("base64"),
      },
    ];
  }
  await postJson(
    BREVO_URL,
    { "api-key": apiKey, "Content-Type": "application/json" },
    payload,
    "Brevo",
  );
}

/** Send through a raw SMTP server via nodemailer (host/port/username/password). */
async function sendViaSmtp(input: HtmlEmailInput): Promise<void> {
  const { host, port, username, password, secure } = input.credentials ?? {};
  if (!host || !port) {
    throw new Error("SMTP host and port are required");
  }
  const portNumber = Number(port) || 587;
  const fromName = input.fromName ?? "Gente HR";
  const fromEmail = input.fromEmail ?? "noreply@gente.dev";

  const transporter = nodemailer.createTransport({
    host,
    port: portNumber,
    // Port 465 is implicit TLS; anything else negotiates STARTTLS.
    secure: secure === "true" || portNumber === 465,
    auth: username ? { user: username, pass: password ?? "" } : undefined,
  });
  try {
    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: input.to,
      cc: input.cc?.length ? input.cc : undefined,
      replyTo: input.replyTo ?? undefined,
      subject: input.subject,
      html: input.html,
      ...(input.ics
        ? { icalEvent: { filename: "invite.ics", content: input.ics } }
        : {}),
    });
  } finally {
    transporter.close();
  }
}

function sendViaConsole(input: OtpEmailInput): void {
  const branding = input.branding ?? { name: "Gente HR", logoUrl: null };
  const line = "─".repeat(46);
  console.log(`\n${line}`);
  console.log(
    `  ${branding.name.toUpperCase()} — SIGN-IN CODE (development console provider)`,
  );
  console.log(line);
  console.log(`  To:      ${input.to}`);
  console.log(`  Org:     ${branding.name}`);
  console.log(
    `  Logo:    ${branding.logoUrl ?? "(none — name shown in header)"}`,
  );
  console.log(`  Code:    ${input.code}`);
  console.log(`  Expires: in ${input.expiresInMinutes} minutes`);
  console.log(`${line}\n`);
}

/**
 * Deliver a rendered HTML email through the configured provider. Unsupported
 * or misconfigured providers, and any delivery error, fall back to the
 * console provider so callers never hard-fail.
 */
export async function sendHtmlEmail(
  input: HtmlEmailInput,
): Promise<OtpDelivery> {
  const provider = input.provider ?? "console";
  try {
    if (provider === "resend") {
      const apiKey =
        input.credentials?.apiKey ?? input.apiKey ?? process.env.RESEND_API_KEY;
      if (!apiKey) throw new Error("Resend API key is not configured");
      await sendViaResendHtml(input, apiKey);
      return { channel: "email", provider: "resend" };
    }
    if (provider === "zeptomail") {
      await sendViaZeptomail(input);
      return { channel: "email", provider: "zeptomail" };
    }
    if (provider === "mailgun") {
      await sendViaMailgun(input);
      return { channel: "email", provider: "mailgun" };
    }
    if (provider === "brevo") {
      await sendViaBrevo(input);
      return { channel: "email", provider: "brevo" };
    }
    if (provider === "smtp") {
      await sendViaSmtp(input);
      return { channel: "email", provider: "smtp" };
    }
  } catch (error) {
    console.warn(
      `[email] ${provider} delivery failed; falling back to console provider.`,
      error,
    );
  }
  console.log(
    `\n[email] → ${input.to}` +
      (input.cc?.length ? ` (cc: ${input.cc.join(", ")})` : "") +
      `\n  Subject: ${input.subject}` +
      `\n  Provider: ${provider} (console fallback)`,
  );
  console.log(input.html);
  return { channel: "console", provider: "console" };
}

export async function sendOtpEmail(input: OtpEmailInput): Promise<OtpDelivery> {
  const branding = input.branding ?? { name: "Gente HR", logoUrl: null };
  // Tenant provider config wins; the env-based Resend key is the fallback for
  // providers without stored credentials.
  const provider =
    input.provider ?? (process.env.RESEND_API_KEY ? "resend" : "console");

  if (provider === "console") {
    sendViaConsole(input);
    return { channel: "console", provider: "console" };
  }

  const delivery = await sendHtmlEmail({
    to: input.to,
    subject: `Your ${branding.name} sign-in code`,
    html: buildOtpHtml(input),
    fromName: input.fromName,
    fromEmail: input.fromEmail,
    provider,
    credentials: input.credentials,
    apiKey: process.env.RESEND_API_KEY,
  });
  return delivery;
}

/**
 * Best-effort read of a tenant's saved email provider settings, keyed by the
 * given tenant id. Falls back to the console provider when unavailable.
 */
export async function getTenantEmailSettings(tenantId: string): Promise<{
  provider: string;
  credentials: Record<string, string>;
  senderName: string;
  senderEmail: string;
  replyTo: string | null;
}> {
  try {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { eq } = await import("drizzle-orm");
    const { Pool } = await import("pg");
    const { emailSettings } = await import("@db/schema");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
    try {
      const db = drizzle(pool);
      const [row] = await db
        .select()
        .from(emailSettings)
        .where(eq(emailSettings.tenantId, tenantId))
        .limit(1);
      return {
        provider: row?.provider ?? "console",
        credentials: row?.credentials ?? {},
        senderName: row?.senderName ?? "Gente HR",
        senderEmail: row?.senderEmail ?? "noreply@gente.dev",
        replyTo: row?.replyTo ?? null,
      };
    } finally {
      await pool.end();
    }
  } catch {
    return {
      provider: "console",
      credentials: {},
      senderName: "Gente HR",
      senderEmail: "noreply@gente.dev",
      replyTo: null,
    };
  }
}
