import { eq } from "drizzle-orm";
import { ApiError, getDb, ok, requireRole, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Billing overview (admin) — plan, payment method, invoices. */
export const GET = route(async () => {
  const user = await requireRole(["admin"]);
  const { db, pool } = await getDb();
  try {
    const { tenants } = await import("@db/schema");
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const settings = tenant.settings ?? {};
    return ok({
      plan: tenant.subscriptionTier,
      paymentMethod:
        (settings.paymentMethod as Record<string, unknown> | undefined) ?? null,
      invoices: Array.isArray(settings.invoices) ? settings.invoices : [],
    });
  } finally {
    await pool.end();
  }
});
