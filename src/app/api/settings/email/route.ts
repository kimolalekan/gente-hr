import { eq } from "drizzle-orm";
import {
  ApiError,
  addAudit,
  asBool,
  asInt,
  asString,
  getDb,
  ok,
  parseJson,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDERS = ["resend", "zeptomail", "mailgun", "brevo", "console"];
const DEFAULT_SENDER_NAME = "Gente HR";
const DEFAULT_SENDER_EMAIL = "noreply@gente.dev";
const DEFAULT_BATCH_LIMIT = 200;

function maskCredentials(credentials: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    out[key] =
      typeof value === "string" && value.length > 4
        ? `••••••${value.slice(-4)}`
        : "••••••";
  }
  return out;
}

function emailShape(row: {
  provider: string;
  credentials: Record<string, string> | null;
  senderName: string;
  senderEmail: string;
  replyTo: string | null;
  tracking: boolean;
  batchLimit: number;
}) {
  return {
    provider: row.provider,
    credentials: maskCredentials(row.credentials ?? {}),
    senderName: row.senderName,
    senderEmail: row.senderEmail,
    replyTo: row.replyTo ?? null,
    tracking: row.tracking,
    batchLimit: row.batchLimit,
  };
}

/** Email provider settings (admin) — credentials returned masked. */
export const GET = route(async () => {
  const user = await requireRole(["admin"]);
  const { db, pool } = await getDb();
  try {
    const { emailSettings } = await import("@db/schema");
    let [row] = await db
      .select()
      .from(emailSettings)
      .where(eq(emailSettings.tenantId, user.tenantId))
      .limit(1);
    if (!row) {
      [row] = await db
        .insert(emailSettings)
        .values({
          tenantId: user.tenantId,
          provider: "console",
          senderName: DEFAULT_SENDER_NAME,
          senderEmail: DEFAULT_SENDER_EMAIL,
          tracking: false,
          batchLimit: DEFAULT_BATCH_LIMIT,
        })
        .returning();
    }
    return ok(emailShape(row));
  } finally {
    await pool.end();
  }
});

/** Save email provider + config (admin) — upsert, merging credentials. */
export const PUT = route(async (request: Request) => {
  const user = await requireRole(["admin"]);
  const body = await parseJson(request);
  if (!body) throw new ApiError(400, "Invalid request body");

  const { db, pool } = await getDb();
  try {
    const { emailSettings } = await import("@db/schema");
    const [existing] = await db
      .select()
      .from(emailSettings)
      .where(eq(emailSettings.tenantId, user.tenantId))
      .limit(1);

    const provider =
      body.provider !== undefined
        ? asString(body.provider).trim()
        : existing?.provider ?? "console";
    if (!PROVIDERS.includes(provider)) {
      throw new ApiError(422, "Invalid email provider");
    }

    const credentials: Record<string, string> = {
      ...(existing?.credentials ?? {}),
    };
    if (body.credentials !== undefined && body.credentials !== null) {
      if (typeof body.credentials !== "object" || Array.isArray(body.credentials)) {
        throw new ApiError(422, "credentials must be an object");
      }
      for (const [key, value] of Object.entries(body.credentials)) {
        if (typeof value === "string" && value.trim() !== "") {
          credentials[key] = value.trim();
        }
      }
    }

    const values = {
      tenantId: user.tenantId,
      provider,
      credentials,
      senderName:
        body.senderName !== undefined
          ? asString(body.senderName).trim() || DEFAULT_SENDER_NAME
          : existing?.senderName ?? DEFAULT_SENDER_NAME,
      senderEmail:
        body.senderEmail !== undefined
          ? asString(body.senderEmail).trim() || DEFAULT_SENDER_EMAIL
          : existing?.senderEmail ?? DEFAULT_SENDER_EMAIL,
      replyTo:
        body.replyTo !== undefined
          ? asString(body.replyTo).trim() || null
          : existing?.replyTo ?? null,
      tracking:
        body.tracking !== undefined
          ? asBool(body.tracking)
          : existing?.tracking ?? false,
      batchLimit:
        body.batchLimit !== undefined
          ? asInt(body.batchLimit, DEFAULT_BATCH_LIMIT)
          : existing?.batchLimit ?? DEFAULT_BATCH_LIMIT,
    };

    const [row] = await db
      .insert(emailSettings)
      .values(values)
      .onConflictDoUpdate({
        target: emailSettings.tenantId,
        set: {
          provider: values.provider,
          credentials: values.credentials,
          senderName: values.senderName,
          senderEmail: values.senderEmail,
          replyTo: values.replyTo,
          tracking: values.tracking,
          batchLimit: values.batchLimit,
          updatedAt: new Date(),
        },
      })
      .returning();

    await addAudit({
      tenantId: user.tenantId,
      userId: user.id,
      actorName: user.name,
      action: "settings.email",
      category: "settings",
    });
    return ok(emailShape(row));
  } finally {
    await pool.end();
  }
});
