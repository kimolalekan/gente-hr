import { eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  getDb,
  ok,
  parseJson,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CONFIG = {
  bank: {
    enabled: true,
    required: {
      bank_name: true,
      account_number: true,
      account_name: true,
      swift: false,
      routing: false,
    },
  },
  government_id: {
    enabled: true,
    required: { id_name: true, id_value: true },
  },
  emergency_contact: {
    enabled: true,
    required: { name: true, email: true, phone: true },
  },
  tax: {
    enabled: true,
    required: { tax_id: true },
  },
  health_insurance: {
    enabled: true,
    required: {
      provider: true,
      insurance_id: true,
      contact_name: false,
      contact_email: false,
    },
  },
  pension: {
    enabled: true,
    required: {
      provider: true,
      pension_id: true,
    },
  },
};

/** Deep-merge the saved config over the defaults (recursive for objects). */
function mergeConfig(base: unknown, saved: unknown): Record<string, unknown> {
  if (
    typeof base !== "object" ||
    base === null ||
    Array.isArray(base) ||
    typeof saved !== "object" ||
    saved === null ||
    Array.isArray(saved)
  ) {
    if (typeof saved === "object" && saved !== null && !Array.isArray(saved)) {
      return saved as Record<string, unknown>;
    }
    if (typeof base === "object" && base !== null && !Array.isArray(base)) {
      return base as Record<string, unknown>;
    }
    return {};
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(saved as Record<string, unknown>)) {
    if (
      key in out &&
      typeof out[key] === "object" &&
      out[key] !== null &&
      !Array.isArray(out[key]) &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      out[key] = mergeConfig(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Current employee form-field config (admin) — merged over defaults. */
export const GET = route(async () => {
  const user = await requireRole(["admin"]);
  const { db, pool } = await getDb();
  try {
    const { tenants } = await import("@db/schema");
    const [tenant] = await db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);
    if (!tenant) throw new ApiError(404, "Tenant not found");
    const saved = tenant.settings.employeeConfig;
    return ok(mergeConfig(DEFAULT_CONFIG, saved));
  } finally {
    await pool.end();
  }
});

/** Save the employee form-field config (admin). */
export const PUT = route(async (request: Request) => {
  const user = await requireRole(["admin"]);
  const body = await parseJson(request);
  if (!body || Array.isArray(body)) {
    throw new ApiError(400, "Invalid request body");
  }

  const { db, pool } = await getDb();
  try {
    const { tenants } = await import("@db/schema");
    const [tenant] = await db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const settings: Record<string, unknown> = { ...tenant.settings };
    settings.employeeConfig = body;
    await db
      .update(tenants)
      .set({ settings, updatedAt: new Date() })
      .where(eq(tenants.id, user.tenantId));

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "settings.employee_config",
      category: "settings",
    });
    return ok(body);
  } finally {
    await pool.end();
  }
});
