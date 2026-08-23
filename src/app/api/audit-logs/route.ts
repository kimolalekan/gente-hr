import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import {
  asInt,
  asString,
  getDb,
  ok,
  paginate,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Categories HR users are allowed to see (admin sees everything). */
const HR_CATEGORIES = [
  "employee",
  "leave",
  "onboarding",
  "offboarding",
  "attendance",
  "performance",
  "payroll",
];

/**
 * Audit trail (admin: all categories; hr: HR-action categories only).
 * Filters: ?category=, ?actor= (actorName substring), paginated newest first.
 */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const { db, pool } = await getDb();
  try {
    const { auditLogs } = await import("@db/schema");
    const url = new URL(request.url);
    const category = asString(url.searchParams.get("category"));
    const actor = asString(url.searchParams.get("actor"));
    const page = asInt(url.searchParams.get("page"), 1);
    const pageSize = asInt(url.searchParams.get("pageSize"), 20);

    const conditions = [eq(auditLogs.tenantId, user.tenantId)];
    if (user.role === "hr") {
      conditions.push(inArray(auditLogs.category, HR_CATEGORIES));
    }
    if (category) conditions.push(eq(auditLogs.category, category));
    if (actor) conditions.push(ilike(auditLogs.actorName, `%${actor}%`));

    const rows = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt));
    return ok(paginate(rows, page, pageSize));
  } finally {
    await pool.end();
  }
});
