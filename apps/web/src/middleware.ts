import { NextResponse, type NextRequest } from "next/server";

/*
 * Lightweight UX gate: bounce clearly-unauthenticated visitors off /app
 * without loading Node-only auth code in the Edge runtime. Real
 * enforcement happens server-side in src/app/app/layout.tsx via auth().
 */
export function middleware(req: NextRequest) {
  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");
  if (!hasSession) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
