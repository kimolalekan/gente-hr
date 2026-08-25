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

const JOB_STATUSES = ["draft", "open", "closed"];
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"];

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

function toIntOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

async function resolveJob(tenantId: string, id: string) {
  const { db, pool } = await getDb();
  const { jobs } = await import("@db/schema");
  try {
    const rows = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.tenantId, tenantId)))
      .limit(1);
    const job = rows[0];
    if (!job) throw new ApiError(404, "Job not found");
    return job;
  } finally {
    await pool.end();
  }
}

/** GET /api/ats/jobs/[id] — job detail + stage counts for its applications. */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    const job = await resolveJob(user.tenantId, id);

    const { db, pool } = await getDb();
    const { applications, quizzes } = await import("@db/schema");
    try {
      const [quiz] = job.quizId
        ? await db
            .select({ name: quizzes.name })
            .from(quizzes)
            .where(eq(quizzes.id, job.quizId))
            .limit(1)
        : [];
      const rows = await db
        .select({ stage: applications.stage })
        .from(applications)
        .where(
          and(
            eq(applications.tenantId, user.tenantId),
            eq(applications.jobId, id),
          ),
        );
      const byStage = new Map<string, number>();
      for (const row of rows) {
        byStage.set(row.stage, (byStage.get(row.stage) ?? 0) + 1);
      }
      return ok({
        id: job.id,
        title: job.title,
        department: job.department,
        location: job.location,
        employmentType: job.employmentType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        description: job.description,
        questions: job.questions,
        quizId: job.quizId,
        quizName: quiz?.name ?? null,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        applications: rows.length,
        stageCounts: Object.fromEntries(byStage),
      });
    } finally {
      await pool.end();
    }
  },
);

/** PATCH /api/ats/jobs/[id] — update job posting (admin, hr). */
export const PATCH = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    await resolveJob(user.tenantId, id);

    const { db, pool } = await getDb();
    const { jobs, quizzes } = await import("@db/schema");
    try {
      const set: Partial<typeof jobs.$inferInsert> = {};
      if (body.title !== undefined) {
        const title = asString(body.title).trim();
        if (!title) throw new ApiError(400, "Job title is required");
        set.title = title;
      }
      if (body.department !== undefined)
        set.department = asString(body.department).trim() || null;
      if (body.location !== undefined)
        set.location = asString(body.location).trim() || null;
      if (body.employmentType !== undefined) {
        const employmentType = asString(body.employmentType).trim();
        if (!EMPLOYMENT_TYPES.includes(employmentType)) {
          throw new ApiError(400, "Invalid employment type");
        }
        set.employmentType = employmentType;
      }
      if (body.salaryMin !== undefined)
        set.salaryMin = toIntOrNull(body.salaryMin);
      if (body.salaryMax !== undefined)
        set.salaryMax = toIntOrNull(body.salaryMax);
      if (body.description !== undefined)
        set.description = asString(body.description).trim() || null;
      if (body.questions !== undefined) {
        set.questions = Array.isArray(body.questions)
          ? body.questions
              .map((q) => asString(q).trim())
              .filter((q) => q.length > 0)
          : [];
      }
      if (body.quizId !== undefined) {
        if (body.quizId === null) {
          set.quizId = null;
        } else {
          const quizId = asString(body.quizId);
          if (!UUID_RE.test(quizId)) throw new ApiError(400, "Invalid quiz");
          const quiz = await db
            .select({ id: quizzes.id })
            .from(quizzes)
            .where(
              and(eq(quizzes.id, quizId), eq(quizzes.tenantId, user.tenantId)),
            )
            .limit(1);
          if (!quiz[0]) {
            throw new ApiError(400, "Quiz not found in this organization");
          }
          set.quizId = quizId;
        }
      }
      if (body.status !== undefined) {
        const status = asString(body.status).trim();
        if (!JOB_STATUSES.includes(status)) {
          throw new ApiError(400, "Invalid job status");
        }
        set.status = status;
      }

      if (Object.keys(set).length === 0) {
        throw new ApiError(400, "Nothing to update");
      }

      const [updated] = await db
        .update(jobs)
        .set({ ...set, updatedAt: new Date() })
        .where(and(eq(jobs.id, id), eq(jobs.tenantId, user.tenantId)))
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "ats.job.update",
        target: updated.title,
        category: "settings",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);

/** DELETE /api/ats/jobs/[id] — delete a job posting (admin only). */
export const DELETE = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    await resolveJob(user.tenantId, id);

    const { db, pool } = await getDb();
    const { jobs } = await import("@db/schema");
    try {
      await db
        .delete(jobs)
        .where(and(eq(jobs.id, id), eq(jobs.tenantId, user.tenantId)));
      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "ats.job.delete",
        target: id,
        category: "settings",
      });
      return ok({ id });
    } finally {
      await pool.end();
    }
  },
);
