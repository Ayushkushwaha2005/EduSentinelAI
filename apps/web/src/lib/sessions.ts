import { db } from "./db";
import { audit } from "./audit";
import { notify } from "./notifications";
import { sanitizeLine } from "./sanitize";

/*
 * Active sessions (Phase 14).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS DOES NOT CHANGE HOW AUTHENTICATION WORKS.
 *
 * Sessions remain stateless JWTs (`strategy: "jwt"`, 8h). What is added is a
 * RECORD of each one, keyed by a random `sid` claim, so the product can answer
 * two questions a bare token cannot: which devices am I signed in on, and how do
 * I end one of them. Revocation marks the row; the jwt callback treats a revoked
 * row exactly as it already treats a stale `sessionVersion` — the token stops
 * being accepted on the next request.
 *
 * The existing global revoke (`sessionVersion++`) is untouched and still works;
 * this is the per-device version of the same idea, not a replacement.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PRIVACY. Only what a person needs to recognise their own devices is stored.
 * Location is derived from headers the hosting platform already attaches to the
 * request — there is no call to a geolocation API, because that would be a
 * third-party tracker and `npm run check:trackers` is a CI invariant.
 */

export type SessionRow = {
  id: string;
  sid: string;
  browser: string;
  os: string;
  device: string;
  ip: string | null;
  location: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  current: boolean;
};

/* ───────────────────────────────────────────── user-agent, parsed simply ──── */

/**
 * A deliberately small UA parser.
 *
 * Not a library: UA parsing libraries carry large regex tables that are updated
 * constantly and add a dependency for a cosmetic label. Getting "Chrome on
 * Windows" right for the common cases is the whole requirement; anything
 * unrecognised says "Unknown", which is honest and harmless.
 */
export function parseUserAgent(ua: string | null | undefined) {
  const s = (ua ?? "").slice(0, 400);

  /*
   * Order matters; word boundaries do not.
   *
   * `\bChrome/` looked tidy and was wrong: Chromium builds identify as
   * "HeadlessChrome/141" and vendor builds prepend their own token, so the
   * boundary fails and the chain falls through to Safari — every such session
   * was being labelled "Safari on Windows" on the Session Center. Matching the
   * substring and relying on the ORDER is what actually holds, because each
   * entry below carries the tokens of the ones after it.
   */
  const browser =
    /Edg\//.test(s) ? "Edge"
    : /OPR\/|Opera/.test(s) ? "Opera"
    : /Firefox\//.test(s) ? "Firefox"
    : /Chrome\/|CriOS\//.test(s) ? "Chrome"
    : /Safari\//.test(s) ? "Safari"
    : "Unknown";

  const os =
    /Windows NT 10|Windows NT 11/.test(s) ? "Windows"
    : /Windows/.test(s) ? "Windows"
    : /iPhone|iPad|iPod/.test(s) ? "iOS"
    : /Android/.test(s) ? "Android"
    : /Mac OS X|Macintosh/.test(s) ? "macOS"
    : /Linux/.test(s) ? "Linux"
    : "Unknown";

  const device =
    /iPad|Tablet/.test(s) ? "Tablet"
    : /Mobi|iPhone|Android.*Mobile/.test(s) ? "Phone"
    : "Desktop";

  return { browser, os, device };
}

/**
 * Coarse location from platform headers only.
 *
 * Vercel attaches `x-vercel-ip-city` / `-country` to every request. Where those
 * are absent (local development, another host) this returns null rather than
 * guessing — a wrong city on a security page is worse than no city.
 */
export function locationFrom(headers: Headers): string | null {
  const city = headers.get("x-vercel-ip-city");
  const country = headers.get("x-vercel-ip-country");
  const decoded = city ? decodeURIComponent(city) : null;
  if (decoded && country) return sanitizeLine(`${decoded}, ${country}`, 60);
  if (country) return sanitizeLine(country, 60);
  return null;
}

export function ipFrom(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : headers.get("x-real-ip");
  return ip ? sanitizeLine(ip, 45) : null;
}

/* ─────────────────────────────────────────────────────── the write path ──── */

/**
 * Record a sign-in and return the `sid` to embed in the token.
 *
 * Also decides whether this looks like a NEW DEVICE, and tells the account
 * owner when it does. That notification is the entire security value of the
 * feature: a session list nobody looks at catches nothing, whereas "a new
 * Windows device signed in from Mumbai" arrives whether or not you were looking.
 */
export async function recordSignIn(opts: {
  userId: string;
  sid: string;
  userAgent: string | null;
  ip: string | null;
  location: string | null;
}): Promise<void> {
  const { browser, os, device } = parseUserAgent(opts.userAgent);

  /* "Have I seen this shape of device before?" — compared against the account's
     own history, not a global fingerprint. Deliberately coarse: browser + OS is
     enough to catch "someone else signed in", and fine enough not to cry wolf
     every time a browser updates. */
  const seenBefore = await db.userSession.findFirst({
    where: { userId: opts.userId, browser, os },
    select: { id: true },
  });

  await db.userSession.create({
    data: {
      userId: opts.userId,
      sid: opts.sid,
      userAgent: opts.userAgent ? sanitizeLine(opts.userAgent, 400) : null,
      browser,
      os,
      device,
      ip: opts.ip,
      location: opts.location,
    },
  });

  if (!seenBefore) {
    const where = opts.location ? ` from ${opts.location}` : "";
    await notify({
      userId: opts.userId,
      kind: "security.new_device",
      // Title + one sentence, per the notification rule. No token, no IP in the
      // body — the detail lives behind the link, which re-checks server-side.
      title: "New device signed in",
      body: `${browser} on ${os}${where}. If this was not you, end the session and change your password.`,
      href: "/app/security",
    });
    await audit("session.new_device", {
      actorId: opts.userId,
      detail: `${browser}/${os}/${device}`,
      ip: opts.ip ?? undefined,
    });
  }
}

/** Keep `lastSeenAt` current. Cheap, best-effort, never blocks a request. */
export async function touchSession(sid: string): Promise<void> {
  try {
    await db.userSession.updateMany({
      where: { sid, revokedAt: null },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    /* A failed heartbeat must never break a page render. */
  }
}

/** Is this token's session still live? Used by the jwt callback. */
export async function isSessionLive(sid: string): Promise<boolean> {
  const row = await db.userSession.findUnique({
    where: { sid },
    select: { revokedAt: true },
  });
  // A token whose row is missing predates this feature; it stays valid until it
  // expires on its own rather than signing everyone out on deploy.
  return row ? row.revokedAt === null : true;
}

/* ──────────────────────────────────────────────────────── the read path ──── */

export async function sessionsFor(
  userId: string,
  currentSid: string | null,
): Promise<SessionRow[]> {
  const rows = await db.userSession.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    take: 50,
  });

  return rows.map((r) => ({
    id: r.id,
    sid: r.sid,
    browser: r.browser ?? "Unknown",
    os: r.os ?? "Unknown",
    device: r.device ?? "Desktop",
    ip: r.ip,
    location: r.location,
    createdAt: r.createdAt,
    lastSeenAt: r.lastSeenAt,
    current: !!currentSid && r.sid === currentSid,
  }));
}

/* ─────────────────────────────────────────────────────── the revoke path ──── */

/**
 * End one session.
 *
 * Scoped by `userId` in the WHERE clause, not checked afterwards — so a crafted
 * session id belonging to somebody else simply matches nothing. Ending another
 * person's session is an administrative act and goes through `revokeAllFor`
 * with an explicit actor.
 */
export async function revokeSession(
  userId: string,
  sessionId: string,
  actorId: string,
): Promise<boolean> {
  const res = await db.userSession.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedBy: actorId },
  });
  if (res.count === 0) return false;

  await audit("session.revoked", {
    actorId,
    detail: actorId === userId ? "own session" : `session of ${userId}`,
  });
  return true;
}

/** End every session except the one making the request. */
export async function revokeOthers(
  userId: string,
  keepSid: string,
  actorId: string,
): Promise<number> {
  const res = await db.userSession.updateMany({
    where: { userId, revokedAt: null, sid: { not: keepSid } },
    data: { revokedAt: new Date(), revokedBy: actorId },
  });
  if (res.count > 0) {
    await audit("session.revoked_others", { actorId, detail: `${res.count} ended` });
  }
  return res.count;
}

/**
 * End everything, including the caller's own session.
 *
 * This ALSO bumps `sessionVersion`, which is what makes it a true "sign out
 * everywhere": rows cover tokens minted since this feature shipped, and the
 * version bump covers any that predate it. Belt and braces, on purpose — this
 * is the control someone reaches for when they think they have been breached.
 */
export async function revokeAllFor(userId: string, actorId: string): Promise<number> {
  const res = await db.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedBy: actorId },
  });
  await db.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
  await audit("session.revoked_all", {
    actorId,
    detail: actorId === userId ? `${res.count} own sessions` : `${res.count} sessions of ${userId}`,
  });
  return res.count;
}

/* ────────────────────────────────────── the Organization Session Center ──── */

export type OrgSessionRow = SessionRow & {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
};

/**
 * Every live session in the organization.
 *
 * Read-only, and deliberately NOT scoped by the caller — the caller is checked
 * before this runs (`requireExecutiveView`), because the whole point of the
 * Session Center is the org-wide view. Ending any of them is a separate,
 * founder-reserved act (`sessions.manage`).
 */
export async function organizationSessions(
  currentSid: string | null,
): Promise<OrgSessionRow[]> {
  const rows = await db.userSession.findMany({
    where: { revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    take: 300,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    sid: r.sid,
    browser: r.browser ?? "Unknown",
    os: r.os ?? "Unknown",
    device: r.device ?? "Desktop",
    ip: r.ip,
    location: r.location,
    createdAt: r.createdAt,
    lastSeenAt: r.lastSeenAt,
    current: !!currentSid && r.sid === currentSid,
    userId: r.user.id,
    userName: r.user.name,
    userEmail: r.user.email,
    userRole: r.user.role,
  }));
}

/**
 * Recent sign-in and session history, from the audit log.
 *
 * The audit log already records every login, new device and revocation with a
 * timestamp and an actor, so login history needs no second table and cannot
 * disagree with what actually happened.
 */
export async function sessionHistory(take = 40) {
  return db.auditLog.findMany({
    where: { action: { in: ["user.login", "session.new_device", "session.revoked", "session.revoked_others", "session.revoked_all"] } },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, action: true, actorEmail: true, detail: true, ip: true, createdAt: true },
  });
}

/** End one session belonging to ANY account. Founder-reserved at the caller. */
export async function adminRevokeSession(
  sessionId: string,
  actorId: string,
): Promise<boolean> {
  const res = await db.userSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date(), revokedBy: actorId },
  });
  if (res.count === 0) return false;
  await audit("session.revoked", { actorId, detail: `admin ended session ${sessionId}` });
  return true;
}
