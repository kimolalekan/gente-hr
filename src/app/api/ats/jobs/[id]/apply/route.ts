import { and, eq } from "drizzle-orm";
import { ApiError, getDb, ok, parseJson, route } from "@/lib/server/api";
import { quizForCandidate } from "@/lib/server/ats-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

/** GET /api/ats/jobs/[id]/apply — public job info (only for open jobs). */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Job not found");

    const { db, pool } = await getDb();
    const { jobs, tenants, quizzes } = await import("@db/schema");
    try {
      const [job] = await db
        .select({
          title: jobs.title,
          department: jobs.department,
          location: jobs.location,
          employmentType: jobs.employmentType,
          salaryMin: jobs.salaryMin,
          salaryMax: jobs.salaryMax,
          description: jobs.description,
          questions: jobs.questions,
          quizId: jobs.quizId,
          status: jobs.status,
          companyName: tenants.name,
          companySettings: tenants.settings,
        })
        .from(jobs)
        .innerJoin(tenants, eq(jobs.tenantId, tenants.id))
        .where(eq(jobs.id, id))
        .limit(1);
      if (!job) throw new ApiError(404, "Job not found");
      if (job.status !== "open") {
        throw new ApiError(409, "This job is no longer accepting applications");
      }
      // The screening quiz is served to candidates WITHOUT correct answers.
      const [quiz] = job.quizId
        ? await db
            .select()
            .from(quizzes)
            .where(eq(quizzes.id, job.quizId))
            .limit(1)
        : [];
      const settings = job.companySettings ?? {};
      return ok({
        title: job.title,
        department: job.department,
        location: job.location,
        employmentType: job.employmentType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        description: job.description,
        questions: job.questions ?? [],
        quiz: quiz ? quizForCandidate(quiz) : null,
        status: job.status,
        company: {
          name: job.companyName,
          website: typeof settings.website === "string" ? settings.website : "",
          supportEmail:
            typeof settings.supportEmail === "string"
              ? settings.supportEmail
              : "",
          supportPhone:
            typeof settings.supportPhone === "string"
              ? settings.supportPhone
              : "",
          about: typeof settings.about === "string" ? settings.about : "",
        },
      });
    } finally {
      await pool.end();
    }
  },
);

/**
 * POST /api/ats/jobs/[id]/apply — public application form (no auth). Only open
 * jobs accept applications; one application per email per job.
 */
export const POST = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Job not found");
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) throw new ApiError(400, "Your name is required");
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email))
      throw new ApiError(400, "A valid email is required");

    const { db, pool } = await getDb();
    const { jobs, applications, quizzes } = await import("@db/schema");
    try {
      const [job] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, id))
        .limit(1);
      if (!job) throw new ApiError(404, "Job not found");
      if (job.status !== "open") {
        throw new ApiError(409, "This job is no longer accepting applications");
      }

      const dup = await db
        .select({ id: applications.id })
        .from(applications)
        .where(
          and(
            eq(applications.jobId, id),
            eq(applications.email, email),
            eq(applications.tenantId, job.tenantId),
          ),
        )
        .limit(1);
      if (dup[0]) {
        throw new ApiError(
          409,
          "You've already applied for this job — we'll be in touch",
        );
      }

      // Score the screening quiz server-side (candidates never see answers).
      let quizResult: {
        score: number;
        total: number;
        answers: number[];
      } | null = null;
      if (job.quizId) {
        const [quiz] = await db
          .select()
          .from(quizzes)
          .where(eq(quizzes.id, job.quizId))
          .limit(1);
        const chosen = Array.isArray(body.quizAnswers)
          ? body.quizAnswers.map((value) => Number(value))
          : [];
        if (quiz) {
          const total = quiz.questions.length;
          const answers = quiz.questions.map((question, index) =>
            Number.isInteger(chosen[index]) ? chosen[index] : -1,
          );
          const score = quiz.questions.reduce(
            (sum, question, index) =>
              sum + (answers[index] === question.correctIndex ? 1 : 0),
            0,
          );
          quizResult = { score, total, answers };
        }
      }

      const answers: Record<string, string> = {};
      if (
        body.answers &&
        typeof body.answers === "object" &&
        !Array.isArray(body.answers)
      ) {
        for (const [question, value] of Object.entries(
          body.answers as Record<string, unknown>,
        )) {
          if (typeof value === "string" && value.trim()) {
            answers[question] = value.trim();
          }
        }
      }

      const [created] = await db
        .insert(applications)
        .values({
          tenantId: job.tenantId,
          jobId: id,
          name,
          email,
          phone:
            typeof body.phone === "string" && body.phone.trim()
              ? body.phone.trim()
              : null,
          country:
            typeof body.country === "string" && body.country.trim()
              ? body.country.trim()
              : null,
          state:
            typeof body.state === "string" && body.state.trim()
              ? body.state.trim()
              : null,
          resumeUrl:
            typeof body.resumeUrl === "string" && body.resumeUrl.trim()
              ? body.resumeUrl.trim()
              : null,
          coverLetter:
            typeof body.coverLetter === "string" && body.coverLetter.trim()
              ? body.coverLetter.trim()
              : null,
          answers: Object.keys(answers).length > 0 ? answers : null,
          quizResult,
          stage: "new",
        })
        .returning();

      return ok(
        { id: created.id, jobTitle: job.title, stage: created.stage },
        { status: 201 },
      );
    } finally {
      await pool.end();
    }
  },
);
