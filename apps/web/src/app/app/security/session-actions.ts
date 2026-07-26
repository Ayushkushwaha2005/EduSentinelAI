"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireViewer } from "@/lib/guard";
import { notify } from "@/lib/notifications";
import { revokeAllFor, revokeOthers, revokeSession } from "@/lib/sessions";

/*
 * Ending sessions.
 *
 * AUTHORITY, stated once: this acts on the CALLER'S OWN sessions and nothing
 * else. The user id comes from `requireViewer()` on the server, never from the
 * form — so a crafted session id belonging to somebody else matches nothing,
 * because every query is scoped by that id in its WHERE clause rather than
 * checked after the fact.
 *
 * An administrator ending someone else's sessions is a different act with a
 * different owner (`people.offboard`, founder-reserved) and is not reachable
 * from here.
 *
 * One action with a `scope` rather than three: the three differed only in which
 * rows they matched, and the authority check is identical for all of them.
 */

export type SessionActionState = { error?: string; notice?: string };

export async function endSessionsAction(
  _prev: SessionActionState,
  form: FormData,
): Promise<SessionActionState> {
  const viewer = await requireViewer();
  const scope = String(form.get("scope") ?? "");

  const session = await auth();
  const currentSid = (session as { sid?: string } | null)?.sid ?? null;

  if (scope === "one") {
    const id = String(form.get("sessionId") ?? "");
    if (!id) return { error: "Missing session." };

    const ok = await revokeSession(viewer.id, id, viewer.id);
    if (!ok) return { error: "That session is already ended." };

    /* Tell the account, on the account. If the person ending it is not the one
       holding that device, this is the only way its owner finds out. */
    await notify({
      userId: viewer.id,
      kind: "security.session_revoked",
      title: "A session was ended",
      body: "One of your signed-in devices was signed out from your security settings.",
      href: "/app/security",
    });

    revalidatePath("/app/security");
    return { notice: "That device has been signed out." };
  }

  if (scope === "others") {
    if (!currentSid) {
      return { error: "Could not identify this device. Sign in again and retry." };
    }
    const count = await revokeOthers(viewer.id, currentSid, viewer.id);
    if (count === 0) return { notice: "No other devices were signed in." };

    await notify({
      userId: viewer.id,
      kind: "security.session_revoked",
      title: "Other sessions ended",
      body: `${count} other ${count === 1 ? "device was" : "devices were"} signed out. This device stays signed in.`,
      href: "/app/security",
    });

    revalidatePath("/app/security");
    return { notice: `${count} other ${count === 1 ? "device" : "devices"} signed out.` };
  }

  if (scope === "all") {
    /*
     * Everything, including this device. Also bumps `sessionVersion`, so it
     * covers tokens minted before this feature existed — this is the control
     * someone reaches for when they believe they have been compromised, and it
     * should not half-work.
     */
    const count = await revokeAllFor(viewer.id, viewer.id);
    revalidatePath("/app/security");
    return {
      notice: `${count} ${count === 1 ? "session" : "sessions"} ended. You will be signed out.`,
    };
  }

  return { error: "Unknown action." };
}
