import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Protects all app pages. Only checks for the presence of the session cookie
 * (cheap, edge runtime); pages still verify the session's validity
 * server-side via `getCurrentUser()` and redirect when it's stale.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (request.cookies.get(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  if (pathname !== "/") {
    url.searchParams.set("next", pathname);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Everything except public routes: the OTP login page, the public
     * onboarding completion page, first-run setup (linked from invite
     * emails / provisioning) and the public ATS apply page (candidate
     * applications to open jobs), API route handlers (they authenticate
     * themselves), and static assets (favicon/icon + the vendored flag SVGs
     * under /flags/*). The authenticated /onboarding pages are still guarded
     * by the (app) layout.
     */
    "/((?!api|login|setup|onboarding|apply|flags|_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
