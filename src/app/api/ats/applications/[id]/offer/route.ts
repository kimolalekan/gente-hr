import { and, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asDate,
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

function toIntOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/** POST /api/ats/applications/[id]/offer — record an offer to the candidate. */
export const POST = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const { db, pool } = await getDb();
    const { applications, offers, applicationStages } = await import(
      "@db/schema"
    );
    try {
      const [app] = await db
        .select()
        .from(applications)
        .where(
          and(eq(applications.id, id), eq(applications.tenantId, user.tenantId)),
        )
        .limit(1);
      if (!app) throw new ApiError(404, "Application not found");

      const [offer] = await db
        .insert(offers)
        .values({
          tenantId: user.tenantId,
          applicationId: id,
          salary: toIntOrNull(body.salary),
          startDate: asDate(body.startDate),
          terms: asString(body.terms).trim() || null,
          status: "sent",
        })
        .returning();

      // Sending an offer moves the candidate to the offer stage.
      if (app.stage !== "offer") {
        await db
          .update(applications)
          .set({ stage: "offer", updatedAt: new Date() })
          .where(eq(applications.id, id));
        await db.insert(applicationStages).values({
          tenantId: user.tenantId,
          applicationId: id,
          fromStage: app.stage,
          toStage: "offer",
          note: "Offer sent",
          actorName: user.name,
        });
      }

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "ats.offer.send",
        target: app.name,
        category: "settings",
      });

      return ok(offer, { status: 201 });
    } finally {
      await pool.end();
    }
  },
);
