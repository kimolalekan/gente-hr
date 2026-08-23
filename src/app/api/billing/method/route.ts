import { eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asInt,
  asString,
  getDb,
  ok,
  parseJson,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Update the saved payment method (admin). */
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

    const settings = tenant.settings ?? {};
    const existing =
      settings.paymentMethod && typeof settings.paymentMethod === "object"
        ? (settings.paymentMethod as Record<string, unknown>)
        : {};
    const paymentMethod: Record<string, unknown> = { ...existing };
    if (body.cardLast4 !== undefined) {
      paymentMethod.cardLast4 = asString(body.cardLast4).trim();
    }
    if (body.brand !== undefined) {
      paymentMethod.brand = asString(body.brand).trim();
    }
    if (body.expMonth !== undefined) {
      paymentMethod.expMonth = asInt(body.expMonth);
    }
    if (body.expYear !== undefined) {
      paymentMethod.expYear = asInt(body.expYear);
    }

    const updatedSettings: Record<string, unknown> = {
      ...settings,
      paymentMethod,
    };
    await db
      .update(tenants)
      .set({ settings: updatedSettings, updatedAt: new Date() })
      .where(eq(tenants.id, user.tenantId));

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "billing.payment_method",
      category: "settings",
    });
    return ok(paymentMethod);
  } finally {
    await pool.end();
  }
});
