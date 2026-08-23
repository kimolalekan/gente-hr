import { and, desc, eq } from "drizzle-orm";
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

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

/** POST /api/ats/applications/[id]/interviews — schedule the next round. */
export const POST = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const rawDate = asString(body.scheduledAt);
    const scheduledAt = new Date(rawDate);
    if (!rawDate || Number.isNaN(scheduledAt.getTime())) {
      throw new ApiError(400, "A valid scheduled date/time is required");
    }

    const { db, pool } = await getDb();
    const { applications, interviews } = await import("@db/schema");
    try {
      const [app] = await db
        .select()
        .from(applications)
        .where(
          and(eq(applications.id, id), eq(applications.tenantId, user.tenantId)),
        )
        .limit(1);
      if (!app) throw new ApiError(404, "Application not found");

      const latest = await db
        .select({ round: interviews.round })
        .from(interviews)
        .where(
          and(
            eq(interviews.tenantId, user.tenantId),
            eq(interviews.applicationId, id),
          ),
        )
        .orderBy(desc(interviews.round))
        .limit(1);

      const [created] = await db
        .insert(interviews)
        .values({
          tenantId: user.tenantId,
          applicationId: id,
          round: (latest[0]?.round ?? 0) + 1,
          scheduledAt,
          interviewer: asString(body.interviewer).trim() || null,
          feedback: asString(body.feedback).trim() || null,
          status: "scheduled",
        })
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "ats.interview.schedule",
        target: app.name,
        category: "settings",
      });

      return ok(created, { status: 201 });
    } finally {
      await pool.end();
    }
  },
);
