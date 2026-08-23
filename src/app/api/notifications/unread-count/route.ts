import { and, eq } from "drizzle-orm";
import { getDb, ok, requireUser, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/notifications/unread-count — badge count for the header bell. */
export const GET = route(async () => {
  const user = await requireUser();
  const { db, pool } = await getDb();
  const { notifications } = await import("@db/schema");
  try {
    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          eq(notifications.tenantId, user.tenantId),
          eq(notifications.read, false),
        ),
      );
    return ok({ count: rows.length });
  } finally {
    await pool.end();
  }
});
