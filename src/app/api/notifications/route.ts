import { and, desc, eq } from "drizzle-orm";
import {
  asInt,
  getDb,
  ok,
  paginate,
  requireUser,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/notifications — own notifications, newest first, paginated. */
export const GET = route(async (request: Request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const page = asInt(url.searchParams.get("page"), 1);
  const pageSize = asInt(url.searchParams.get("pageSize"), 20);

  const { db, pool } = await getDb();
  const { notifications } = await import("@db/schema");
  try {
    const rows = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          eq(notifications.tenantId, user.tenantId),
        ),
      )
      .orderBy(desc(notifications.createdAt));
    return ok(paginate(rows, page, pageSize));
  } finally {
    await pool.end();
  }
});

/** POST /api/notifications/read-all — mark every own notification read. */
export const POST = route(async () => {
  const user = await requireUser();
  const { db, pool } = await getDb();
  const { notifications } = await import("@db/schema");
  try {
    const unread = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          eq(notifications.tenantId, user.tenantId),
          eq(notifications.read, false),
        ),
      );
    if (unread.length > 0) {
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.userId, user.id),
            eq(notifications.tenantId, user.tenantId),
            eq(notifications.read, false),
          ),
        );
    }
    return ok({ updated: unread.length });
  } finally {
    await pool.end();
  }
});
