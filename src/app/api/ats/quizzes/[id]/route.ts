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
import { parseQuizQuestions } from "@/lib/server/ats-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;

async function resolveQuiz(tenantId: string, id: string) {
  const { db, pool } = await getDb();
  const { quizzes } = await import("@db/schema");
  try {
    const rows = await db
      .select()
      .from(quizzes)
      .where(and(eq(quizzes.id, id), eq(quizzes.tenantId, tenantId)))
      .limit(1);
    const quiz = rows[0];
    if (!quiz) throw new ApiError(404, "Quiz not found");
    return quiz;
  } finally {
    await pool.end();
  }
}

/** GET /api/ats/quizzes/[id] — quiz detail (admin, hr). */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    const quiz = await resolveQuiz(user.tenantId, id);
    return ok(quiz);
  },
);

/** PATCH /api/ats/quizzes/[id] — update quiz (admin, hr). */
export const PATCH = route(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireRole(["admin", "hr"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    await resolveQuiz(user.tenantId, id);

    const { db, pool } = await getDb();
    const { quizzes } = await import("@db/schema");
    try {
      const set: Partial<typeof quizzes.$inferInsert> = {};
      if (body.name !== undefined) {
        const name = asString(body.name).trim();
        if (!name) throw new ApiError(400, "Quiz name is required");
        set.name = name;
      }
      if (body.description !== undefined)
        set.description = asString(body.description).trim() || null;
      if (body.questions !== undefined)
        set.questions = parseQuizQuestions(body.questions);
      if (body.active !== undefined)
        set.active = body.active === false ? false : true;

      if (Object.keys(set).length === 0) {
        throw new ApiError(400, "Nothing to update");
      }

      const [updated] = await db
        .update(quizzes)
        .set({ ...set, updatedAt: new Date() })
        .where(and(eq(quizzes.id, id), eq(quizzes.tenantId, user.tenantId)))
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "ats.quiz.update",
        target: updated.name,
        category: "settings",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);

/** DELETE /api/ats/quizzes/[id] — delete (admin only; unassigns from jobs). */
export const DELETE = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const user = await requireRole(["admin"]);
    const { id } = await params;
    if (!UUID_RE.test(id)) throw new ApiError(404, "Not found");
    const quiz = await resolveQuiz(user.tenantId, id);

    const { db, pool } = await getDb();
    const { quizzes } = await import("@db/schema");
    try {
      await db
        .delete(quizzes)
        .where(and(eq(quizzes.id, id), eq(quizzes.tenantId, user.tenantId)));
      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "ats.quiz.delete",
        target: quiz.name,
        category: "settings",
      });
      return ok({ id });
    } finally {
      await pool.end();
    }
  },
);
