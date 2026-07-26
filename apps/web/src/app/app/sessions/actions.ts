"use server";

import { revalidatePath } from "next/cache";
import { assertCapability } from "@/lib/guard";
import { FOUNDER_APPROVAL_REQUIRED } from "@/lib/permissions";
import { notify } from "@/lib/notifications";
import { adminRevokeSession, revokeAllFor } from "@/lib/sessions";

/*
 * Administrative session control.
 *
 * `assertCapability("sessions.manage")` is the whole boundary, and it is the
 * same call every other privileged action makes. `sessions.manage` is
 * FOUNDER_RESERVED, so `effectiveCapabilities` strips it for every role but the
 * Founder before this check ever runs — a Co-Founder reaching this action with a
 * hand-written request gets the same refusal as a stranger.
 *
 * The refusal is returned as state rather than thrown, so the Executive
 * Workspace can present it as an approval step instead of an error boundary.
 * That is a presentation choice on top of a completed refusal, never instead of
 * one.
 */

export type OrgSessionState = { error?: string; notice?: string; approval?: boolean };

export async function adminEndSessionAction(
  _prev: OrgSessionState,
  form: FormData,
): Promise<OrgSessionState> {
  let actor;
  try {
    actor = await assertCapability("sessions.manage");
  } catch (e) {
    const msg = (e as Error).message;
    return { error: msg, approval: msg === FOUNDER_APPROVAL_REQUIRED };
  }

  const scope = String(form.get("scope") ?? "");

  if (scope === "one") {
    const sessionId = String(form.get("sessionId") ?? "");
    const userId = String(form.get("userId") ?? "");
    if (!sessionId) return { error: "Missing session." };

    const ok = await adminRevokeSession(sessionId, actor.id);
    if (!ok) return { error: "That session has already ended." };

    /* The person whose device it was is told. Ending someone's session without
       telling them is how an account quietly loses access and nobody knows. */
    if (userId) {
      await notify({
        userId,
        kind: "security.session_revoked",
        title: "A session was ended",
        body: "One of your signed-in devices was signed out by an administrator.",
        href: "/app/security",
      });
    }

    revalidatePath("/app/sessions");
    return { notice: "Session ended." };
  }

  if (scope === "user") {
    const userId = String(form.get("userId") ?? "");
    if (!userId) return { error: "Missing account." };

    const count = await revokeAllFor(userId, actor.id);
    await notify({
      userId,
      kind: "security.session_revoked",
      title: "You were signed out everywhere",
      body: "An administrator ended every session on your account. Sign in again to continue.",
      href: "/app/security",
    });

    revalidatePath("/app/sessions");
    return { notice: `${count} ${count === 1 ? "session" : "sessions"} ended.` };
  }

  return { error: "Unknown action." };
}
