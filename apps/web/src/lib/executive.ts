import { redirect } from "next/navigation";
import { requireViewer, type Viewer } from "./guard";
import { isFounderReserved, type Capability } from "./permissions";

/*
 * The Executive Workspace.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS IS, AND WHAT IT IS CAREFULLY NOT
 *
 * It separates two questions the codebase had previously fused into one:
 *
 *     may I OPEN this?          ← a leadership question
 *     may I EXECUTE this?       ← an authority question
 *
 * Fusing them is why a Co-Founder was bounced out of Access Control entirely:
 * the only gate was `requireFounder()`, so "cannot grant permissions" also meant
 * "cannot look at who has them". Leadership that cannot see the state of its own
 * company is not leadership.
 *
 * So VIEW is widened to the executive roles, and EXECUTE is left exactly as it
 * was. Nothing here grants a capability, weakens a check, or touches a server
 * action. `assertCapability` still runs on every mutation and still strips
 * FOUNDER_RESERVED for anyone who is not the Founder — this file cannot reach
 * that decision even if it wanted to.
 *
 * THE FOUNDER PATH IS UNCHANGED. A FOUNDER passed `requireFounder()` before and
 * passes `requireExecutiveView()` now; same viewer, same data, same actions,
 * same result. Every widening below admits exactly one additional role.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Roles that may OPEN the leadership surfaces. Not an authority list. */
export const EXECUTIVE_ROLES = ["FOUNDER", "CO_FOUNDER"] as const;

export function isExecutive(role: string): boolean {
  return (EXECUTIVE_ROLES as readonly string[]).includes(role);
}

/**
 * Is this viewer looking at a surface they may not act on?
 *
 * True for a Co-Founder on a founder-reserved surface. Used to decide whether a
 * page renders its approval affordances — never to decide whether an action
 * runs. That decision belongs to `assertCapability`, on the server, every time.
 */
export function isReviewMode(viewer: Viewer, cap?: Capability): boolean {
  if (viewer.role === "FOUNDER") return false;
  if (!cap) return true;
  return !viewer.can(cap);
}

/**
 * Open a leadership surface.
 *
 * `cap` is what the page is ABOUT, not what the reader needs. A Founder holding
 * it acts; an executive without it reviews. Anyone else is redirected exactly as
 * the previous guard redirected them — no role below CO_FOUNDER gains anything.
 */
export async function requireExecutiveView(cap?: Capability): Promise<Viewer> {
  const viewer = await requireViewer();

  if (isExecutive(viewer.role)) {
    /* MFA is still mandatory for privileged roles before any leadership surface
       renders. This is the same rule the previous guards applied and it is not
       relaxed for the Executive Workspace. */
    if (!viewer.mfaEnabled) redirect("/app/security?mfa=required");
    return viewer;
  }

  /* Not an executive: fall back to the ordinary capability rule, so a surface
     that was reachable with a grant stays reachable with that grant. */
  if (cap && viewer.can(cap)) return viewer;

  redirect("/app");
}

/* ────────────────────────────────────────────────── the approval vocabulary ── */

/**
 * The words the product uses when authority is the missing ingredient.
 *
 * Deliberately not "restricted", "read only" or "limited". Those describe the
 * person; these describe the OPERATION — it is complete, it is legitimate, and
 * it is waiting on the one person who can authorise it. Same refusal, and the
 * refusal still happens server-side; only the sentence changes.
 */
export const APPROVAL = {
  title: "Founder approval required.",
  body:
    "This operation requires Founder authorization before production changes " +
    "can be applied.",
  simulated: "Simulation completed successfully. Waiting for Founder approval.",
  badge: "Approval required",
  reviewBadge: "Review mode",
} as const;

/**
 * The state a simulated action returns.
 *
 * An executive who cannot execute still walks the whole workflow — the form
 * validates, the server checks everything it would normally check — and stops at
 * the last step with this instead of a write. That is the difference between
 * "your input was understood and is waiting on approval" and "computer says no",
 * and it is the entire point of the Simulation UX.
 */
export type ApprovalOutcome = {
  approvalRequired: true;
  title: string;
  body: string;
  /** What would have happened, in the operator's own words. */
  simulated?: string;
};

export function approvalRequired(simulated?: string): ApprovalOutcome {
  return {
    approvalRequired: true,
    title: APPROVAL.title,
    body: APPROVAL.body,
    simulated,
  };
}

/**
 * Guard for a server action on a leadership surface.
 *
 * Returns either the viewer (proceed) or an ApprovalOutcome (stop, and say so
 * nicely). It NEVER returns a viewer for a capability they lack — the check is
 * `viewer.can(cap)`, the same call every other action makes, against the same
 * effective set with FOUNDER_RESERVED already stripped.
 */
export async function executeOrApproval(
  cap: Capability,
  simulated?: string,
): Promise<{ viewer: Viewer } | ApprovalOutcome> {
  const viewer = await requireViewer();
  if (viewer.can(cap)) return { viewer };

  /* A reserved capability is an approval question. Anything else is an ordinary
     permission the Founder can simply grant, and saying "ask the Founder to
     approve" would misdescribe it — they would grant it, not approve it. */
  if (isFounderReserved(cap)) return approvalRequired(simulated);
  return {
    approvalRequired: true,
    title: "You do not have this permission.",
    body: "Ask the Founder to enable it for your account in Access Control.",
  };
}
