import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic check only: redirects visitors without a session cookie to the login page.
 * Real authorization happens in the Data Access Layer (src/server/dal.ts).
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/connexion", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Public: login page, auth endpoints, the website contact form endpoint (it checks origin/secret itself), assets.
  matcher: ["/((?!connexion|api/auth|api/formulaire-site|_next/static|_next/image|favicon.ico).*)"],
};
