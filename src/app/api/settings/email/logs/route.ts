import { desc, eq } from "drizzle-orm";
import { asInt, getDb, ok, paginate, requireRole, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Email delivery log (admin), newest first, paginated. */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin"]);
  const { db, pool } = await getDb();
  try {
    const { emailLogs } = await import("@db/schema");
    const url = new URL(request.url);
    const page = asInt(url.searchParams.get("page"), 1);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20);
    const rows = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.tenantId, user.tenantId))
      .orderBy(desc(emailLogs.createdAt));
    return ok(paginate(rows, page, pageSize));
  } finally {
    await pool.end();
  }
});
