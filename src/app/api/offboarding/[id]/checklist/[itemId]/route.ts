import { and, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asBool,
  getDb,
  ok,
  parseJson,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Toggle an offboarding checklist item. */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id, itemId } = await params;

    const { db, pool } = await getDb();
    try {
      const { offboardings, offboardingChecklistItems } =
        await import("@db/schema");

      const [offboarding] = await db
        .select()
        .from(offboardings)
        .where(
          and(
            eq(offboardings.id, id),
            eq(offboardings.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!offboarding) throw new ApiError(404, "Offboarding record not found");

      const body = await parseJson(request);
      const done = asBool(body?.done);

      const [item] = await db
        .update(offboardingChecklistItems)
        .set({ done })
        .where(
          and(
            eq(offboardingChecklistItems.id, itemId),
            eq(offboardingChecklistItems.offboardingId, id),
          ),
        )
        .returning();
      if (!item) throw new ApiError(404, "Checklist item not found");

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "offboarding.checklist",
        target: itemId,
        category: "offboarding",
      });

      return ok(item);
    } finally {
      await pool.end();
    }
  },
);
