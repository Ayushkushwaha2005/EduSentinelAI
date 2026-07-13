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

  await db.permissionGrant.upsert({
    where: { userId_capability: { userId: target.id, capability } },
    create: {
      userId: target.id,
      capability,
      allow,
      grantedBy: actor.id,
      reason,
    },
    update: { allow, grantedBy: actor.id, reason },
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
    ok: `${allow ? "Granted" : "Revoked"} ${capability} for ${target.email}.`,
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
