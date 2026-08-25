import { and, asc, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
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
import { parseQuizQuestions } from "@/lib/server/ats-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/ats/quizzes — list screening quizzes (admin, hr). */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const url = new URL(request.url);
  const q = asString(url.searchParams.get("q")).trim();

  const { db, pool } = await getDb();
  const { quizzes, jobs } = await import("@db/schema");
  try {
    const conditions: (SQL | undefined)[] = [
      eq(quizzes.tenantId, user.tenantId),
    ];
    if (q) {
      conditions.push(
        or(ilike(quizzes.name, `%${q}%`), ilike(quizzes.description, `%${q}%`)),
      );
    }

    const rows = await db
      .select()
      .from(quizzes)
      .where(and(...conditions))
      .orderBy(asc(quizzes.name));

    // Jobs using each quiz (for delete protection / display).
    const jobRows = await db
      .select({ quizId: jobs.quizId })
      .from(jobs)
      .where(eq(jobs.tenantId, user.tenantId));
    const usedBy = new Map<string, number>();
    for (const row of jobRows) {
      if (row.quizId) usedBy.set(row.quizId, (usedBy.get(row.quizId) ?? 0) + 1);
    }

    return ok(
      rows.map((quiz) => ({
        id: quiz.id,
        name: quiz.name,
        description: quiz.description,
        questions: quiz.questions,
        active: quiz.active,
        usedBy: usedBy.get(quiz.id) ?? 0,
        createdAt: quiz.createdAt,
      })),
    );
  } finally {
    await pool.end();
  }
});

/** POST /api/ats/quizzes — create a screening quiz (admin, hr). */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const name = asString(body.name).trim();
  if (!name) throw new ApiError(400, "Quiz name is required");
  const questions = parseQuizQuestions(body.questions);

  const { db, pool } = await getDb();
  const { quizzes } = await import("@db/schema");
  try {
    const [created] = await db
      .insert(quizzes)
      .values({
        tenantId: user.tenantId,
        name,
        description: asString(body.description).trim() || null,
        questions,
        active: body.active === false ? false : true,
      })
      .returning();

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "ats.quiz.create",
      target: created.name,
      category: "settings",
    });
    return ok({ ...created, usedBy: 0 }, { status: 201 });
  } finally {
    await pool.end();
  }
});
