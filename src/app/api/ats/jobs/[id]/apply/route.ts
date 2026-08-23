import { and, eq } from "drizzle-orm";
import { ApiError, getDb, ok, parseJson, route } from "@/lib/server/api";

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
    const { jobs } = await import("@db/schema");
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
          status: jobs.status,
        })
        .from(jobs)
        .where(eq(jobs.id, id))
        .limit(1);
      if (!job) throw new ApiError(404, "Job not found");
      if (job.status !== "open") {
        throw new ApiError(409, "This job is no longer accepting applications");
      }
      return ok(job);
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
    const { jobs, applications } = await import("@db/schema");
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
          resumeUrl:
            typeof body.resumeUrl === "string" && body.resumeUrl.trim()
              ? body.resumeUrl.trim()
              : null,
          coverLetter:
            typeof body.coverLetter === "string" && body.coverLetter.trim()
              ? body.coverLetter.trim()
              : null,
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
