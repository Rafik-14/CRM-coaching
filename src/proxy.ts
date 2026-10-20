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
  // Only the CRM is private. The public website (/, /methode, /reserver…), the login page,
  // auth endpoints, the website form endpoint and static files stay open.
  matcher: [
    "/tableau-de-bord/:path*",
    "/contacts/:path*",
    "/pipeline/:path*",
    "/calendrier/:path*",
    "/taches/:path*",
    "/mes-evenements/:path*",
    "/api/mes-evenements/:path*",
    "/analyses/:path*",
    "/parametres/:path*",
    "/api/fichiers/:path*",
  ],
};
