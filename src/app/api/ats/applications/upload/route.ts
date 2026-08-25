import { eq } from "drizzle-orm";
import { ApiError, getDb, ok, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-fA-F-]{8,}$/;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "text/plain",
  "image/png",
  "image/jpeg",
];

/**
 * POST /api/ats/applications/upload — public resume upload for the apply flow
 * (no auth). The tenant is resolved from the job, and the file is stored in
 * the tenant's `files` table (demo storage); the returned `/api/files/[id]`
 * URL is saved on the application. Downloads stay authenticated (HR/admin).
 */
export const POST = route(async (request: Request) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, "Invalid multipart form");
  }

  const jobIdRaw = form.get("jobId");
  const jobId = typeof jobIdRaw === "string" ? jobIdRaw : "";
  if (!UUID_RE.test(jobId)) throw new ApiError(400, "Invalid job");

  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "A resume file is required");
  if (file.size === 0) throw new ApiError(400, "The file is empty");
  if (file.size > MAX_BYTES) {
    throw new ApiError(413, "File is too large — maximum 5MB");
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new ApiError(415, "Unsupported file type — use PDF, DOC/DOCX, TXT or an image");
  }

  const { db, pool } = await getDb();
  const { jobs, files } = await import("@db/schema");
  try {
    const [job] = await db
      .select({ tenantId: jobs.tenantId })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    if (!job) throw new ApiError(404, "Job not found");

    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const [row] = await db
      .insert(files)
      .values({
        tenantId: job.tenantId,
        uploadedBy: null,
        name: file.name,
        mime: file.type,
        size: file.size,
        kind: "document",
        data,
      })
      .returning({ id: files.id, name: files.name, size: files.size });

    return ok(
      { url: `/api/files/${row.id}`, name: row.name, size: row.size },
      { status: 201 },
    );
  } finally {
    await pool.end();
  }
});
