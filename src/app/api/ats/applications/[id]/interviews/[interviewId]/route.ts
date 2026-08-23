import { and, eq } from "drizzle-orm";
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
const STATUSES = ["scheduled", "completed", "cancelled"];

/** PATCH /api/ats/applications/[id]/interviews/[interviewId] — feedback/status. */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string; interviewId: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id, interviewId } = await params;
    if (!UUID_RE.test(id) || !UUID_RE.test(interviewId)) {
      throw new ApiError(404, "Not found");
    }
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const { db, pool } = await getDb();
    const { interviews } = await import("@db/schema");
    try {
      const [interview] = await db
        .select()
        .from(interviews)
        .where(
          and(
            eq(interviews.id, interviewId),
            eq(interviews.tenantId, user.tenantId),
            eq(interviews.applicationId, id),
          ),
        )
        .limit(1);
      if (!interview) throw new ApiError(404, "Interview not found");

      const set: Partial<typeof interviews.$inferInsert> = {};
      if (body.status !== undefined) {
        const status = asString(body.status).trim();
        if (!STATUSES.includes(status)) {
          throw new ApiError(400, "Invalid interview status");
        }
        set.status = status;
      }
      if (body.interviewer !== undefined) {
        set.interviewer = asString(body.interviewer).trim() || null;
      }
      if (body.feedback !== undefined) {
        set.feedback = asString(body.feedback).trim() || null;
      }
      if (body.scheduledAt !== undefined) {
        const scheduledAt = new Date(asString(body.scheduledAt));
        if (Number.isNaN(scheduledAt.getTime())) {
          throw new ApiError(400, "Invalid scheduled date/time");
        }
        set.scheduledAt = scheduledAt;
      }

      if (Object.keys(set).length === 0) {
        throw new ApiError(400, "Nothing to update");
      }

      const [updated] = await db
        .update(interviews)
        .set(set)
        .where(eq(interviews.id, interviewId))
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "ats.interview.update",
        target: `round ${updated.round}`,
        category: "settings",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);
