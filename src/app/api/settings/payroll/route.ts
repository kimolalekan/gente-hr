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
import {
  mergePayrollBreakdown,
  type PayrollBreakdown,
  type PayrollComponent,
} from "@/lib/hr-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Validate + normalize a submitted breakdown (must carry the default keys). */
function normalizeBreakdown(body: unknown): PayrollBreakdown | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const source = body as Record<string, unknown>;
  const resolve = (raw: unknown): PayrollComponent[] | null => {
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const items: PayrollComponent[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }
      const record = item as Record<string, unknown>;
      if (
        typeof record.key !== "string" ||
        typeof record.label !== "string" ||
        typeof record.enabled !== "boolean"
      ) {
        return null;
      }
      items.push({
        key: record.key,
        label: record.label.trim(),
        enabled: record.enabled,
      });
    }
    return items;
  };
  if (!resolve(source.earnings) || !resolve(source.deductions)) return null;
  // Merge over defaults so unknown keys are dropped and every default
  // component is always present with a valid label.
  return mergePayrollBreakdown(body);
}

/** Payslip breakdown config (admin) — merged over defaults. */
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
    return ok(mergePayrollBreakdown(tenant.settings.payrollBreakdown));
  } finally {
    await pool.end();
  }
});

/** Save the payslip breakdown config (admin). */
export const PUT = route(async (request: Request) => {
  const user = await requireRole(["admin"]);
  const body = await parseJson(request);
  const breakdown = normalizeBreakdown(body);
  if (!breakdown) {
    throw new ApiError(400, "Invalid breakdown shape");
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
    settings.payrollBreakdown = breakdown;
    await db
      .update(tenants)
      .set({ settings, updatedAt: new Date() })
      .where(eq(tenants.id, user.tenantId));

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "settings.payroll",
      category: "settings",
    });
    return ok(breakdown);
  } finally {
    await pool.end();
  }
});
