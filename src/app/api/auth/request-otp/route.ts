import { NextResponse } from "next/server";
import { requestOtp, DatabaseUnavailableError } from "@/lib/server/auth-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (parsed as { email?: unknown })?.email;
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json(
      { error: "A valid email is required" },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await requestOtp(email.trim().toLowerCase());
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 503 },
      );
    }
    throw error;
  }

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 429 },
    );
  }

  // `exists` is only revealed in development to make local demos friendlier;
  // production always answers the same (anti user-enumeration).
  const body: Record<string, unknown> = {
    ok: true,
    channel: result.channel,
  };
  if (process.env.NODE_ENV === "development") body.exists = result.exists;
  return NextResponse.json(body);
}
