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

/** Change the subscription plan (admin). */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin"]);
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");
  const tier = asString(body.tier).trim();
  if (!TIERS.includes(tier)) throw new ApiError(422, "Invalid tier");

  const { db, pool } = await getDb();
  try {
    const { tenants } = await import("@db/schema");
    const [updated] = await db
      .update(tenants)
      .set({ subscriptionTier: tier, updatedAt: new Date() })
      .where(eq(tenants.id, user.tenantId))
      .returning();
    if (!updated) throw new ApiError(404, "Tenant not found");

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "billing.upgrade",
      target: tier,
      category: "settings",
    });
    return ok({ plan: updated.subscriptionTier });
  } finally {
    await pool.end();
  }
});
