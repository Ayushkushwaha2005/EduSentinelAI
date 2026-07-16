import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { effectiveCapabilities, type Capability } from "./permissions";
import { isAdminRole, type Role } from "./roles";

/*
 * The enforcement boundary for the workspace (Phase 5).
 *
 * Deny by default: every /app route and every server action calls one of these
 * before doing anything. Sidebar filtering and middleware are UX only — they
 * hide doors, they do not lock them. This file locks them.
 */

export type Viewer = {
  id: string;
  name: string;
  email: string;
  role: Role;
  mfaEnabled: boolean;
  caps: Set<Capability>;
  can: (cap: Capability) => boolean;
};

/**
 * Authenticated viewer + their effective capabilities. Redirects if signed out.
 *
 * Wrapped in React `cache()` so it runs AT MOST ONCE per server request: the
 * workspace layout and the page it renders both call this (often several guards
 * deep), and without memoisation each call repeated the whole auth handshake —
 * a session read, a user lookup and a grants query — turning one navigation into
 * a stack of identical database round-trips. The cache is per-request, so it
 * never leaks one viewer's authorization into another's request.
 */
export const requireViewer = cache(async (): Promise<Viewer> => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/app");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, mfaEnabled: true },
  });
  if (!user) redirect("/login?next=/app");

  // We already hold the role — hand it to effectiveCapabilities so it does not
  // SELECT it a second time.
  const caps = await effectiveCapabilities(user.id, user.role);
  return {
    ...(user as Omit<Viewer, "caps" | "can">),
    caps,
    can: (cap: Capability) => caps.has(cap),
  };
});

/**
 * Where to send a privileged account that has not enrolled MFA yet: to
 * enrolment, carrying the reason and the page they were trying to reach, so the
 * block explains itself and they land back where they meant to go.
 *
 * `next` comes from a request header, so it is attacker-controllable. It is only
 * ever used as a same-origin redirect target — validated as a relative /app path
 * so it can never become an open redirect — and never as an authorization input.
 */
async function mfaEnrolmentPath(): Promise<string> {
  const path = (await headers()).get("x-pathname") ?? "";
  const safe = /^\/app(\/[\w\-/]*)?$/.test(path) && !path.startsWith("//") ? path : "/app";
  return `/app/security?mfa=required&next=${encodeURIComponent(safe)}`;
}

/**
 * Require a capability. Privileged surfaces additionally require MFA (R6) —
 * a leadership account without MFA is bounced to enrolment, not to the page.
 */
export async function requireCapability(cap: Capability): Promise<Viewer> {
  const viewer = await requireViewer();
  if (isAdminRole(viewer.role) && !viewer.mfaEnabled) redirect(await mfaEnrolmentPath());
  if (!viewer.can(cap)) redirect("/app");
  return viewer;
}

/** Founder-only surfaces (access control). Never widen this to a rank check. */
export async function requireFounder(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== "FOUNDER") redirect("/app");
  if (!viewer.mfaEnabled) redirect(await mfaEnrolmentPath());
  return viewer;
}

/** For server actions, where redirecting is wrong — throw instead. */
export async function assertCapability(cap: Capability): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.can(cap)) throw new Error("Not permitted.");
  if (isAdminRole(viewer.role) && !viewer.mfaEnabled)
    throw new Error("MFA is required for this action.");
  return viewer;
}
