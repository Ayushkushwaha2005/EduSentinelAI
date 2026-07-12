"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";
import { auth, verifyTotp } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { encryptSecret } from "@/lib/crypto";

export type MfaSetup = { otpauthUri: string; qrDataUrl: string; manualKey: string };
export type MfaState = { error?: string; setup?: MfaSetup; done?: boolean };

/** Step 1: generate + store (encrypted, still disabled) a TOTP secret. */
export async function startMfaSetup(): Promise<MfaState> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer: "EduSentinel AI",
    label: session.user.email ?? session.user.id,
    secret,
    digits: 6,
    period: 30,
  });
  await db.user.update({
    where: { id: session.user.id },
    data: { totpSecret: encryptSecret(secret.base32), mfaEnabled: false },
  });
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
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
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

/** Disable MFA — requires a live code (not available to ADMIN/FOUNDER, for whom MFA is mandatory). */
export async function disableMfa(
  _prev: MfaState,
  formData: FormData,
): Promise<MfaState> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "ADMIN" || session.user.role === "FOUNDER") {
    return { error: "MFA is mandatory for administrator accounts." };
  }
  const user = await db.user.findUnique({ where: { id: session.user.id } });
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
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
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
  const session = await auth();
  if (!session?.user) redirect("/login");
  await db.user.update({
    where: { id: session.user.id },
    data: { sessionVersion: { increment: 1 } },
  });
  const ctx = await requestContext();
  await audit("user.sessions_revoked", { actorId: session.user.id, ...ctx });
  redirect("/login");
}
