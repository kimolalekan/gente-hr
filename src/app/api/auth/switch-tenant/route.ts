import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { isSecureRequest } from "@/lib/server/session";
import { signSession } from "@/lib/server/session-token";
import { getTenantForSwitch } from "@/lib/server/tenant-store";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TENANT_ID_RE = /^[0-9a-fA-F-]{8,}$/;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const tenantId = (parsed as { tenantId?: unknown })?.tenantId;
  if (typeof tenantId !== "string" || !TENANT_ID_RE.test(tenantId)) {
    return NextResponse.json(
      { ok: false, error: "A valid tenant id is required" },
      { status: 400 },
    );
  }

  // Switching to the current tenant is a no-op.
  if (tenantId === user.tenantId) {
    return NextResponse.json({ ok: true, user });
  }

  const tenant = await getTenantForSwitch(user.id, tenantId);
  if (!tenant) {
    return NextResponse.json(
      { ok: false, error: "You don't belong to that organization" },
      { status: 404 },
    );
  }

  // Re-sign the stateless session cookie with the new tenant + its role.
  const nextUser = {
    ...user,
    tenantId: tenant.tenantId,
    role: tenant.role,
  };
  const token = signSession(nextUser);
  const response = NextResponse.json({
    ok: true,
    user: {
      id: nextUser.id,
      name: nextUser.name,
      email: nextUser.email,
      role: nextUser.role,
      tenantId: nextUser.tenantId,
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
