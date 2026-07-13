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

/** Authenticated viewer + their effective capabilities. Redirects if signed out. */
export async function requireViewer(): Promise<Viewer> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/app");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, mfaEnabled: true },
  });
  if (!user) redirect("/login?next=/app");

  const caps = await effectiveCapabilities(user.id);
  return {
    ...(user as Omit<Viewer, "caps" | "can">),
    caps,
    can: (cap: Capability) => caps.has(cap),
  };
}

/**
 * Require a capability. Privileged surfaces additionally require MFA (R6) —
 * a leadership account without MFA is bounced to enrolment, not to the page.
 */
export async function requireCapability(cap: Capability): Promise<Viewer> {
  const viewer = await requireViewer();
  if (isAdminRole(viewer.role) && !viewer.mfaEnabled) redirect("/app/security");
  if (!viewer.can(cap)) redirect("/app");
  return viewer;
}

/** Founder-only surfaces (access control). Never widen this to a rank check. */
export async function requireFounder(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== "FOUNDER") redirect("/app");
  if (!viewer.mfaEnabled) redirect("/app/security");
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
