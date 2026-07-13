"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";
import { verifyTotp } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { requireViewer } from "@/lib/guard";
import { isAdminRole } from "@/lib/roles";

export type MfaSetup = { otpauthUri: string; qrDataUrl: string; manualKey: string };
export type MfaState = { error?: string; setup?: MfaSetup; done?: boolean };

/**
 * Step 1: issue (or re-show) a TOTP secret. MFA stays OFF until a live code
 * proves the authenticator actually holds it.
 *
 * If a setup is already pending, the SAME secret is shown again rather than a
 * fresh one. Rotating on every call looked harmless but was not: the setup page
 * now opens automatically, so a reload — or a second tab — would silently
 * invalidate the QR the user had just scanned, and their codes would never
 * match. A new secret is minted only when there is nothing pending.
 */
export async function startMfaSetup(): Promise<MfaState> {
  const viewer = await requireViewer();

  const existing = await db.user.findUnique({
    where: { id: viewer.id },
    select: { totpSecret: true, mfaEnabled: true },
  });

  const base32 =
    existing?.totpSecret && !existing.mfaEnabled
      ? decryptSecret(existing.totpSecret) // resume the pending enrolment
      : null;

  const secret = base32 ? Secret.fromBase32(base32) : new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: "EduSentinel AI",
    label: viewer.email,
    secret,
    digits: 6,
    period: 30,
  });

  if (!base32) {
    await db.user.update({
      where: { id: viewer.id },
      data: { totpSecret: encryptSecret(secret.base32), mfaEnabled: false },
    });
  }

  const otpauthUri = totp.toString();
  return {
    setup: {
      otpauthUri,
      qrDataUrl: await QRCode.toDataURL(otpauthUri, { margin: 1, width: 220 }),
      manualKey: secret.base32,
    },
  };
}

/** Step 2: confirm a live code to switch MFA on. */
export async function confirmMfa(
  _prev: MfaState,
  formData: FormData,
): Promise<MfaState> {
  const viewer = await requireViewer();
  const user = await db.user.findUnique({ where: { id: viewer.id } });
  const code = (formData.get("code") as string) ?? "";
  if (!user?.totpSecret || !verifyTotp(user.totpSecret, code)) {
    return { error: "That code didn't match. Try again." };
  }
  await db.user.update({
    where: { id: user.id },
    data: { mfaEnabled: true },
  });
  const ctx = await requestContext();
  await audit("user.mfa_enabled", { actorId: user.id, ...ctx });
  revalidatePath("/app/security");
  return { done: true };
}

/**
 * Disable MFA — requires a live code, and is refused for every privileged role
 * (ADMIN, CO_FOUNDER, FOUNDER), for whom MFA is mandatory. This uses the rank
 * check rather than naming roles: the previous string comparison listed ADMIN
 * and FOUNDER only, so CO_FOUNDER could have switched off its own mandatory MFA.
 */
export async function disableMfa(
  _prev: MfaState,
  formData: FormData,
): Promise<MfaState> {
  const viewer = await requireViewer();
  if (isAdminRole(viewer.role)) {
    return { error: "MFA is mandatory for privileged accounts." };
  }
  const user = await db.user.findUnique({ where: { id: viewer.id } });
  const code = (formData.get("code") as string) ?? "";
  if (!user?.totpSecret || !verifyTotp(user.totpSecret, code)) {
    return { error: "That code didn't match. Try again." };
  }
  await db.user.update({
    where: { id: user.id },
    data: { mfaEnabled: false, totpSecret: null },
  });
  const ctx = await requestContext();
  await audit("user.mfa_disabled", { actorId: user.id, ...ctx });
  revalidatePath("/app/security");
  return { done: true };
}

/** R9: resend the email-verification link (single-use, supersedes prior links). */
export async function resendVerification(): Promise<{ notice: string }> {
  const viewer = await requireViewer();
  const user = await db.user.findUnique({ where: { id: viewer.id } });
  const notice = "Verification link sent — check your inbox.";
  if (!user || user.emailVerified) return { notice };
  const { createAuthToken } = await import("@/lib/tokens");
  const { sendMail, appUrl } = await import("@/lib/mailer");
  const token = await createAuthToken(user.id, "verify-email");
  await sendMail(
    user.email,
    "Verify your EduSentinel AI email",
    `Verify your email address:\n${appUrl(`/verify-email?token=${token}`)}\n\nThis link expires in 24 hours.`,
  );
  const ctx = await requestContext();
  await audit("user.verification_resent", { actorId: user.id, ...ctx });
  return { notice };
}

/** R2: bump sessionVersion — revokes every session, including this one. */
export async function revokeAllSessions() {
  const viewer = await requireViewer();
  await db.user.update({
    where: { id: viewer.id },
    data: { sessionVersion: { increment: 1 } },
  });
  const ctx = await requestContext();
  await audit("user.sessions_revoked", { actorId: viewer.id, ...ctx });
  redirect("/login");
}
