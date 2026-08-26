import { and, asc, desc, eq } from "drizzle-orm";
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

async function resolveApplication(tenantId: string, id: string) {
  const { db, pool } = await getDb();
  const { applications } = await import("@db/schema");
  try {
    const rows = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.tenantId, tenantId)))
      .limit(1);
    const app = rows[0];
    if (!app) throw new ApiError(404, "Application not found");
    return app;
  } finally {
    await pool.end();
  }
}

/** GET /api/ats/applications/[id] — full detail + history, interviews, offer. */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    const app = await resolveApplication(user.tenantId, id);

    const { db, pool } = await getDb();
    const { jobs, applicationStages, interviews, offers, employees, quizzes } =
      await import("@db/schema");
    try {
      const [jobRow] = await db
        .select({ title: jobs.title, quizId: jobs.quizId })
        .from(jobs)
        .where(eq(jobs.id, app.jobId))
        .limit(1);
      const [quiz] = jobRow?.quizId
        ? await db
            .select()
            .from(quizzes)
            .where(eq(quizzes.id, jobRow.quizId))
            .limit(1)
        : [];

      const [history, interviewRows, offerRows, employee] = await Promise.all([
        db
          .select()
          .from(applicationStages)
          .where(
            and(
              eq(applicationStages.tenantId, user.tenantId),
              eq(applicationStages.applicationId, id),
            ),
          )
          .orderBy(asc(applicationStages.createdAt)),
        db
          .select()
          .from(interviews)
          .where(
            and(
              eq(interviews.tenantId, user.tenantId),
              eq(interviews.applicationId, id),
            ),
          )
          .orderBy(asc(interviews.round)),
        db
          .select()
          .from(offers)
          .where(
            and(
              eq(offers.tenantId, user.tenantId),
              eq(offers.applicationId, id),
            ),
          )
          .orderBy(desc(offers.createdAt))
          .limit(1),
        app.employeeId
          ? db
              .select({ id: employees.id, name: employees.name })
              .from(employees)
              .where(
                and(
                  eq(employees.id, app.employeeId),
                  eq(employees.tenantId, user.tenantId),
                ),
              )
              .limit(1)
          : Promise.resolve([]),
      ]);

      return ok({
        id: app.id,
        jobId: app.jobId,
        jobTitle: jobRow?.title ?? null,
        name: app.name,
        email: app.email,
        phone: app.phone,
        country: app.country,
        state: app.state,
        resumeUrl: app.resumeUrl,
        coverLetter: app.coverLetter,
        answers: app.answers,
        quizResult: app.quizResult,
        quiz: quiz ?? null,
        stage: app.stage,
        notes: app.notes,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        employee: employee[0] ?? null,
        history: history.map((row) => ({
          id: row.id,
          fromStage: row.fromStage,
          toStage: row.toStage,
          note: row.note,
          actorName: row.actorName,
          createdAt: row.createdAt,
        })),
        interviews: interviewRows.map((row) => ({
          id: row.id,
          round: row.round,
          scheduledAt: row.scheduledAt,
          interviewer: row.interviewer,
          panelists: row.panelists ?? [],
          feedback: row.feedback,
          status: row.status,
          createdAt: row.createdAt,
        })),
        offer: offerRows[0]
          ? {
              id: offerRows[0].id,
              salary: offerRows[0].salary,
              startDate: offerRows[0].startDate,
              terms: offerRows[0].terms,
              status: offerRows[0].status,
              createdAt: offerRows[0].createdAt,
            }
          : null,
      });
    } finally {
      await pool.end();
    }
  },
);

/** PATCH /api/ats/applications/[id] — update candidate/notes (admin, hr). */
export const PATCH = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    await resolveApplication(user.tenantId, id);

    const { db, pool } = await getDb();
    const { applications } = await import("@db/schema");
    try {
      const set: Partial<typeof applications.$inferInsert> = {};
      if (body.name !== undefined) {
        const name = asString(body.name).trim();
        if (!name) throw new ApiError(400, "Candidate name is required");
        set.name = name;
      }
      if (body.phone !== undefined)
        set.phone = asString(body.phone).trim() || null;
      if (body.resumeUrl !== undefined)
        set.resumeUrl = asString(body.resumeUrl).trim() || null;
      if (body.coverLetter !== undefined)
        set.coverLetter = asString(body.coverLetter).trim() || null;
      if (body.notes !== undefined)
        set.notes = asString(body.notes).trim() || null;

      if (Object.keys(set).length === 0) {
        throw new ApiError(400, "Nothing to update");
      }

      const [updated] = await db
        .update(applications)
        .set({ ...set, updatedAt: new Date() })
        .where(
          and(
            eq(applications.id, id),
            eq(applications.tenantId, user.tenantId),
          ),
        )
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "ats.application.update",
        target: updated.name,
        category: "settings",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);

/** DELETE /api/ats/applications/[id] — remove (admin only). */
export const DELETE = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    const app = await resolveApplication(user.tenantId, id);

    const { db, pool } = await getDb();
    const { applications } = await import("@db/schema");
    try {
      await db
        .delete(applications)
        .where(
          and(
            eq(applications.id, id),
            eq(applications.tenantId, user.tenantId),
          ),
        );
      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "ats.application.delete",
        target: app.name,
        category: "settings",
      });
      return ok({ id });
    } finally {
      await pool.end();
    }
  },
);
