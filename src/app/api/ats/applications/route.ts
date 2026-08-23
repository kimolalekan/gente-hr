import { and, desc, eq } from "drizzle-orm";
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

const STAGES = [
  "new",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
];

/** GET /api/ats/applications — list with job/stage filters, newest first. */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const url = new URL(request.url);
  const jobId = asString(url.searchParams.get("jobId")).trim();
  const stage = asString(url.searchParams.get("stage")).trim();
  const page = asInt(url.searchParams.get("page"), 1);
  const pageSize = asInt(url.searchParams.get("pageSize"), 20);

  const { db, pool } = await getDb();
  const { applications, jobs } = await import("@db/schema");
  try {
    const conditions: (SQL | undefined)[] = [
      eq(applications.tenantId, user.tenantId),
    ];
    if (jobId) conditions.push(eq(applications.jobId, jobId));
    if (stage && STAGES.includes(stage)) {
      conditions.push(eq(applications.stage, stage));
    }

    const rows = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        jobTitle: jobs.title,
        name: applications.name,
        email: applications.email,
        phone: applications.phone,
        resumeUrl: applications.resumeUrl,
        coverLetter: applications.coverLetter,
        stage: applications.stage,
        notes: applications.notes,
        createdAt: applications.createdAt,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(...conditions))
      .orderBy(desc(applications.createdAt));

    return ok(paginate(rows, page, pageSize));
  } finally {
    await pool.end();
  }
});

/** POST /api/ats/applications — add a candidate manually (admin, hr). */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const jobId = asString(body.jobId);
  if (!jobId) throw new ApiError(400, "jobId is required");
  const name = asString(body.name).trim();
  if (!name) throw new ApiError(400, "Candidate name is required");
  const email = asString(body.email).trim().toLowerCase();
  if (!email) throw new ApiError(400, "Candidate email is required");

  const { db, pool } = await getDb();
  const { jobs, applications } = await import("@db/schema");
  try {
    const [job] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.tenantId, user.tenantId)))
      .limit(1);
    if (!job) throw new ApiError(404, "Job not found");

    const dup = await db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.jobId, jobId),
          eq(applications.email, email),
          eq(applications.tenantId, user.tenantId),
        ),
      )
      .limit(1);
    if (dup[0]) {
      throw new ApiError(409, "A candidate with this email already applied");
    }

    const [created] = await db
      .insert(applications)
      .values({
        tenantId: user.tenantId,
        jobId,
        name,
        email,
        phone: asString(body.phone).trim() || null,
        resumeUrl: asString(body.resumeUrl).trim() || null,
        coverLetter: asString(body.coverLetter).trim() || null,
        stage: asString(body.stage).trim() || "new",
      })
      .returning();

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "ats.application.create",
      target: name,
      category: "settings",
    });

    return ok(created, { status: 201 });
  } finally {
    await pool.end();
  }
});
