import { desc, eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asString,
  getDb,
  ok,
  parseJson,
  requireRole,
  requireUser,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Validate + normalize `sections: [{ name, questions: string[] }]`. */
function normalizeSections(
  value: unknown,
): Array<{ name: string; questions: string[] }> {
  if (!Array.isArray(value)) {
    throw new ApiError(422, "sections must be an array");
  }
  return value.map((sec, index) => {
    if (!sec || typeof sec !== "object" || Array.isArray(sec)) {
      throw new ApiError(422, `Invalid section at index ${index}`);
    }
    const section = sec as Record<string, unknown>;
    const name = asString(section.name).trim();
    if (!name) throw new ApiError(422, `Section ${index + 1} needs a name`);
    if (!Array.isArray(section.questions)) {
      throw new ApiError(422, `Section "${name}" questions must be an array`);
    }
    const questions = section.questions
      .map((q) => asString(q).trim())
      .filter(Boolean);
    return { name, questions };
  });
}

/** List performance templates (admin, hr; members can view). */
export const GET = route(async () => {
  const user = await requireUser();
  const { db, pool } = await getDb();
  try {
    const { performanceTemplates } = await import("@db/schema");
    const rows = await db
      .select()
      .from(performanceTemplates)
      .where(eq(performanceTemplates.tenantId, user.tenantId))
      .orderBy(desc(performanceTemplates.createdAt));
    return ok(rows);
  } finally {
    await pool.end();
  }
});

/** Create a template with sections and questions (admin, hr). */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const name = asString(body.name).trim();
  if (!name) throw new ApiError(422, "Template name is required");
  const description = asString(body.description).trim() || null;
  const sections = normalizeSections(body.sections);

  const { db, pool } = await getDb();
  try {
    const { performanceTemplates } = await import("@db/schema");
    const [template] = await db
      .insert(performanceTemplates)
      .values({
        tenantId: user.tenantId,
        name,
        description,
        sections,
        active: true,
      })
      .returning();

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "performance.template.create",
      target: template.id,
      category: "performance",
    });
    return ok(template, { status: 201 });
  } finally {
    await pool.end();
  }
});
