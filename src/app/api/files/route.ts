import { ApiError, getDb, ok, requireUser, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["document", "photo", "letter"];

/** POST /api/files — multipart upload, stored as base64 in the files table. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, "Invalid multipart form");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ApiError(400, "A file is required");
  }

  const kindRaw = form.get("kind");
  const kind = typeof kindRaw === "string" && kindRaw ? kindRaw : "document";
  if (!KINDS.includes(kind)) {
    throw new ApiError(400, "Invalid file kind");
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");

  const { db, pool } = await getDb();
  const { files } = await import("@db/schema");
  try {
    const [row] = await db
      .insert(files)
      .values({
        tenantId: user.tenantId,
        uploadedBy: user.id,
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        kind,
        data,
      })
      .returning();
    return ok({
      fileId: row.id,
      url: `/api/files/${row.id}`,
      name: row.name,
      size: row.size,
      mime: row.mime,
    });
  } finally {
    await pool.end();
  }
});
