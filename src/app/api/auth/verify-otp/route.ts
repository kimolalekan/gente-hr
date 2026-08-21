import { NextResponse } from "next/server";
import { verifyOtp, DatabaseUnavailableError } from "@/lib/server/auth-store";
import { isSecureRequest } from "@/lib/server/session";
import { signSession } from "@/lib/server/session-token";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

export async function POST(request: Request) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, code } = (parsed ?? {}) as { email?: unknown; code?: unknown };
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json(
      { error: "A valid email is required" },
      { status: 400 },
    );
  }
  if (typeof code !== "string" || !CODE_RE.test(code)) {
    return NextResponse.json(
      { error: "A 6-digit code is required" },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await verifyOtp(email.trim().toLowerCase(), code);
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
    const status = result.reason === "not_found" ? 404 : 400;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  // Issue the stateless signed session cookie (httpOnly + secure). Nothing
  // is stored in the DB or localStorage.
  const token = signSession(result.user);
  const response = NextResponse.json({
    ok: true,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
    },
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(request),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
