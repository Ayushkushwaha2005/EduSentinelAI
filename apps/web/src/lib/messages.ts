import { db } from "./db";

/*
 * Message Center data layer (Phase 5.3).
 *
 * Access rule, enforced here and nowhere else: you may read or write a
 * conversation only if you are a participant in it. Every export below takes
 * the viewer's id and scopes on it — there is no "get conversation by id"
 * helper that skips the check, deliberately, so a page cannot forget to make it
 * (the same discipline as lib/products.ts ownership scoping).
 */

export type ConversationKind = "TEAM" | "COLLAB";

/** Conversations the viewer participates in, newest activity first. */
export async function listConversations(userId: string, kind?: ConversationKind) {
  const rows = await db.conversation.findMany({
    where: {
      ...(kind ? { kind } : {}),
      participants: { some: { userId } },
    },
    orderBy: { lastMessageAt: "desc" },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, role: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true },
      },
    },
  });

  return rows.map((c) => {
    const me = c.participants.find((p) => p.userId === userId);
    const others = c.participants.filter((p) => p.userId !== userId);
    const last = c.messages[0];
    return {
      id: c.id,
      kind: c.kind as ConversationKind,
      subject: c.subject,
      title: c.subject ?? others.map((p) => p.user.name).join(", ") ?? "Conversation",
      others: others.map((p) => p.user),
      preview: last?.body ?? "",
      lastAt: last?.createdAt ?? c.createdAt,
      unread: !!last && (!me?.lastReadAt || me.lastReadAt < last.createdAt),
    };
  });
}

/** Full thread — returns null when the viewer is not a participant. */
export async function openConversation(userId: string, conversationId: string) {
  const convo = await db.conversation.findFirst({
    where: { id: conversationId, participants: { some: { userId } } },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, role: true } } },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });
  if (!convo) return null; // not a participant = does not exist, as far as you know

  return {
    id: convo.id,
    kind: convo.kind as ConversationKind,
    subject: convo.subject,
    participants: convo.participants.map((p) => p.user),
    others: convo.participants.filter((p) => p.userId !== userId).map((p) => p.user),
    messages: convo.messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      author: m.author,
      mine: m.authorId === userId,
    })),
  };
}

export async function isParticipant(userId: string, conversationId: string) {
  const hit = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { id: true },
  });
  return !!hit;
}

export async function markRead(userId: string, conversationId: string) {
  await db.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: new Date() },
  });
}

export async function unreadCount(userId: string): Promise<number> {
  const parts = await db.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true },
  });

  let count = 0;
  for (const p of parts) {
    const newer = await db.message.count({
      where: {
        conversationId: p.conversationId,
        authorId: { not: userId },
        ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
      },
    });
    if (newer > 0) count++;
  }
  return count;
}

/**
 * Who the viewer is allowed to start a conversation with.
 * Staff may reach other staff and collaborators; a collaborator may reach only
 * staff (never another collaborator — they must not be able to enumerate or
 * contact each other through us).
 */
export async function contactableBy(userId: string, role: string) {
  const staffRoles = ["EMPLOYEE", "ADMIN", "CO_FOUNDER", "FOUNDER"];
  const isStaff = staffRoles.includes(role);

  return db.user.findMany({
    where: {
      id: { not: userId },
      role: { in: isStaff ? [...staffRoles, "COLLABORATOR"] : staffRoles },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
}
