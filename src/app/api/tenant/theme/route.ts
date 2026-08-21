import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getTenantTheme, saveTenantTheme } from "@/lib/server/theme-store";
import { sanitizeThemeConfig } from "@/lib/theme-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const theme = await getTenantTheme();
  return NextResponse.json({ theme });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const text = await request.text();
  if (text.length > 1_000_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate + sanitize: unknown theme ids are rejected, hex colors are
  // normalized, and oversized URL fields are dropped.
  const sanitized = sanitizeThemeConfig(parsed);
  const theme = await saveTenantTheme(sanitized);
  return NextResponse.json({ theme });
}
