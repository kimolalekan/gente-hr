/**
 * Shared branded email templates.
 *
 * Every outgoing email is wrapped in the tenant's brand: the organization logo
 * (tenant theme config → `tenants.logo`) resolved against `BASE_URL`, with the
 * organization name as the `alt` text — falling back to the name as styled
 * text when no logo is configured. Colors come from the tenant's theme (light
 * palette), falling back to the default Gente palette when unset.
 */
import "server-only";
import { eq } from "drizzle-orm";
import {
  DEFAULT_TENANT_THEME,
  resolvePalette,
  type ThemePalette,
} from "@/lib/theme-config";

/** Colors the email templates use, resolved from the tenant theme. */
export interface EmailThemeColors {
  primary: string;
  primaryBackground: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  card: string;
}

export interface EmailBranding {
  name: string;
  logoUrl: string | null;
  /** Resolved tenant theme colors (light palette) — defaults when unset. */
  colors?: EmailThemeColors;
}

/** Map a resolved theme palette (light) to the email color shape. */
export function emailThemeColors(palette: ThemePalette): EmailThemeColors {
  return {
    primary: palette.primary,
    primaryBackground: palette["primary-background"],
    primaryForeground: palette["primary-foreground"],
    background: palette.background,
    foreground: palette.foreground,
    muted: palette.muted,
    mutedForeground: palette["muted-foreground"],
    border: palette.border,
    card: palette.card,
  };
}

const DEFAULT_BRANDING: EmailBranding = { name: "Gente HR", logoUrl: null };

/** Default Gente theme colors — used when a tenant has no theme config. */
export const DEFAULT_EMAIL_COLORS: EmailThemeColors = emailThemeColors(
  resolvePalette(DEFAULT_TENANT_THEME).light,
);

/** App base URL used to resolve relative asset paths in emails. */
export function emailBaseUrl(): string {
  return (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Resolve a logo/asset path for email clients: absolute (`http(s)://`) and
 * `data:` URLs pass through; anything else is prefixed with `BASE_URL`.
 */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:)?\/\//i.test(url) || /^data:/i.test(url)) return url;
  return `${emailBaseUrl()}/${url.replace(/^\/+/, "")}`;
}

/**
 * Email-safe logo URL. Email clients block `data:` URIs (base64 uploads from
 * branding settings), so those are referenced through the app's public logo
 * endpoint instead; absolute `http(s)://` URLs pass through; relative paths
 * resolve against `BASE_URL`. Returns null when there's no usable image.
 */
export function resolveEmailLogo(
  url: string | null | undefined,
  tenantId: string,
): string | null {
  if (!url) return null;
  if (/^data:/i.test(url)) {
    return `${emailBaseUrl()}/api/tenants/${tenantId}/logo`;
  }
  return resolveAssetUrl(url);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Brand header block: logo image (`alt` = org name) or the name in the theme's primary color. */
export function brandHeader(branding: EmailBranding): string {
  const colors = branding.colors ?? DEFAULT_EMAIL_COLORS;
  if (branding.logoUrl) {
    return `<img src="${escapeHtml(
      branding.logoUrl,
    )}" alt="${escapeHtml(branding.name)}" style="display:block;max-height:40px;max-width:200px;width:auto;height:auto" />`;
  }
  return `<span style="color:${colors.primary};font-size:18px;font-weight:700">${escapeHtml(
    branding.name,
  )}</span>`;
}

/** Full HTML email: branded header + title + body + footer (tenant theme colors). */
export function buildBrandedEmailHtml(input: {
  branding?: EmailBranding;
  title: string;
  body: string;
  footer?: string;
}): string {
  const branding = input.branding ?? DEFAULT_BRANDING;
  const colors = branding.colors ?? DEFAULT_EMAIL_COLORS;
  const footer =
    input.footer ??
    `You're receiving this because you have an account at ${escapeHtml(
      branding.name,
    )}.`;
  return `<!doctype html>
<html>
  <body style="margin:0;background:${colors.muted};font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:32px 0">
    <table role="presentation" width="100%"><tr><td align="center">
      <table role="presentation" style="max-width:480px;width:100%;background:${colors.card};border:1px solid ${colors.border};border-radius:12px;overflow:hidden">
        <tr>
          <td style="padding:20px 32px;border-bottom:1px solid ${colors.border}">
            ${brandHeader(branding)}
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h1 style="margin:0 0 8px;font-size:20px;color:${colors.foreground}">${escapeHtml(
              input.title,
            )}</h1>
            ${input.body}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px;font-size:12px;color:${colors.mutedForeground}">
            ${footer}
          </td>
        </tr>
      </table>
    </td></tr></table>
  </body>
</html>`;
}

/**
 * Load a tenant's email branding: organization name + logo + theme colors. The
 * logo comes from the theme config (Branding settings → `logoUrl`), falling
 * back to the `tenants.logo` column; colors come from the tenant theme with a
 * default fallback. Best-effort — never throws.
 */
export async function getTenantBranding(
  tenantId: string,
): Promise<EmailBranding> {
  try {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { Pool } = await import("pg");
    const { tenants } = await import("@db/schema");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
    try {
      const db = drizzle(pool);
      const [tenant] = await db
        .select({
          name: tenants.name,
          logo: tenants.logo,
          themeConfig: tenants.themeConfig,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      if (!tenant) return { ...DEFAULT_BRANDING };
      return {
        name: tenant.name,
        logoUrl: resolveEmailLogo(
          tenant.themeConfig?.logoUrl ?? tenant.logo ?? null,
          tenantId,
        ),
        colors: emailThemeColors(
          resolvePalette(tenant.themeConfig ?? DEFAULT_TENANT_THEME).light,
        ),
      };
    } finally {
      await pool.end();
    }
  } catch (error) {
    console.warn("[email-template] Could not load tenant branding", error);
    return { ...DEFAULT_BRANDING };
  }
}

/* ------------------------------------------------------------------ */
/* Template registry (subject + body per template key)                 */
/* ------------------------------------------------------------------ */

const P = (children: string, colors: EmailThemeColors) =>
  `<p style="margin:0 0 16px;font-size:14px;color:${colors.mutedForeground}">${children}</p>`;

const Button = (href: string, label: string, colors: EmailThemeColors) =>
  `<table role="presentation" style="margin:24px 0"><tr><td><a href="${href}" style="display:inline-block;padding:10px 20px;border-radius:8px;background:${colors.primary};color:${colors.primaryForeground};font-size:14px;font-weight:600;text-decoration:none">${label}</a></td></tr></table>`;

/** Subject + body per `templateKey`; `{org}` is replaced with the org name. */
export const EMAIL_TEMPLATES: Record<
  string,
  { subject: string; body: (colors: EmailThemeColors) => string }
> = {
  welcome: {
    subject: "Welcome to {org}",
    body: (colors) =>
      P(
        "Your account is ready. Sign in to explore your workspace, manage your team and stay on top of HR.",
        colors,
      ) + Button(`${emailBaseUrl()}/`, "Open Gente", colors),
  },
  invite: {
    subject: "You've been invited to {org}",
    body: (colors) =>
      P(
        "You've been invited to join the {org} workspace on Gente. Sign in with your email to get started.",
        colors,
      ) + Button(`${emailBaseUrl()}/login`, "Sign in", colors),
  },
  payslip: {
    subject: "Your payslip is ready",
    body: (colors) =>
      P(
        "A new payslip has been generated for you. Sign in to view the earnings and deductions breakdown.",
        colors,
      ) + Button(`${emailBaseUrl()}/payroll/payslips`, "View payslips", colors),
  },
  payroll: {
    subject: "Payroll run complete",
    body: (colors) =>
      P(
        "The latest payroll run has been processed. Payslips are available for all employees.",
        colors,
      ),
  },
  leave_requested: {
    subject: "Leave request submitted",
    body: (colors) =>
      P(
        "Your leave request has been submitted and is awaiting approval. You'll be notified once it's decided.",
        colors,
      ),
  },
  leave_approved: {
    subject: "Leave approved",
    body: (colors) =>
      P("Your leave request has been approved. Enjoy your time off!", colors),
  },
  leave_rejected: {
    subject: "Leave request not approved",
    body: (colors) =>
      P(
        "Your leave request was not approved. Please reach out to your manager if you have questions.",
        colors,
      ),
  },
  leave_cancelled: {
    subject: "Leave cancelled",
    body: (colors) => P("Your leave request has been cancelled.", colors),
  },
  leave_extended: {
    subject: "Leave extended",
    body: (colors) => P("Your leave request has been extended.", colors),
  },
  onboarding_invite: {
    subject: "Complete your onboarding at {org}",
    body: (colors) =>
      P(
        "Welcome to {org}! Your onboarding plan is ready — complete the steps below to get set up before your start date.",
        colors,
      ) +
      Button(
        `${emailBaseUrl()}/onboarding/complete`,
        "Complete onboarding",
        colors,
      ),
  },
  onboarding_done: {
    subject: "Onboarding complete",
    body: (colors) =>
      P(
        "Your onboarding is complete. Welcome aboard — we're glad to have you at {org}!",
        colors,
      ),
  },
  offboarding_started: {
    subject: "Offboarding started",
    body: (colors) =>
      P(
        "An offboarding process has been started for you. HR will guide you through the next steps.",
        colors,
      ),
  },
  offboarding_complete: {
    subject: "Offboarding complete",
    body: (colors) =>
      P(
        "Your offboarding is complete. Thank you for your time at {org} — we wish you all the best.",
        colors,
      ),
  },
  interview_invite: {
    subject: "Interview scheduled with {org}",
    body: (colors) =>
      P(
        "An interview has been scheduled for your application. A calendar invite with the date, time and interviewers is attached to this email.",
        colors,
      ) + Button(`${emailBaseUrl()}/ats`, "View your application", colors),
  },
  loan_approved: {
    subject: "Loan approved",
    body: (colors) =>
      P(
        "Your loan request has been approved. The amount will be reflected in your upcoming payroll.",
        colors,
      ),
  },
  review_started: {
    subject: "Performance review started",
    body: (colors) =>
      P(
        "A performance review has been started for you. Please complete your self-assessment before the deadline.",
        colors,
      ),
  },
  review_submitted: {
    subject: "Review submitted",
    body: (colors) =>
      P(
        "Your review has been submitted and is now with the reviewer for feedback.",
        colors,
      ),
  },
  review_deadline_extended: {
    subject: "Review deadline extended",
    body: (colors) =>
      P(
        "The deadline for your performance review has been extended. You now have more time to complete it.",
        colors,
      ),
  },
  email_test: {
    subject: "Test email from {org}",
    body: (colors) =>
      P(
        "This is a test email from your Gente HR email configuration. If you're reading this, delivery is working.",
        colors,
      ),
  },
};

/** Resolve a template (subject + body) with the org name substituted. */
export function resolveEmailTemplate(
  templateKey: string,
  branding: EmailBranding,
): { subject: string; body: string } {
  const colors = branding.colors ?? DEFAULT_EMAIL_COLORS;
  const template = EMAIL_TEMPLATES[templateKey];
  if (!template) {
    return {
      subject: `Update from ${branding.name}`,
      body: P(
        `You have a new update from ${branding.name} in Gente HR.`,
        colors,
      ),
    };
  }
  return {
    subject: template.subject.replace(/\{org\}/g, branding.name),
    body: template.body(colors).replace(/\{org\}/g, branding.name),
  };
}
