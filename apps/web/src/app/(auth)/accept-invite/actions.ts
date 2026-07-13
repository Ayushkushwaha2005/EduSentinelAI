"use server";

import { hash } from "@node-rs/argon2";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { claimInvitation, findInvitation } from "@/lib/invitations";
import { sanitizeLine } from "@/lib/sanitize";

/*
 * Accepting an invitation (Phase 7.1).
 *
 * This is the ONLY path that turns an invitation into an account, and it is the
 * one place in the product where an unauthenticated request results in a role
 * above USER. It therefore does exactly what the invitation says and nothing else:
 *
 *   - The role comes from the INVITATION ROW, never from the form. A field named
 *     `role` in the request body is ignored, because nothing here reads one.
 *   - The email comes from the invitation row too. You cannot accept an invitation
 *     addressed to someone else by typing your own address.
 *   - The token is claimed ATOMICALLY (claimInvitation), so two people racing the
 *     same link produce one account, not two.
 *   - Capabilities were validated when the invitation was written AND are
 *     re-validated on read (parseCapabilities), so a reserved capability cannot
 *     travel in on a forged or corrupted row.
 *
 * The account is created email-verified: the person proved control of the address
 * by opening a single-use link sent to it, which is the same proof the
 * verification flow asks for.
 */

const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export type AcceptState = { error?: string };

const Accept = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(2, "Please enter your name").max(100),
  password: z.string().min(10, "Password must be at least 10 characters").max(256),
});

export async function acceptInvitation(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const parsed = Accept.safeParse({
    token: formData.get("token"),
    name: formData.get("name"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { token, name, password } = parsed.data;

  const invitation = await findInvitation(token);
  if (!invitation) {
    return { error: "This invitation is no longer valid. Ask for a new one." };
  }

  // Between the invitation being written and the link being opened, someone may
  // have signed up with that address the ordinary way.
  const existing = await db.user.findUnique({
    where: { email: invitation.email },
    select: { id: true },
  });
  if (existing) {
    return { error: "An account already exists for this address. Sign in instead." };
  }

  const user = await db.user.create({
    data: {
      email: invitation.email, // from the invitation, NOT from the form
      name: sanitizeLine(name, 100),
      passwordHash: await hash(password, ARGON2_OPTS),
      role: invitation.role, // from the invitation, NOT from the form
      emailVerified: new Date(),
    },
  });

  // Claim AFTER the account exists, and atomically: if the claim loses a race, the
  // account we just made must not keep the role. Rolling it back is the honest
  // outcome — better a confusing error than a second account holding a role
  // nobody granted it.
  const claimed = await claimInvitation(token, user.id);
  if (!claimed) {
    await db.user.delete({ where: { id: user.id } }).catch(() => null);
    return { error: "This invitation was already used. Ask for a new one." };
  }

  // Starting capabilities, if the Founder attached any. Re-validated on read.
  for (const capability of invitation.capabilities) {
    await db.permissionGrant.create({
      data: {
        userId: user.id,
        capability,
        allow: true,
        grantedBy: "invitation",
        reason: `Attached to the invitation for ${invitation.email}`,
      },
    });
  }

  const ctx = await requestContext();
  await audit("people.invite_accepted", {
    actorId: user.id,
    detail: `${invitation.email} as ${invitation.role}`,
    ...ctx,
  });

  // Straight into the workspace. A privileged role lands in MFA onboarding on
  // arrival (the Phase 5.8 gate in /app/layout), which is exactly where it should.
  await signIn("credentials", {
    email: invitation.email,
    password,
    redirectTo: "/app",
  });

  return {};
}
