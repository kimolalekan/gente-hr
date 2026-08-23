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

/** POST /api/ats/applications/[id]/reject — mark the application rejected. */
export const POST = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const { db, pool } = await getDb();
    const { applications, applicationStages } = await import("@db/schema");
    try {
      const [app] = await db
        .select()
        .from(applications)
        .where(
          and(eq(applications.id, id), eq(applications.tenantId, user.tenantId)),
        )
        .limit(1);
      if (!app) throw new ApiError(404, "Application not found");
      if (app.stage === "hired" || app.stage === "rejected") {
        throw new ApiError(409, `Application is already ${app.stage}`);
      }

      await db
        .update(applications)
        .set({ stage: "rejected", updatedAt: new Date() })
        .where(eq(applications.id, id));

      const [history] = await db
        .insert(applicationStages)
        .values({
          tenantId: user.tenantId,
          applicationId: id,
          fromStage: app.stage,
          toStage: "rejected",
          note: asString(body.note).trim() || null,
          actorName: user.name,
        })
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "ats.reject",
        target: app.name,
        category: "settings",
      });

      return ok({ ...history, stage: "rejected" });
    } finally {
      await pool.end();
    }
  },
);
