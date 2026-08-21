import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getUserMode, saveUserMode } from "@/lib/server/theme-store";
import { isThemeMode } from "@/lib/theme-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mode = await getUserMode();
  return NextResponse.json({ mode });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mode = (parsed as { mode?: unknown })?.mode;
  if (!isThemeMode(mode)) {
    return NextResponse.json(
      { error: 'mode must be "light", "dark" or "system"' },
      { status: 400 },
    );
  }

  const saved = await saveUserMode(mode);
  return NextResponse.json({ mode: saved });
}
