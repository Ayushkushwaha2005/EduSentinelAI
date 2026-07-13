"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertCapability } from "@/lib/guard";
import { contactableBy, isParticipant, markRead } from "@/lib/messages";
import { sanitizeLine, sanitizeUserText } from "@/lib/sanitize";

export type MessageState = { error?: string; ok?: boolean; conversationId?: string };

/*
 * Every action here re-checks participation server-side. The UI only ever shows
 * threads you belong to, but that is not the control — this is.
 */

export async function sendMessageAction(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  let viewer;
  try {
    viewer = await assertCapability("messages.use");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const conversationId = String(formData.get("conversationId") ?? "");
  // Sanitized on write; rendered as plain text only (Phase 4 rule applies to
  // anything a human typed, internal staff included).
  const body = sanitizeUserText(formData.get("body"), 4000).trim();

  if (!body) return { error: "Message is empty." };
  if (!(await isParticipant(viewer.id, conversationId)))
    return { error: "Conversation not found." };

  await db.$transaction([
    db.message.create({
      data: { conversationId, authorId: viewer.id, body },
    }),
    db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
    db.conversationParticipant.updateMany({
      where: { conversationId, userId: viewer.id },
      data: { lastReadAt: new Date() },
    }),
  ]);

  revalidatePath("/app/messages");
  return { ok: true, conversationId };
}

export async function startConversationAction(
  _prev: MessageState,
  formData: FormData,
): Promise<MessageState> {
  let viewer;
  try {
    viewer = await assertCapability("messages.use");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const targetId = String(formData.get("userId") ?? "");
  const subject = sanitizeLine(formData.get("subject"), 120).trim() || null;
  const body = sanitizeUserText(formData.get("body"), 4000).trim();
  if (!body) return { error: "Write a message to start the conversation." };

  // Deny-by-default: the target must be someone this viewer is permitted to
  // contact (a collaborator cannot reach another collaborator through us).
  const allowed = await contactableBy(viewer.id, viewer.role);
  const target = allowed.find((u) => u.id === targetId);
  if (!target) return { error: "You cannot start a conversation with that account." };

  // A thread including an external collaborator is a COLLAB thread, whichever
  // side opened it — so it is never mistaken for internal-only.
  const kind =
    viewer.role === "COLLABORATOR" || target.role === "COLLABORATOR" ? "COLLAB" : "TEAM";

  const convo = await db.conversation.create({
    data: {
      kind,
      subject,
      createdById: viewer.id,
      participants: {
        create: [
          { userId: viewer.id, lastReadAt: new Date() },
          { userId: target.id },
        ],
      },
      messages: { create: [{ authorId: viewer.id, body }] },
    },
    select: { id: true },
  });

  revalidatePath("/app/messages");
  return { ok: true, conversationId: convo.id };
}

export async function markReadAction(conversationId: string): Promise<void> {
  const viewer = await assertCapability("messages.use");
  if (!(await isParticipant(viewer.id, conversationId))) return;
  await markRead(viewer.id, conversationId);
  revalidatePath("/app/messages");
}
