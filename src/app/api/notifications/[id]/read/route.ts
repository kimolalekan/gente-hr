import { and, eq } from "drizzle-orm";
import { ApiError, getDb, ok, requireUser, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

/** PATCH /api/notifications/[id]/read — mark one own notification read. */
export const PATCH = route(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");

    const { db, pool } = await getDb();
    const { notifications } = await import("@db/schema");
    try {
      const rows = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.id, id),
            eq(notifications.userId, user.id),
            eq(notifications.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!rows[0]) throw new ApiError(404, "Notification not found");

      const [updated] = await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, id))
        .returning();
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);
