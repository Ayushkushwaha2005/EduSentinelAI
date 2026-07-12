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
  if (isDynamic) {
    // Strict nonced CSP; Next.js picks the nonce up from the request CSP
    // header and applies it to its own script tags.
    const nonce = crypto.randomUUID().replaceAll("-", "");
    csp = `${SHARED}; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", csp);
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
    "/((?!_next/static|_next/image|favicon.ico|icon.png|icon.svg|logo.svg|logo.png|og.png|team/|showcase/|.well-known/).*)",
  ],
};
