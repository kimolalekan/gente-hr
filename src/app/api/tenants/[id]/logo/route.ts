import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, route } from "@/lib/server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TENANT_ID_RE = /^[0-9a-fA-F-]{8,}$/;

/**
 * GET /api/tenants/[id]/logo — public logo image.
 *
 * Email clients can't send cookies and block `data:` URIs, so email templates
 * reference the tenant logo through this endpoint (see
 * `resolveEmailLogo` in email-template.ts) instead of embedding base64.
 */
export const GET = route(
  async (
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    if (!TENANT_ID_RE.test(id)) {
      return new NextResponse("Not found", { status: 404 });
    }

    const { db, pool } = await getDb();
    try {
      const { tenants } = await import("@db/schema");
      const [tenant] = await db
        .select({ logo: tenants.logo, themeConfig: tenants.themeConfig })
        .from(tenants)
        .where(eq(tenants.id, id))
        .limit(1);
      const logoUrl = tenant?.themeConfig?.logoUrl ?? tenant?.logo ?? null;
      const match =
        typeof logoUrl === "string"
          ? /^data:(image\/[\w.+-]+);base64,(.+)$/i.exec(logoUrl)
          : null;
      if (!match) {
        return new NextResponse("Not found", { status: 404 });
      }
      const [, mime, base64] = match;
      return new NextResponse(Buffer.from(base64, "base64"), {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } finally {
      await pool.end();
    }
  },
);
