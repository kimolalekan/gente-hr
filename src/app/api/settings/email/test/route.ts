import { eq } from "drizzle-orm";
import {
  asString,
  getDb,
  ok,
  parseJson,
  recordEmail,
  requireRole,
  route,
} from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Send a test email through the configured provider (admin). */
export const POST = route(async (request: Request) => {
  const user = await requireRole(["admin"]);
  const body = await parseJson(request);

  const { db, pool } = await getDb();
  try {
    const { emailSettings } = await import("@db/schema");
    const [row] = await db
      .select()
      .from(emailSettings)
      .where(eq(emailSettings.tenantId, user.tenantId))
      .limit(1);
    const senderEmail = row?.senderEmail ?? "noreply@gente.dev";
    const to = asString(body?.to).trim() || senderEmail;

    const delivery = await recordEmail({
      tenantId: user.tenantId,
      to,
      templateKey: "email_test",
    });
    return ok({ sent: true, to, channel: delivery.channel });
  } finally {
    await pool.end();
  }
});
