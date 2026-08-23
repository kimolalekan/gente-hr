import { and, asc, eq } from "drizzle-orm";
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

/** Exit detail with checklist and employee. */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { offboardings, offboardingChecklistItems, employees } =
        await import("@db/schema");
      const [offboarding] = await db
        .select()
        .from(offboardings)
        .where(
          and(
            eq(offboardings.id, id),
            eq(offboardings.tenantId, user.tenantId),
          ),
        )
        .limit(1);
      if (!offboarding) throw new ApiError(404, "Offboarding record not found");

      const checklist = await db
        .select()
        .from(offboardingChecklistItems)
        .where(eq(offboardingChecklistItems.offboardingId, id))
        .orderBy(asc(offboardingChecklistItems.sortOrder));

      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, offboarding.employeeId))
        .limit(1);

      return ok({
        ...offboarding,
        checklist,
        employee: employee ?? null,
      });
    } finally {
      await pool.end();
    }
  },
);

/** Update reason / last working day / notes. */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;

    const { db, pool } = await getDb();
    try {
      const { offboardings } = await import("@db/schema");
      const body = await parseJson(request);

      const set: Partial<typeof offboardings.$inferInsert> = {};
      if (body?.reason !== undefined) set.reason = asString(body.reason);
      if (body?.lastWorkingDay !== undefined) {
        const d = asDate(body.lastWorkingDay);
        if (!d) throw new ApiError(422, "Invalid lastWorkingDay");
        set.lastWorkingDay = d;
      }
      if (body?.notes !== undefined) {
        set.notes = asString(body.notes) || null;
      }
      if (body?.exitInterviewNotes !== undefined) {
        set.exitInterviewNotes = asString(body.exitInterviewNotes) || null;
      }
      if (Object.keys(set).length === 0) {
        throw new ApiError(422, "No fields to update");
      }

      const [offboarding] = await db
        .update(offboardings)
        .set(set)
        .where(
          and(
            eq(offboardings.id, id),
            eq(offboardings.tenantId, user.tenantId),
          ),
        )
        .returning();
      if (!offboarding) throw new ApiError(404, "Offboarding record not found");

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "offboarding.update",
        target: offboarding.id,
        category: "offboarding",
      });

      return ok(offboarding);
    } finally {
      await pool.end();
    }
  },
);
