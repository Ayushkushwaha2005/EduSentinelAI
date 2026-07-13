"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { assertCapability } from "@/lib/guard";
import { getCompany } from "@/lib/company";
import { invitationEmail, send } from "@/lib/mail";
import { createInvitation, inviteError } from "@/lib/invitations";
import { isCapability } from "@/lib/permissions";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { sanitizeLine } from "@/lib/sanitize";

/*
 * Invitations (Phase 7.1).
 *
 * `people.invite` is grantable, so a Co-Founder can bring an engineer on board.
 * What they CANNOT do is baked into lib/invitations.ts and re-checked here:
 * invite a peer or a superior, invite a Founder or Co-Founder, or attach
 * capabilities (that is `permissions.grant`, which is founder-reserved).
 */

export type InviteState = { error?: string; notice?: string };

export async function sendInvitation(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const actor = await assertCapability("people.invite");

  const email = sanitizeLine(formData.get("email"), 120).toLowerCase();
  const role = String(formData.get("role") ?? "");
  const message = sanitizeLine(formData.get("message"), 300) || undefined;

  // Capabilities only reach the invitation if the actor is the Founder — the gate
  // below refuses otherwise, rather than silently dropping them.
  const capabilities = formData
    .getAll("capabilities")
    .map(String)
    .filter((c) => isCapability(c));

  const problem = inviteError({
    actorId: actor.id,
    actorRole: actor.role,
    email,
    role,
    capabilities,
  });
  if (problem) return { error: problem };

  // An existing account is not invited — it is managed. Sending an invitation to
  // someone who already has a login would either do nothing or quietly create a
  // second identity for the same person.
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return {
      error: "That address already has an account — change their role below instead.",
    };
  }

  const { invitation, token } = await createInvitation({
    actorId: actor.id,
    actorRole: actor.role,
    actorEmail: actor.email,
    email,
    role,
    capabilities,
    message,
  });

  const company = await getCompany();
  const mail = invitationEmail({
    token,
    roleLabel: ROLE_LABELS[role as Role] ?? role,
    inviter: actor.name,
    company: company.name,
    message,
    expiresAt: invitation.expiresAt,
  });
  const result = await send(email, mail.subject, mail.body, "invitation");

  const ctx = await requestContext();
  await audit("people.invited", {
    actorId: actor.id,
    detail: `${email} as ${role}${capabilities.length ? ` (+${capabilities.join(",")})` : ""}`,
    ...ctx,
  });

  revalidatePath("/app/access");

  // The invitation EXISTS even if the mail failed — so say so plainly rather than
  // reporting success and leaving the Founder to wonder why nobody arrived. They
  // can resend.
  if (!result.ok) {
    return {
      error: `Invitation created, but the email could not be sent: ${result.error ?? "unknown error"}. Use Resend below.`,
    };
  }
  return {
    notice:
      result.status === "DEV_OUTBOX"
        ? `Invitation written to storage/outbox (no mail provider configured).`
        : `Invitation sent to ${email}.`,
  };
}

/** Resend: issues a NEW token and supersedes the old one. Never re-sends the old link. */
export async function resendInvitation(formData: FormData): Promise<void> {
  const actor = await assertCapability("people.invite");
  const id = formData.get("id") as string;
  if (!id) return;

  const existing = await db.invitation.findUnique({ where: { id } });
  if (!existing || existing.status !== "PENDING") return;

  /*
   * A fresh token, not the old one.
   *
   * We could not resend the original even if we wanted to: only its hash is
   * stored, which is the point. But it is worth being explicit that this is a
   * feature, not a limitation — resending extends the window, and the old link
   * stops working the moment the new one is issued (createInvitation supersedes
   * every pending invitation for the address).
   */
  const { invitation, token } = await createInvitation({
    actorId: actor.id,
    actorRole: actor.role,
    actorEmail: actor.email,
    email: existing.email,
    role: existing.role,
    capabilities: JSON.parse(existing.capabilities || "[]"),
    message: existing.message ?? undefined,
  });

  const company = await getCompany();
  const mail = invitationEmail({
    token,
    roleLabel: ROLE_LABELS[existing.role as Role] ?? existing.role,
    inviter: actor.name,
    company: company.name,
    message: existing.message,
    expiresAt: invitation.expiresAt,
  });
  await send(existing.email, mail.subject, mail.body, "invitation");

  const ctx = await requestContext();
  await audit("people.invite_resent", {
    actorId: actor.id,
    detail: existing.email,
    ...ctx,
  });
  revalidatePath("/app/access");
}

export async function revokeInvitation(formData: FormData): Promise<void> {
  const actor = await assertCapability("people.invite");
  const id = formData.get("id") as string;
  if (!id) return;

  const invitation = await db.invitation.findUnique({ where: { id } });
  if (!invitation || invitation.status !== "PENDING") return;

  await db.invitation.update({
    where: { id },
    data: { status: "REVOKED", revokedAt: new Date() },
  });

  const ctx = await requestContext();
  await audit("people.invite_revoked", {
    actorId: actor.id,
    detail: invitation.email,
    ...ctx,
  });
  revalidatePath("/app/access");
}
