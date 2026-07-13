"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { assertCapability } from "@/lib/guard";
import { grantError, isCapability } from "@/lib/permissions";
import { roleChangeError } from "@/lib/authz";

export type ActionState = { error?: string; ok?: string };

/*
 * Access Control actions — founder-reserved.
 *
 * Both capabilities used here (`permissions.grant`, `users.manage_roles`) are in
 * FOUNDER_RESERVED, so assertCapability can only ever succeed for the Founder:
 * effectiveCapabilities() strips them from every other account regardless of
 * what the PermissionGrant table says. The role check is therefore enforced by
 * the capability system itself, not by a string comparison that could drift.
 */

export async function setRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let actor;
  try {
    actor = await assertCapability("users.manage_roles");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const targetId = String(formData.get("userId") ?? "");
  const newRole = String(formData.get("role") ?? "");

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, email: true },
  });
  if (!target) return { error: "Account not found." };

  const denial = roleChangeError({
    actorId: actor.id,
    actorRole: actor.role,
    targetId: target.id,
    targetRole: target.role,
    newRole,
  });
  const ctx = await requestContext();
  if (denial) {
    await audit("admin.role_change_denied", {
      actorId: actor.id,
      detail: `${target.email}: ${target.role} -> ${newRole} (${denial})`,
      ...ctx,
    });
    return { error: denial };
  }

  await db.user.update({
    where: { id: target.id },
    // Bump sessionVersion so the change applies immediately (R2 revocation).
    data: { role: newRole, sessionVersion: { increment: 1 } },
  });
  await audit("admin.role_change", {
    actorId: actor.id,
    detail: `${target.email}: ${target.role} -> ${newRole}`,
    ...ctx,
  });

  revalidatePath("/app/access");
  return { ok: `${target.email} is now ${newRole}.` };
}

/** Grant (allow=true) or revoke (allow=false) a single capability for one person. */
export async function setPermissionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let actor;
  try {
    actor = await assertCapability("permissions.grant");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const targetId = String(formData.get("userId") ?? "");
  const capability = String(formData.get("capability") ?? "");
  const allow = formData.get("allow") === "true";
  const reason = String(formData.get("reason") ?? "").slice(0, 200) || null;

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, email: true },
  });
  if (!target) return { error: "Account not found." };

  const denial = grantError({
    actorId: actor.id,
    actorRole: actor.role,
    targetId: target.id,
    targetRole: target.role,
    capability,
  });
  const ctx = await requestContext();
  if (denial) {
    await audit("admin.permission_denied", {
      actorId: actor.id,
      detail: `${target.email}: ${capability} (${denial})`,
      ...ctx,
    });
    return { error: denial };
  }
  if (!isCapability(capability)) return { error: "Unknown capability." };

  /*
   * Expiry (Phase 7.4). `PermissionGrant.expiresAt` has existed since Phase 5 and
   * effectiveCapabilities() has always honoured it — but nothing could ever SET
   * it, so every grant was permanent in practice. Temporary access that quietly
   * becomes permanent is how a company ends up not knowing who can do what.
   *
   * A grant with no expiry is still allowed, and is the default — but it is now a
   * choice the Founder makes rather than the only thing on offer.
   */
  const days = Number(formData.get("expiresInDays") ?? 0);
  const expiresAt =
    Number.isFinite(days) && days > 0
      ? new Date(Date.now() + Math.trunc(days) * 86_400_000)
      : null;

  await db.permissionGrant.upsert({
    where: { userId_capability: { userId: target.id, capability } },
    create: {
      userId: target.id,
      capability,
      allow,
      grantedBy: actor.id,
      reason,
      expiresAt,
    },
    update: { allow, grantedBy: actor.id, reason, expiresAt },
  });

  // Force re-authorization everywhere: the new capability set must not wait
  // for the old JWT to expire.
  await db.user.update({
    where: { id: target.id },
    data: { sessionVersion: { increment: 1 } },
  });

  await audit(allow ? "admin.permission_grant" : "admin.permission_revoke", {
    actorId: actor.id,
    detail: `${target.email}: ${capability}${reason ? ` — ${reason}` : ""}`,
    ...ctx,
  });

  revalidatePath("/app/access");
  return {
    ok:
      `${allow ? "Granted" : "Revoked"} ${capability} for ${target.email}` +
      (expiresAt ? ` until ${expiresAt.toLocaleDateString("en-GB")}.` : "."),
  };
}

/*
 * OFFBOARDING (Phase 7.3) — one action, everything that must happen.
 *
 * Founder-reserved (`people.offboard`). Offboarding is the mirror image of role
 * management: if handing out access is the Founder's alone, so is taking it away —
 * it is also, in the wrong hands, how you silence someone who has noticed
 * something.
 *
 * The ACCOUNT IS NOT DELETED, and that is deliberate. Deletion would orphan
 * everything they touched and tell us nothing about what happened; the audit chain
 * (R7b) snapshots the actor precisely so a record survives the person. What is
 * removed is ACCESS: role, capabilities, sessions, pending invitations, ownership
 * of things the company still needs.
 *
 * The audit chain still verifies afterwards — that is the Phase 5.6 fix earning
 * its keep, and test:invites re-proves it.
 */
export async function offboard(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await assertCapability("people.offboard");

  const targetId = String(formData.get("userId") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const reason = String(formData.get("reason") ?? "").slice(0, 200) || null;

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, email: true, name: true },
  });
  if (!target) return { error: "Account not found." };

  // The Founder Trust Model, at the one door that could otherwise walk around it:
  // offboarding the Founder would be a demotion by another name.
  if (target.role === "FOUNDER") {
    const ctx = await requestContext();
    await audit("people.offboard_denied", {
      actorId: actor.id,
      detail: `${target.email}: the FOUNDER account cannot be offboarded`,
      ...ctx,
    });
    return { error: "The Founder account cannot be offboarded." };
  }
  if (target.id === actor.id) return { error: "You cannot offboard yourself." };

  // Typing the email is the confirmation. An irreversible action should cost more
  // than a click landing where you did not mean it to.
  if (confirm.trim().toLowerCase() !== target.email.toLowerCase()) {
    return { error: "Type the person's email address to confirm." };
  }

  const founderId = actor.id;

  await db.$transaction(async (tx) => {
    // Products they own become the Founder's, rather than becoming unreachable:
    // ownership scoping (R12) means an orphaned product is a product nobody can
    // administer, including to take it down.
    await tx.product.updateMany({
      where: { ownerId: target.id },
      data: { ownerId: founderId },
    });
    // Every explicit capability, gone.
    await tx.permissionGrant.deleteMany({ where: { userId: target.id } });
    // Any invitation they sent that nobody has accepted yet.
    await tx.invitation.updateMany({
      where: { invitedById: target.id, status: "PENDING" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    // Off the org chart, and their collaborations end — but their ACCOUNT record
    // and their history stay, because those are facts.
    await tx.orgMember.deleteMany({ where: { userId: target.id } });
    await tx.collaboration.updateMany({
      where: { userId: target.id, status: { not: "ENDED" } },
      data: { status: "ENDED", endedAt: new Date() },
    });
    // Team memberships and assigned work released.
    await tx.teamMember.deleteMany({ where: { userId: target.id } });
    await tx.task.updateMany({
      where: { assigneeId: target.id, status: { not: "DONE" } },
      data: { assigneeId: null },
    });
    // Role stripped and every session revoked — they are signed out everywhere,
    // now, not when a JWT happens to expire.
    await tx.user.update({
      where: { id: target.id },
      data: { role: "USER", sessionVersion: { increment: 1 } },
    });
  });

  const ctx = await requestContext();
  await audit("people.offboarded", {
    actorId: actor.id,
    detail: `${target.email} (was ${target.role})${reason ? ` — ${reason}` : ""}`,
    ...ctx,
  });

  revalidatePath("/app/access");
  revalidatePath("/app/people");
  revalidatePath("/app/organization");
  return {
    ok: `${target.name} has been offboarded: role stripped, permissions removed, sessions revoked.`,
  };
}

/*
 * Quarterly access review (Phase 7.3). The Continuous Security Track has always
 * said "quarterly founder access reviews"; this is the surface that makes that a
 * fact with rows behind it rather than a sentence in a policy document.
 */
export async function recordAccessReview(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await assertCapability("permissions.grant");

  const note = String(formData.get("note") ?? "").slice(0, 300) || null;
  const revokeIds = formData.getAll("revoke").map(String).filter(Boolean);

  const grants = await db.permissionGrant.findMany({
    where: { id: { in: revokeIds } },
    select: { id: true, userId: true, capability: true },
  });

  if (grants.length > 0) {
    await db.permissionGrant.deleteMany({ where: { id: { in: grants.map((g) => g.id) } } });
    // Anyone whose access changed is signed out, so the new answer takes effect now.
    for (const userId of new Set(grants.map((g) => g.userId))) {
      await db.user.update({
        where: { id: userId },
        data: { sessionVersion: { increment: 1 } },
      });
    }
  }

  const elevated = await db.permissionGrant.count({ where: { allow: true } });

  await db.accessReview.create({
    data: {
      reviewerId: actor.id,
      accounts: elevated,
      revoked: grants.length,
      note,
    },
  });

  const ctx = await requestContext();
  await audit("admin.access_review", {
    actorId: actor.id,
    detail: `${grants.length} grant(s) revoked${note ? ` — ${note}` : ""}`,
    ...ctx,
  });

  revalidatePath("/app/access");
  return {
    ok:
      grants.length > 0
        ? `Access review recorded. ${grants.length} grant(s) revoked.`
        : "Access review recorded — everything confirmed as-is.",
  };
}

/** Drop an override so the person falls back to their role's default set. */
export async function clearPermissionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let actor;
  try {
    actor = await assertCapability("permissions.grant");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const targetId = String(formData.get("userId") ?? "");
  const capability = String(formData.get("capability") ?? "");

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { email: true },
  });
  if (!target) return { error: "Account not found." };

  await db.permissionGrant
    .delete({ where: { userId_capability: { userId: targetId, capability } } })
    .catch(() => null); // already absent = already at role default

  await db.user.update({
    where: { id: targetId },
    data: { sessionVersion: { increment: 1 } },
  });

  const ctx = await requestContext();
  await audit("admin.permission_reset", {
    actorId: actor.id,
    detail: `${target.email}: ${capability} reset to role default`,
    ...ctx,
  });

  revalidatePath("/app/access");
  return { ok: `Reset ${capability} to the role default.` };
}

/** Sign every device of one account out immediately. */
export async function revokeSessionsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let actor;
  try {
    actor = await assertCapability("users.manage_roles");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const targetId = String(formData.get("userId") ?? "");
  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, role: true },
  });
  if (!target) return { error: "Account not found." };
  if (target.role === "FOUNDER") return { error: "The Founder account cannot be modified." };

  await db.user.update({
    where: { id: target.id },
    data: { sessionVersion: { increment: 1 } },
  });

  const ctx = await requestContext();
  await audit("admin.session_revoke", {
    actorId: actor.id,
    detail: target.email,
    ...ctx,
  });

  revalidatePath("/app/access");
  return { ok: `All sessions revoked for ${target.email}.` };
}
