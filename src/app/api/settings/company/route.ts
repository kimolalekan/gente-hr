import { eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
  getDb,
  ok,
  parseJson,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIERS = ["free", "growth", "enterprise"];
const LANGUAGES = ["en", "fr", "pt", "es"];
const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/** Default office days: Monday–Friday. */
function defaultOfficeDays(): string[] {
  return WEEK_DAYS.slice(0, 5);
}

function companyShape(tenant: {
  name: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  logo: string | null;
  address: string | null;
  subscriptionTier: string;
  settings: Record<string, unknown>;
}) {
  const settings = tenant.settings ?? {};
  const rawDays = Array.isArray(settings.officeDays)
    ? (settings.officeDays as unknown[])
    : [];
  const officeDays =
    rawDays.length > 0
      ? rawDays.filter(
          (day): day is string =>
            typeof day === "string" && WEEK_DAYS.includes(day.toLowerCase()),
        )
      : defaultOfficeDays();
  return {
    name: tenant.name,
    website: typeof settings.website === "string" ? settings.website : "",
    about: typeof settings.about === "string" ? settings.about : "",
    supportEmail:
      typeof settings.supportEmail === "string" ? settings.supportEmail : "",
    supportPhone:
      typeof settings.supportPhone === "string" ? settings.supportPhone : "",
    language:
      typeof settings.language === "string" &&
      LANGUAGES.includes(settings.language)
        ? settings.language
        : "en",
    timezone: tenant.timezone,
    currency: tenant.currency,
    dateFormat: tenant.dateFormat,
    logo: tenant.logo ?? null,
    address: tenant.address ?? null,
    subscriptionTier: tenant.subscriptionTier,
    officeDays,
    employeePrefix:
      typeof settings.employeePrefix === "string" &&
      settings.employeePrefix.trim()
        ? settings.employeePrefix.trim().toUpperCase()
        : "EMP",
  };
}

/** Company profile (admin; hr can view). */
export const GET = route(async () => {
  const user = await requireRole(["admin", "hr"]);
  const { db, pool } = await getDb();
  try {
    const { tenants } = await import("@db/schema");
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);
    if (!tenant) throw new ApiError(404, "Tenant not found");
    return ok(companyShape(tenant));
  } finally {
    await pool.end();
  }
});

/** Update the company profile (admin) — merges settings jsonb. */
export const PATCH = route(async (request: Request) => {
  const user = await requireRole(["admin"]);
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const { db, pool } = await getDb();
  try {
    const { tenants } = await import("@db/schema");
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const set: Partial<typeof tenants.$inferInsert> = {};
    if (body.name !== undefined) {
      const name = asString(body.name).trim();
      if (!name) throw new ApiError(422, "name is required");
      set.name = name;
    }
    if (body.timezone !== undefined) {
      set.timezone = asString(body.timezone).trim() || tenant.timezone;
    }
    if (body.currency !== undefined) {
      set.currency = asString(body.currency).trim() || tenant.currency;
    }
    if (body.dateFormat !== undefined) {
      set.dateFormat = asString(body.dateFormat).trim() || tenant.dateFormat;
    }
    if (body.logo !== undefined) {
      set.logo = asString(body.logo) || null;
    }
    if (body.address !== undefined) {
      set.address = asString(body.address) || null;
    }
    if (body.subscriptionTier !== undefined) {
      const tier = asString(body.subscriptionTier).trim();
      if (!TIERS.includes(tier))
        throw new ApiError(422, "Invalid subscription tier");
      set.subscriptionTier = tier;
    }

    const settings: Record<string, unknown> = { ...tenant.settings };
    if (body.website !== undefined) {
      settings.website = asString(body.website).trim();
    }
    if (body.about !== undefined) {
      settings.about = asString(body.about).trim();
    }
    if (body.supportEmail !== undefined) {
      settings.supportEmail = asString(body.supportEmail).trim();
    }
    if (body.supportPhone !== undefined) {
      settings.supportPhone = asString(body.supportPhone).trim();
    }
    if (body.language !== undefined) {
      const language = asString(body.language).trim();
      if (!LANGUAGES.includes(language)) {
        throw new ApiError(422, "Invalid language");
      }
      settings.language = language;
    }
    if (body.officeDays !== undefined) {
      if (!Array.isArray(body.officeDays)) {
        throw new ApiError(422, "officeDays must be an array of day names");
      }
      const days = body.officeDays.map((day) => asString(day).toLowerCase());
      const invalid = days.find((day) => !WEEK_DAYS.includes(day));
      if (invalid) throw new ApiError(422, `Invalid office day: ${invalid}`);
      if (days.length === 0) {
        throw new ApiError(422, "At least one office day is required");
      }
      settings.officeDays = days;
    }
    if (body.employeePrefix !== undefined) {
      const prefix = asString(body.employeePrefix)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
      settings.employeePrefix = prefix || "EMP";
    }
    set.settings = settings;

    const [updated] = await db
      .update(tenants)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(tenants.id, user.tenantId))
      .returning();

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "settings.company",
      category: "settings",
    });
    return ok(companyShape(updated));
  } finally {
    await pool.end();
  }
});
