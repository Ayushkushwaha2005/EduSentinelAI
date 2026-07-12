"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { roleChangeError } from "@/lib/authz";
import { audit, requestContext } from "@/lib/audit";

export type RoleChangeState = { error?: string; ok?: boolean };

export async function changeRoleAction(
  _prev: RoleChangeState,
  formData: FormData,
): Promise<RoleChangeState> {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    return { error: "Not authorized." };
  }
  // MFA is mandatory before exercising admin powers (R6).
  const actor = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true, role: true },
  });
  if (!actor?.mfaEnabled) {
    return { error: "Enable two-factor authentication before managing roles." };
  }

  const targetId = formData.get("userId") as string;
  const newRole = formData.get("role") as string;
  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, email: true },
  });
  if (!target) return { error: "User not found." };

  // Founder Trust Model rules (SECURITY-ROADMAP §4) — FOUNDER is never
  // grantable or demotable; granting is one-directional and capped.
  const denial = roleChangeError({
    actorId: session.user.id,
    actorRole: actor.role,
    targetId: target.id,
    targetRole: target.role,
    newRole,
  });
  if (denial) {
    const ctx = await requestContext();
    await audit("admin.role_change_denied", {
      actorId: session.user.id,
      detail: `${target.email}: ${target.role} -> ${newRole} (${denial})`,
      ...ctx,
    });
    return { error: denial };
  }

  await db.user.update({
    where: { id: target.id },
    // Bump sessionVersion so the new (or reduced) role applies immediately.
    data: { role: newRole, sessionVersion: { increment: 1 } },
  });
  const ctx = await requestContext();
  await audit("admin.role_change", {
    actorId: session.user.id,
    detail: `${target.email}: ${target.role} -> ${newRole}`,
    ...ctx,
  });
  revalidatePath("/app/admin");
  return { ok: true };
}
