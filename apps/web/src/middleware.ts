import { NextResponse, type NextRequest } from "next/server";

/*
 * Site-wide security headers (R4) + the /app UX gate.
 *
 * CSP strategy: dynamic routes (auth + app) get a strict per-request
 * nonce policy; statically prerendered marketing pages cannot carry
 * per-request nonces, so they get a policy that still pins every source
 * to 'self' but allows inline scripts (accepted risk SN-002 — no
 * user-generated content renders on those pages).
 *
 * Real authorization happens server-side in src/app/app/layout.tsx via
 * auth(); the cookie check here is only a fast redirect for clearly
 * unauthenticated visitors. Node-only auth code must never be imported
 * here (Edge runtime).
 */

const SHARED = [
  "default-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "style-src 'self' 'unsafe-inline'", // framer-motion inline styles
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const DYNAMIC_PREFIXES = [
  "/app",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api",
];

/*
 * Explicit CORS policy (Phase 4 gate): the API is same-origin only. We
 * send no Access-Control-Allow-Origin header, so browsers block all
 * cross-origin reads by default — and we reject cross-origin
 * state-changing requests outright rather than relying on that default.
 * Public artifact downloads are exempt: they are GETs with signed URLs and
 * are meant to be fetchable (e.g. from a package manager).
 */
const CORS_EXEMPT = ["/api/download/"];

function crossOriginBlocked(req: NextRequest): boolean {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api")) return false;
  if (CORS_EXEMPT.some((p) => pathname.startsWith(p))) return false;

  const origin = req.headers.get("origin");
  if (!origin) return false; // same-origin / non-browser request
  try {
    return new URL(origin).origin !== req.nextUrl.origin;
  } catch {
    return true; // malformed Origin header
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CORS: reject cross-origin API requests explicitly.
  if (crossOriginBlocked(req)) {
    return new NextResponse("Cross-origin requests are not permitted.", {
      status: 403,
    });
  }

  // /app UX gate
  if (pathname.startsWith("/app")) {
    const hasSession =
      req.cookies.has("authjs.session-token") ||
      req.cookies.has("__Secure-authjs.session-token");
    if (!hasSession) {
      const login = new URL("/login", req.nextUrl.origin);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  }

  const isDynamic = DYNAMIC_PREFIXES.some((p) => pathname.startsWith(p));

  let res: NextResponse;
  let csp: string;

  /*
   * DEVELOPMENT ONLY — see the note below. Production is untouched.
   *
   * `next dev` serves Hot Module Replacement and React Refresh, both of which
   * evaluate code at runtime and open a websocket back to the dev server. Under
   * the production policy (`script-src 'self' 'nonce-…' 'strict-dynamic'` and
   * `connect-src 'self'`) the browser blocks both, so every page in the
   * workspace filled the console with CSP violations and hot reload silently
   * stopped working.
   *
   * This branch is gated on NODE_ENV, which `next build` sets to "production"
   * and cannot be reached from a request — so no deployed response can ever
   * receive it. The production policy below is byte-for-byte what it always was,
   * and `npm run test:support` still asserts that the nonced policy never gains
   * 'unsafe-inline'.
   */
  if (process.env.NODE_ENV === "development") {
    const devCsp =
      "default-src 'self'; " +
      "img-src 'self' blob: data:; " +
      "font-src 'self' data:; " +
      // HMR's websocket, and Turbopack's blob-backed workers.
      "connect-src 'self' ws: wss: blob:; " +
      "worker-src 'self' blob:; " +
      "style-src 'self' 'unsafe-inline'; " +
      "object-src 'none'; base-uri 'self'; form-action 'self'; " +
      // 'unsafe-eval' is what React Refresh needs. Development only.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:";

    const devHeaders = new Headers(req.headers);
    devHeaders.set("x-pathname", pathname);
    res = NextResponse.next({ request: { headers: devHeaders } });
    res.headers.set("content-security-policy", devCsp);
    return res;
  }

  if (isDynamic) {
    // Strict nonced CSP; Next.js picks the nonce up from the request CSP
    // header and applies it to its own script tags.
    const nonce = crypto.randomUUID().replaceAll("-", "");
    csp = `${SHARED}; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", csp);
    // The path the viewer actually asked for. lib/guard.ts uses it to send a
    // privileged user back where they were going once they finish enrolling MFA.
    // Never used for authorization — it is a request header, so it is attacker
    // controllable; it only ever becomes a same-origin redirect target.
    requestHeaders.set("x-pathname", pathname);
    res = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    csp = `${SHARED}; script-src 'self' 'unsafe-inline'`;
    res = NextResponse.next();
  }
  res.headers.set("content-security-policy", csp);
  return res;
}

export const config = {
  matcher: [
    // Everything except static assets and framework internals.
    // icon.svg is gone (it was a 578 KB favicon — Phase 10, Task 8); logo-mark.png
    // and apple-icon.png replaced it and the oversized nav asset.
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|logo-mark.png|logo.svg|logo.png|og.png|team/|showcase/|.well-known/).*)",
  ],
};
