"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { assertCapability, requireViewer } from "@/lib/guard";
import { markRead, notifyMany } from "@/lib/notifications";
import { sanitizeLine } from "@/lib/sanitize";

/*
 * Notification actions (Phase 9).
 *
 * Reading your own notifications needs a session and nothing more. Broadcasting to
 * everyone is a CAPABILITY (`notifications.broadcast`) — not an assumption that
 * seniority implies the right to interrupt the whole company.
 */

export type NotifyState = { error?: string; notice?: string };

export async function markAllRead(): Promise<void> {
  const viewer = await requireViewer();
  // Scoped to the viewer inside markRead — `where: { userId }`, always. This is
  // exactly the endpoint that ends up taking an id from the request and marking
  // someone else's notifications read.
  await markRead(viewer.id);
  revalidatePath("/app/notifications");
  revalidatePath("/app");
}

export async function markOneRead(formData: FormData): Promise<void> {
  const viewer = await requireViewer();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await markRead(viewer.id, id);
  revalidatePath("/app/notifications");
}

export async function broadcast(
  _prev: NotifyState,
  formData: FormData,
): Promise<NotifyState> {
  const actor = await assertCapability("notifications.broadcast");

  const title = sanitizeLine(formData.get("title"), 120);
  const body = sanitizeLine(formData.get("body"), 160) || undefined;
  if (!title) return { error: "A broadcast needs something to say." };

  // Everyone who works here. Collaborators are deliberately not included: a
  // company announcement is not addressed to an external partner, and quietly
  // including them would leak internal context to people outside the company.
  const staff = await db.user.findMany({
    where: { role: { in: ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"] } },
    select: { id: true },
  });

  await notifyMany(
    staff.map((s) => s.id),
    { kind: "broadcast", title, body, href: "/app/notifications" },
  );

  const ctx = await requestContext();
  await audit("notifications.broadcast", {
    actorId: actor.id,
    detail: `${staff.length} recipients: ${title}`,
    ...ctx,
  });

  revalidatePath("/app/notifications");
  return { notice: `Sent to ${staff.length} ${staff.length === 1 ? "person" : "people"}.` };
}
