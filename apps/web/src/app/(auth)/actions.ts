"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { Prisma } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { signIn } from "@/lib/auth";

// OWASP-recommended argon2id parameters
const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

const signupSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").toLowerCase(),
  password: z.string().min(10, "Password must be at least 10 characters").max(256),
});

export type FormState = { error?: string };

export async function signupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
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
    // Unique-constraint race: a concurrent signup won; same outcome as the
    // findUnique check above.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "An account with this email already exists." };
    }
    throw err;
  }
  await audit("user.signup", { actorId: user.id });

  // Sign the new user in and land them on the dashboard. If auto sign-in
  // fails for any reason, the account still exists — send them to login
  // rather than surfacing an error page.
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
  const next = (formData.get("next") as string) || "/app";
  // Only allow internal redirect targets.
  const redirectTo = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw err; // NEXT_REDIRECT on success
  }
  redirect(redirectTo);
}
