import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asInt,
  asString,
  getDb,
  ok,
  paginate,
  parseJson,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JOB_STATUSES = ["draft", "open", "closed"];
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"];

function toIntOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/** GET /api/ats/jobs — list jobs with application counts, searchable. */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const url = new URL(request.url);
  const q = asString(url.searchParams.get("q")).trim();
  const status = asString(url.searchParams.get("status")).trim();
  const page = asInt(url.searchParams.get("page"), 1);
  const pageSize = asInt(url.searchParams.get("pageSize"), 20);

  const { db, pool } = await getDb();
  const { jobs, applications } = await import("@db/schema");
  try {
    const conditions: (SQL | undefined)[] = [eq(jobs.tenantId, user.tenantId)];
    if (q) {
      conditions.push(
        or(
          ilike(jobs.title, `%${q}%`),
          ilike(jobs.department, `%${q}%`),
          ilike(jobs.location, `%${q}%`),
        ),
      );
    }
    if (status && JOB_STATUSES.includes(status)) {
      conditions.push(eq(jobs.status, status));
    }

    const rows = await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.createdAt));

    // Application count per job (active pipeline stages only).
    const appRows = await db
      .select({ jobId: applications.jobId })
      .from(applications)
      .where(eq(applications.tenantId, user.tenantId));
    const counts = new Map<string, number>();
    for (const app of appRows) {
      if (app.jobId) counts.set(app.jobId, (counts.get(app.jobId) ?? 0) + 1);
    }

    const items = rows.map((job) => ({
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      description: job.description,
      status: job.status,
      applications: counts.get(job.id) ?? 0,
      createdAt: job.createdAt,
    }));
    return ok(paginate(items, page, pageSize));
  } finally {
    await pool.end();
  }
});

/** POST /api/ats/jobs — create a job posting (admin, hr). */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const title = asString(body.title).trim();
  if (!title) throw new ApiError(400, "Job title is required");

  const employmentType = asString(body.employmentType).trim() || "full_time";
  if (!EMPLOYMENT_TYPES.includes(employmentType)) {
    throw new ApiError(400, "Invalid employment type");
  }
  const status = asString(body.status).trim() || "draft";
  if (!JOB_STATUSES.includes(status)) {
    throw new ApiError(400, "Invalid job status");
  }

  const { db, pool } = await getDb();
  const { jobs } = await import("@db/schema");
  try {
    const [created] = await db
      .insert(jobs)
      .values({
        tenantId: user.tenantId,
        title,
        department: asString(body.department).trim() || null,
        location: asString(body.location).trim() || null,
        employmentType,
        salaryMin: toIntOrNull(body.salaryMin),
        salaryMax: toIntOrNull(body.salaryMax),
        description: asString(body.description).trim() || null,
        status,
      })
      .returning();

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "ats.job.create",
      target: created.title,
      category: "settings",
    });

    return ok(
      {
        ...created,
        applications: 0,
      },
      { status: 201 },
    );
  } finally {
    await pool.end();
  }
});
