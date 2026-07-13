"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { assertCapability } from "@/lib/guard";
import { isCollabKind, isCollabStatus } from "@/lib/collaborations";
import { sanitizeLine, sanitizeUserText } from "@/lib/sanitize";

/*
 * Collaboration management (Phase 6.5).
 *
 * Runs on `collab.manage` — grantable, unlike the org chart and the company
 * profile. Managing a partnership is operational work; saying who the company's
 * leadership is, is not.
 *
 * A collaboration is the RELATIONSHIP. It may be linked to an account, to a public
 * request, to both, or to neither — a partnership that began over a call should not
 * require someone to first go and fill in the public form.
 */

export type CollabState = { error?: string; notice?: string };

function revalidateCollab() {
  revalidatePath("/app/collaborations");
  revalidatePath("/app/people");
  revalidatePath("/app");
}

export async function saveCollaboration(
  _prev: CollabState,
  formData: FormData,
): Promise<CollabState> {
  const actor = await assertCapability("collab.manage");

  const id = (formData.get("id") as string) || null;
  const userId = (formData.get("userId") as string) || null;
  const name = sanitizeLine(formData.get("name"), 80);
  const kindRaw = formData.get("kind");
  const statusRaw = formData.get("status");

  // A linked account supplies the name; an unlinked collaboration needs one.
  if (!userId && !name) {
    return { error: "A collaboration with no linked account needs a name." };
  }
  if (userId) {
    const taken = await db.collaboration.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (taken && taken.id !== id) {
      return { error: "That collaborator already has a collaboration record." };
    }
  }

  const status = isCollabStatus(statusRaw) ? statusRaw : "ACTIVE";
  const data = {
    userId,
    name,
    org: sanitizeLine(formData.get("org"), 80) || null,
    email: sanitizeLine(formData.get("email"), 120) || null,
    kind: isCollabKind(kindRaw) ? kindRaw : "partnership",
    status,
    summary: sanitizeUserText(formData.get("summary"), 500) || null,
    // Ending a collaboration stamps when. Re-activating clears it, rather than
    // leaving an "ended" date on a live relationship.
    endedAt: status === "ENDED" ? new Date() : null,
  };

  const ctx = await requestContext();
  if (id) {
    await db.collaboration.update({ where: { id }, data });
    await audit("collaboration.updated", {
      actorId: actor.id,
      detail: `${name || userId} -> ${status}`,
      ...ctx,
    });
  } else {
    await db.collaboration.create({ data: { ...data, createdBy: actor.id } });
    await audit("collaboration.created", {
      actorId: actor.id,
      detail: name || userId || "",
      ...ctx,
    });
  }

  revalidateCollab();
  return { notice: id ? "Collaboration updated." : "Collaboration created." };
}

export async function removeCollaboration(formData: FormData): Promise<void> {
  const actor = await assertCapability("collab.manage");
  const id = formData.get("id") as string;
  if (!id) return;

  const collab = await db.collaboration.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!collab) return;

  // Deleting the RELATIONSHIP does not delete the person's ACCOUNT, and must not:
  // they can still sign in, they simply are not a current collaborator. Removing
  // access is a role change, and that lives in Access Control.
  await db.collaboration.delete({ where: { id } });

  const ctx = await requestContext();
  await audit("collaboration.removed", {
    actorId: actor.id,
    detail: collab.name,
    ...ctx,
  });
  revalidateCollab();
}

/**
 * Reconcile: create a collaboration for a collaborator account that has none.
 *
 * This is the one-click fix for the drift that started all this — someone visible
 * in People but absent from Collaboration. It is a deliberate action rather than
 * an automatic backfill: the platform should not invent a business relationship
 * because an account exists.
 */
export async function linkAccount(formData: FormData): Promise<void> {
  const actor = await assertCapability("collab.manage");
  const userId = formData.get("userId") as string;
  if (!userId) return;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user || user.role !== "COLLABORATOR") return;

  const existing = await db.collaboration.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (existing) return;

  // Their own most recent public request, if they ever made one, so the history
  // travels with the relationship instead of being orphaned.
  const request = await db.collaborationRequest.findFirst({
    where: { email: user.email, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
  });
  const requestTaken = request
    ? await db.collaboration.findUnique({
        where: { requestId: request.id },
        select: { id: true },
      })
    : null;

  await db.collaboration.create({
    data: {
      userId: user.id,
      requestId: request && !requestTaken ? request.id : null,
      name: user.name,
      email: user.email,
      org: request?.org ?? null,
      kind: request?.kind ?? "partnership",
      status: "ACTIVE",
      summary: request?.message.slice(0, 300) ?? null,
      createdBy: actor.id,
    },
  });

  const ctx = await requestContext();
  await audit("collaboration.linked", {
    actorId: actor.id,
    detail: user.email,
    ...ctx,
  });
  revalidateCollab();
}
