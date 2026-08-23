import { and, eq } from "drizzle-orm";
import {
  ApiError,
  fail,
  getDb,
  ok,
  requireUser,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

/**
 * GET /api/files/[id] — download. Tenant-scoped; members may only fetch
 * files they uploaded. Returns the raw binary (NOT the JSON envelope), so
 * this handler is written without the route() helper.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!UUID_RE.test(id)) return fail("Not found", 404);

    const { db, pool } = await getDb();
    const { files } = await import("@db/schema");
    let row: typeof files.$inferSelect | undefined;
    try {
      const rows = await db
        .select()
        .from(files)
        .where(and(eq(files.id, id), eq(files.tenantId, user.tenantId)))
        .limit(1);
      row = rows[0];
    } finally {
      await pool.end();
    }

    if (!row) return fail("Not found", 404);
    if (user.role === "member" && row.uploadedBy !== user.id) {
      return fail("You don't have permission to do this", 403);
    }

    return new Response(Buffer.from(row.data ?? "", "base64"), {
      headers: {
        "Content-Type": row.mime,
        "Content-Disposition": `inline; filename="${row.name}"`,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message, error.status);
    console.error("[api]", error);
    return fail("Something went wrong", 500);
  }
}

/** DELETE /api/files/[id] — same scope rules as download. */
export const DELETE = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireUser();
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");

    const { db, pool } = await getDb();
    const { files } = await import("@db/schema");
    try {
      const rows = await db
        .select()
        .from(files)
        .where(and(eq(files.id, id), eq(files.tenantId, user.tenantId)))
        .limit(1);
      const row = rows[0];
      if (!row) throw new ApiError(404, "File not found");
      if (user.role === "member" && row.uploadedBy !== user.id) {
        throw new ApiError(403, "You don't have permission to do this");
      }

      await db.delete(files).where(eq(files.id, id));
      return ok({ deleted: true });
    } finally {
      await pool.end();
    }
  },
);
