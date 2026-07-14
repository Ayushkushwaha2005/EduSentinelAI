"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { assertCapability, requireViewer } from "@/lib/guard";
import { checkAttachment, displayName } from "@/lib/attachments";
import { holdersOf, notify, notifyMany } from "@/lib/notifications";
import {
  canRespond,
  canSee,
  isCategory,
  isPriority,
  isSupportStatus,
} from "@/lib/support";
import { sanitizeLine, sanitizeUserText } from "@/lib/sanitize";

/*
 * Support Center actions (Phase 9).
 *
 * Raising a request needs only a session — anyone who can sign in can ask for
 * help, including a collaborator. Everything else (replying as staff, assigning,
 * resolving) needs `support.respond`, and every one of those actions re-checks it
 * server-side.
 *
 * NOTIFICATIONS ARE GENERATED HERE, FROM REAL EVENTS — and they carry a name and a
 * link, never the body. The body of a support request is untrusted text from a
 * stranger; copying it into a notification would push it into a bell, a list and
 * (in a later phase) a digest email, past every check that would otherwise have
 * sanitized its context.
 */

const SUPPORT_DIR = path.join(process.cwd(), "storage", "support");

export type SupportState = { error?: string; notice?: string };

export async function raiseRequest(
  _prev: SupportState,
  formData: FormData,
): Promise<SupportState> {
  const viewer = await requireViewer();

  const subject = sanitizeLine(formData.get("subject"), 120);
  const body = sanitizeUserText(formData.get("body"), 4000);
  const category = formData.get("category");
  const priority = formData.get("priority");

  if (!subject) return { error: "Give your request a subject." };
  if (!body) return { error: "Describe what you need." };
  if (!isCategory(category)) return { error: "Choose a category." };
  if (!isPriority(priority)) return { error: "Choose a priority." };

  const file = formData.get("attachment");
  let attachment: { storageName: string; fileName: string; mime: string; size: number } | null =
    null;

  if (file instanceof File && file.size > 0) {
    // Magic bytes, size cap, allowlist. The filename and the browser's MIME are
    // chosen by whoever chose the file, so neither is consulted.
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = checkAttachment(bytes);
    if (!check.ok) return { error: check.error };

    const storageName = `${randomBytes(16).toString("hex")}.${check.ext}`;
    await mkdir(SUPPORT_DIR, { recursive: true });
    await writeFile(path.join(SUPPORT_DIR, storageName), bytes);
    attachment = {
      storageName,
      fileName: displayName(file.name),
      mime: check.mime,
      size: bytes.length,
    };
  }

  const request = await db.supportRequest.create({
    data: {
      requesterId: viewer.id,
      subject,
      category,
      priority,
      messages: { create: [{ authorId: viewer.id, body }] },
      ...(attachment
        ? {
            attachments: {
              create: [{ ...attachment, uploadedById: viewer.id }],
            },
          }
        : {}),
    },
  });

  const ctx = await requestContext();
  await audit("support.raised", {
    actorId: viewer.id,
    detail: `${category}/${priority}: ${subject}`,
    ...ctx,
  });

  // The people told about the work are exactly the people who can do it —
  // holdersOf() resolves the capability the same way authorization does, so the
  // two lists cannot drift apart.
  //
  // Note what is NOT here: the body. A notification carries the subject (which the
  // requester wrote as a title, and which staff will see anyway) and a link.
  await notifyMany(await holdersOf("support.respond"), {
    kind: "support.raised",
    title: "New support request",
    body: `${viewer.name} · ${priority.toLowerCase()} priority`,
    href: `/app/support/${request.id}`,
  });

  redirect(`/app/support/${request.id}`);
}

export async function reply(_prev: SupportState, formData: FormData): Promise<SupportState> {
  const viewer = await requireViewer();

  const requestId = String(formData.get("requestId") ?? "");
  const body = sanitizeUserText(formData.get("body"), 4000);
  const internal = formData.get("internal") === "on";

  if (!body) return { error: "Write a reply." };

  const request = await db.supportRequest.findUnique({
    where: { id: requestId },
    select: { id: true, requesterId: true, assigneeId: true, firstResponseAt: true, status: true },
  });
  // Same answer for "not yours" and "does not exist".
  if (!request || !canSee(viewer, request.requesterId)) {
    return { error: "That request is not available." };
  }

  const staff = canRespond(viewer);
  // An internal note is a staff thing. A requester ticking a hidden checkbox in
  // devtools does not get to write one — and would gain nothing if they did,
  // since it is their own thread; but the flag is refused rather than trusted.
  const isInternal = internal && staff;

  await db.$transaction(async (tx) => {
    await tx.supportMessage.create({
      data: { requestId: request.id, authorId: viewer.id, body, internal: isInternal },
    });

    // The SLA clock stops on the first STAFF reply that the requester can actually
    // see. An internal note is not a response to the person waiting.
    const stampFirst = staff && !isInternal && !request.firstResponseAt;
    await tx.supportRequest.update({
      where: { id: request.id },
      data: {
        ...(stampFirst ? { firstResponseAt: new Date() } : {}),
        ...(staff && request.status === "OPEN" ? { status: "IN_PROGRESS" } : {}),
        updatedAt: new Date(),
      },
    });
  });

  const ctx = await requestContext();
  await audit("support.replied", {
    actorId: viewer.id,
    detail: `${request.id}${isInternal ? " (internal)" : ""}`,
    ...ctx,
  });

  // An internal note notifies nobody outside the staff — that is what makes it
  // internal. A visible reply reaches the other side of the conversation.
  if (isInternal) {
    if (request.assigneeId && request.assigneeId !== viewer.id) {
      await notify({
        userId: request.assigneeId,
        kind: "support.replied",
        title: "Internal note on your request",
        href: `/app/support/${request.id}`,
      });
    }
  } else if (staff) {
    await notify({
      userId: request.requesterId,
      kind: "support.replied",
      title: "Reply to your support request",
      href: `/app/support/${request.id}`,
    });
  } else {
    // The requester wrote back: tell whoever owns it, or the queue if nobody does.
    const targets = request.assigneeId
      ? [request.assigneeId]
      : await holdersOf("support.respond");
    await notifyMany(targets, {
      kind: "support.replied",
      title: "New reply on a support request",
      href: `/app/support/${request.id}`,
    });
  }

  revalidatePath(`/app/support/${request.id}`);
  revalidatePath("/app/support");
  return { notice: isInternal ? "Internal note added." : "Reply sent." };
}

/** Assign, re-prioritize, resolve. Staff only, and audited. */
export async function updateRequest(
  _prev: SupportState,
  formData: FormData,
): Promise<SupportState> {
  const actor = await assertCapability("support.respond");

  const id = String(formData.get("id") ?? "");
  const status = formData.get("status");
  const priority = formData.get("priority");
  const assigneeId = (formData.get("assigneeId") as string) || null;

  const request = await db.supportRequest.findUnique({ where: { id } });
  if (!request) return { error: "That request no longer exists." };

  if (!isSupportStatus(status)) return { error: "Invalid status." };
  if (!isPriority(priority)) return { error: "Invalid priority." };

  // Only someone who can actually answer may be handed the request. Assigning work
  // to a person who cannot open it would look like progress and be the opposite.
  if (assigneeId) {
    const { effectiveCapabilities } = await import("@/lib/permissions");
    const caps = await effectiveCapabilities(assigneeId);
    if (!caps.has("support.respond")) {
      return { error: "That person cannot open support requests." };
    }
  }

  const resolving =
    (status === "RESOLVED" || status === "CLOSED") && !request.resolvedAt;

  await db.supportRequest.update({
    where: { id },
    data: {
      status,
      priority,
      assigneeId,
      ...(resolving ? { resolvedAt: new Date() } : {}),
      // Reopening clears the resolution stamp, so "time to resolve" never counts a
      // request that came back.
      ...(status === "OPEN" || status === "IN_PROGRESS" ? { resolvedAt: null } : {}),
    },
  });

  const ctx = await requestContext();
  await audit("support.updated", {
    actorId: actor.id,
    detail: `${id}: ${status}/${priority}${assigneeId ? " assigned" : ""}`,
    ...ctx,
  });

  if (assigneeId && assigneeId !== request.assigneeId && assigneeId !== actor.id) {
    await notify({
      userId: assigneeId,
      kind: "support.assigned",
      title: "A support request was assigned to you",
      body: request.subject.slice(0, 120),
      href: `/app/support/${id}`,
    });
  }
  if (resolving) {
    await notify({
      userId: request.requesterId,
      kind: "support.resolved",
      title: "Your support request was resolved",
      href: `/app/support/${id}`,
    });
  }

  revalidatePath(`/app/support/${id}`);
  revalidatePath("/app/support");
  return { notice: "Request updated." };
}
