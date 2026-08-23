import { eq, ne } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
  getDb,
  ok,
  parseJson,
  recordEmail,
  route,
} from "@/lib/server/api";
import { sanitizeThemeConfig, type TenantTheme } from "@/lib/theme-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "Acme Inc." → "acme-inc" */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Public: provision a workspace in one call (mirrors the /setup wizard).
 * 409 when a tenant already exists — the wizard is only for first run.
 */
export const POST = route(async (request: Request) => {
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const org = (body.organization ?? {}) as Record<string, unknown>;
  const adminBody = (body.admin ?? {}) as Record<string, unknown>;
  const emailBody = (body.email ?? {}) as Record<string, unknown>;
  const theme = body.theme;

  const name = asString(org.name).trim();
  if (!name) throw new ApiError(400, "Organization name is required");

  const adminEmail = asString(adminBody.email).trim().toLowerCase();
  if (!EMAIL_RE.test(adminEmail)) {
    throw new ApiError(400, "A valid admin email is required");
  }

  const website = asString(org.website).trim();
  const timezone = asString(org.timezone).trim() || "UTC";
  const currency = asString(org.currency).trim() || "USD";

  const { db, pool } = await getDb();
  const { tenants, users, userTenants, emailSettings, userPreferences } =
    await import("@db/schema");
  try {
    const result = await db.transaction(async (tx) => {
      // (a) Already configured?
      const existing = await tx
        .select({ id: tenants.id })
        .from(tenants)
        .limit(1);
      if (existing.length > 0) {
        throw new ApiError(409, "Workspace is already configured");
      }

      // (b) Slug from the org name, de-duplicated ("-2", "-3", …).
      const base = slugify(name) || "workspace";
      let slug = base;
      for (let suffix = 2; ; suffix++) {
        const taken = await tx
          .select({ id: tenants.id })
          .from(tenants)
          .where(eq(tenants.slug, slug))
          .limit(1);
        if (taken.length === 0) break;
        slug = `${base}-${suffix}`;
      }

      // (c) Tenant row: theme sanitized + defaults merged, settings from org.
      const themeDefaults: TenantTheme = { themeId: "default", mode: "system" };
      const themeConfig: TenantTheme = {
        ...themeDefaults,
        ...sanitizeThemeConfig(theme),
      };
      const settings: Record<string, unknown> = { supportEmail: adminEmail };
      if (website) settings.website = website;

      const [tenant] = await tx
        .insert(tenants)
        .values({ name, slug, timezone, currency, themeConfig, settings })
        .returning({ id: tenants.id, name: tenants.name, slug: tenants.slug });

      // (d) Admin user — reuse an existing account if one exists.
      let admin = (
        await tx
          .select({ id: users.id, email: users.email, name: users.name })
          .from(users)
          .where(eq(users.email, adminEmail))
          .limit(1)
      )[0];
      if (!admin) {
        const inserted = await tx
          .insert(users)
          .values({
            email: adminEmail,
            name: adminEmail.split("@")[0] || "Admin",
            superAdmin: true,
          })
          .returning({ id: users.id, email: users.email, name: users.name });
        admin = inserted[0];
      }

      // (e) Memberships: primary admin in the new tenant + admin in every
      // other existing tenant (admins get all-tenant access).
      const others = await tx
        .select({ id: tenants.id })
        .from(tenants)
        .where(ne(tenants.id, tenant.id));
      await tx.insert(userTenants).values([
        {
          userId: admin.id,
          tenantId: tenant.id,
          role: "admin",
          status: "active",
          isPrimary: true,
        },
        ...others.map((t) => ({
          userId: admin.id,
          tenantId: t.id,
          role: "admin",
          status: "active",
          isPrimary: false,
        })),
      ]);

      // (f) Email provider settings (console/{} defaults).
      const credentials =
        emailBody.credentials &&
        typeof emailBody.credentials === "object" &&
        !Array.isArray(emailBody.credentials)
          ? (emailBody.credentials as Record<string, string>)
          : {};
      await tx.insert(emailSettings).values({
        tenantId: tenant.id,
        provider: asString(emailBody.provider).trim() || "console",
        credentials,
        senderName: asString(emailBody.senderName).trim() || "Gente HR",
        senderEmail:
          asString(emailBody.senderEmail).trim() || "noreply@gente.dev",
      });

      // (g) Default color-mode preference (no-op if the reused user has one).
      await tx
        .insert(userPreferences)
        .values({ userId: admin.id, themeMode: "system" })
        .onConflictDoNothing();

      return { tenant, admin };
    });

    // (h) Welcome email + (i) audit trail (both best-effort).
    await recordEmail({
      tenantId: result.tenant.id,
      to: adminEmail,
      templateKey: "welcome",
    });
    await addAudit({
      tenantId: result.tenant.id,
      userId: result.admin.id,
      actorName: result.admin.name,
      action: "setup.complete",
      target: name,
      category: "settings",
    });

    return ok({
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
      admin: { id: result.admin.id, email: result.admin.email },
    });
  } finally {
    await pool.end();
  }
});
