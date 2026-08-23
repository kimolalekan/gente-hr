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

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;
const DOCUMENT_STATUSES = ["verified", "pending", "expired"];

/** PATCH /api/employees/[id]/documents/[docId] — verify / mark expired. */
export const PATCH = route(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string; docId: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id, docId } = await params;
    if (!UUID_RE.test(id) || !UUID_RE.test(docId)) {
      throw new ApiError(404, "Not found");
    }

    const body = await parseJson(request);
    if (!body) throw new ApiError(400, "Invalid request body");

    const status = asString(body.status).trim();
    if (!DOCUMENT_STATUSES.includes(status)) {
      throw new ApiError(400, "Invalid document status");
    }

    const { db, pool } = await getDb();
    const { employeeDocuments } = await import("@db/schema");
    try {
      const rows = await db
        .select()
        .from(employeeDocuments)
        .where(
          and(
            eq(employeeDocuments.tenantId, user.tenantId),
            eq(employeeDocuments.employeeId, id),
            eq(employeeDocuments.id, docId),
          ),
        )
        .limit(1);
      if (!rows[0]) throw new ApiError(404, "Document not found");

      const [updated] = await db
        .update(employeeDocuments)
        .set({ status })
        .where(eq(employeeDocuments.id, docId))
        .returning();

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "employee.document.status",
        target: updated.name,
        category: "employee",
      });
      return ok(updated);
    } finally {
      await pool.end();
    }
  },
);

/** DELETE /api/employees/[id]/documents/[docId] — remove a document. */
export const DELETE = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string; docId: string }> },
  ) => {
    const user = await requireRole(["admin", "hr"]);
    const { id, docId } = await params;
    if (!UUID_RE.test(id) || !UUID_RE.test(docId)) {
      throw new ApiError(404, "Not found");
    }

    const { db, pool } = await getDb();
    const { employeeDocuments } = await import("@db/schema");
    try {
      const rows = await db
        .select()
        .from(employeeDocuments)
        .where(
          and(
            eq(employeeDocuments.tenantId, user.tenantId),
            eq(employeeDocuments.employeeId, id),
            eq(employeeDocuments.id, docId),
          ),
        )
        .limit(1);
      const doc = rows[0];
      if (!doc) throw new ApiError(404, "Document not found");

      await db.delete(employeeDocuments).where(eq(employeeDocuments.id, docId));

      await addAudit({
        tenantId: user.tenantId,
        userId: user.id,
        actorName: user.name,
        action: "employee.document.delete",
        target: doc.name,
        category: "employee",
      });
      return ok({ deleted: true });
    } finally {
      await pool.end();
    }
  },
);
