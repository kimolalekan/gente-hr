import { desc, eq, sql } from "drizzle-orm";
import { getDb, ok, requireUser, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Review cycles (admin, hr; members can view) with a review count each. */
export const GET = route(async () => {
  const user = await requireUser();
  const { db, pool } = await getDb();
  try {
    const { reviewCycles, reviews } = await import("@db/schema");
    const cycles = await db
      .select()
      .from(reviewCycles)
      .where(eq(reviewCycles.tenantId, user.tenantId))
      .orderBy(desc(reviewCycles.createdAt));

    const counts = await db
      .select({
        cycleId: reviews.cycleId,
        count: sql<number>`count(*)::int`,
      })
      .from(reviews)
      .where(eq(reviews.tenantId, user.tenantId))
      .groupBy(reviews.cycleId);
    const countByCycle = new Map(counts.map((c) => [c.cycleId, c.count]));

    return ok(
      cycles.map((cycle) => ({
        ...cycle,
        reviewCount: countByCycle.get(cycle.id) ?? 0,
      })),
    );
  } finally {
    await pool.end();
  }
});
