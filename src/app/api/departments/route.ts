import { and, asc, eq, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asBool,
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

/** GET /api/departments — list with search, active filter, pagination. */
export const GET = route(async (request: Request) => {
  const user = await requireRole(["admin", "hr"]);
  const url = new URL(request.url);
  const q = asString(url.searchParams.get("q")).trim();
  const activeParam = url.searchParams.get("active");
  const page = asInt(url.searchParams.get("page"), 1);
  const pageSize = asInt(url.searchParams.get("pageSize"), 20);

  const { db, pool } = await getDb();
  const { departments, employees } = await import("@db/schema");
  try {
    const conditions: (SQL | undefined)[] = [
      eq(departments.tenantId, user.tenantId),
    ];
    if (q) {
      conditions.push(
        or(
          ilike(departments.name, `%${q}%`),
          ilike(departments.description, `%${q}%`),
        ),
      );
    }
    if (activeParam !== null) {
      conditions.push(eq(departments.active, asBool(activeParam)));
    }

    const rows = await db
      .select()
      .from(departments)
      .where(and(...conditions))
      .orderBy(asc(departments.name));

    // Employee headcount per department name (employees reference by name).
    const employeeRows = await db
      .select({ department: employees.department })
      .from(employees)
      .where(eq(employees.tenantId, user.tenantId));
    const counts = new Map<string, number>();
    for (const e of employeeRows) {
      if (e.department)
        counts.set(e.department, (counts.get(e.department) ?? 0) + 1);
    }

    const items = rows.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      active: d.active,
      employees: counts.get(d.name) ?? 0,
    }));
    return ok(paginate(items, page, pageSize));
  } finally {
    await pool.end();
  }
});

/** POST /api/departments — create (409 on duplicate name, case-insensitive). */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin"]);
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const name = asString(body.name).trim();
  if (!name) throw new ApiError(400, "Department name is required");

  const { db, pool } = await getDb();
  const { departments } = await import("@db/schema");
  try {
    const existing = await db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(eq(departments.tenantId, user.tenantId));
    if (existing.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError(409, "A department with this name already exists");
    }

    const [created] = await db
      .insert(departments)
      .values({
        tenantId: user.tenantId,
        name,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : null,
      })
      .returning();

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "department.create",
      target: name,
      category: "settings",
    });
    return ok({ ...created, employees: 0 });
  } finally {
    await pool.end();
  }
});
