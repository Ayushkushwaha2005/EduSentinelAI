"use server";

import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import { Prisma } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { signIn } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createAuthToken, consumeAuthToken } from "@/lib/tokens";
import { sendMail, appUrl } from "@/lib/mailer";
import { checkHuman } from "@/lib/bot-defense";

// OWASP-recommended argon2id parameters
const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

const signupSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").toLowerCase(),
  password: z.string().min(10, "Password must be at least 10 characters").max(256),
});

export type FormState = {
  error?: string;
  notice?: string;
  mfaRequired?: boolean;
};

async function ipKey(scope: string) {
  const { ip } = await requestContext();
  return `${scope}:${ip ?? "unknown"}`;
}

export async function signupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // R1: per-IP limit — 5 signups / 10 minutes.
  if (!rateLimit(await ipKey("signup"), 5, 10 * 60_000)) {
    return { error: "Too many attempts. Please try again later." };
  }

  // Phase 4 gate: bot defense (honeypot + signed timing token).
  const human = checkHuman(formData);
  if (!human.ok) {
    const ctx = await requestContext();
    await audit("user.signup_bot_blocked", { detail: human.reason, ...ctx });
    return { error: "We couldn't verify this submission. Please try again." };
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await hash(password, ARGON2_OPTS);
  let user;
  try {
    user = await db.user.create({
      data: { name, email, passwordHash }, // role defaults to USER
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "An account with this email already exists." };
    }
    throw err;
  }
  const ctx = await requestContext();
  await audit("user.signup", { actorId: user.id, ...ctx });

  // R9: email verification (single-use, 24h expiry).
  const token = await createAuthToken(user.id, "verify-email");
  await sendMail(
    email,
    "Verify your EduSentinel AI email",
    `Welcome to EduSentinel AI, ${name}.\n\nVerify your email address:\n${appUrl(`/verify-email?token=${token}`)}\n\nThis link expires in 24 hours.`,
  );

  try {
    await signIn("credentials", { email, password, redirectTo: "/app" });
  } catch (err) {
    if (err instanceof AuthError) redirect("/login");
    throw err; // NEXT_REDIRECT on success
  }
  return {};
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // R1: per-IP limit — 10 attempts / 5 minutes (account lockout is separate).
  if (!rateLimit(await ipKey("login"), 10, 5 * 60_000)) {
    return { error: "Too many attempts. Please try again later." };
  }

  const next = (formData.get("next") as string) || "/app";
  const redirectTo = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      code: (formData.get("code") as string) || undefined,
      redirectTo,
    });
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      if (err.code === "mfa") {
        return {
          mfaRequired: true,
          notice: "Enter the 6-digit code from your authenticator app.",
        };
      }
      if (err.code === "locked") {
        return {
          error: "Account temporarily locked after repeated failures. Try again later.",
        };
      }
      return { error: "Invalid email or password." };
    }
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw err; // NEXT_REDIRECT on success
  }
  redirect(redirectTo);
}

export async function forgotPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!rateLimit(await ipKey("forgot"), 5, 10 * 60_000)) {
    return { error: "Too many attempts. Please try again later." };
  }
  const email = z
    .string()
    .trim()
    .email()
    .toLowerCase()
    .safeParse(formData.get("email"));
  // Identical response either way — no account enumeration.
  const notice =
    "If an account exists for that address, a reset link has been sent.";
  if (!email.success) return { notice };

  const user = await db.user.findUnique({ where: { email: email.data } });
  if (user) {
    const ctx = await requestContext();
    await audit("user.password_reset_requested", { actorId: user.id, ...ctx });
    const token = await createAuthToken(user.id, "reset-password");
    await sendMail(
      email.data,
      "Reset your EduSentinel AI password",
      `Reset your password:\n${appUrl(`/reset-password?token=${token}`)}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore it.`,
    );
  }
  return { notice };
}

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!rateLimit(await ipKey("reset"), 10, 10 * 60_000)) {
    return { error: "Too many attempts. Please try again later." };
  }
  const token = formData.get("token") as string;
  const password = z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(256)
    .safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };

  const userId = token ? await consumeAuthToken(token, "reset-password") : null;
  if (!userId) {
    return { error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await hash(password.data, ARGON2_OPTS);
  // R2: bump sessionVersion — every existing session dies with the reset.
  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      failedLogins: 0,
      lockedUntil: null,
      sessionVersion: { increment: 1 },
    },
  });
  const ctx = await requestContext();
  await audit("user.password_reset", { actorId: userId, ...ctx });
  redirect("/login?reset=1");
}
