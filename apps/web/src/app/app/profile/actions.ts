"use server";

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { requireViewer } from "@/lib/guard";
import { checkAvatar, MAX_AVATAR_BYTES } from "@/lib/images";
import { sanitizeLine, sanitizeUserText } from "@/lib/sanitize";

/*
 * Own-account profile (Phase 6.2). Gated on requireViewer, not a capability:
 * every role manages their own profile through this one surface, exactly as every
 * role manages their own security through /app/security.
 *
 * What these actions CANNOT do, by construction:
 *   - change a role  (Access Control, founder-reserved)
 *   - grant a capability  (ditto)
 *   - touch mfaEnabled / totpSecret / sessionVersion  (/app/security)
 *   - write to anyone else's record  (every query is `where: { id: viewer.id }`)
 *
 * The Prisma `data` object is built field-by-field from a parsed schema — never
 * spread from FormData — so an attacker adding `role=FOUNDER` to the form body
 * finds nothing on the other side that reads it.
 */

const AVATAR_DIR = path.join(process.cwd(), "storage", "avatars");

export type ProfileState = { error?: string; notice?: string };

const Profile = z.object({
  name: z.string().trim().min(1, "Your name cannot be empty.").max(80),
  title: z.string().trim().max(80).optional(),
  pronouns: z.string().trim().max(32).optional(),
  timezone: z.string().trim().max(64).optional(),
  location: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(600).optional(),
});

function orNull(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  return s.length ? s : null;
}

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const viewer = await requireViewer();

  const parsed = Profile.safeParse({
    name: formData.get("name"),
    title: formData.get("title"),
    pronouns: formData.get("pronouns"),
    timezone: formData.get("timezone"),
    location: formData.get("location"),
    phone: formData.get("phone"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const d = parsed.data;

  // Sanitized on write. A display name is not decoration — it reaches the
  // directory, the message center, CSV exports and (in Phase 7) email. It is
  // user input and it is treated as untrusted, like every other user input.
  await db.user.update({
    where: { id: viewer.id },
    data: {
      name: sanitizeLine(d.name, 80),
      title: orNull(sanitizeLine(d.title, 80)),
      pronouns: orNull(sanitizeLine(d.pronouns, 32)),
      timezone: orNull(sanitizeLine(d.timezone, 64)),
      location: orNull(sanitizeLine(d.location, 80)),
      phone: orNull(sanitizeLine(d.phone, 40)),
      bio: orNull(sanitizeUserText(d.bio, 600)),
    },
  });

  const ctx = await requestContext();
  await audit("user.profile_updated", { actorId: viewer.id, ...ctx });
  revalidatePath("/app/profile");
  revalidatePath("/app");
  return { notice: "Profile saved." };
}

export async function updateNotifications(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const viewer = await requireViewer();

  // Security-critical mail (MFA changes, password resets, incident notices) has
  // no switch here on purpose — you do not get to mute the alarm.
  await db.user.update({
    where: { id: viewer.id },
    data: {
      notifyDigest: formData.get("notifyDigest") === "on",
      notifyMentions: formData.get("notifyMentions") === "on",
      notifyProduct: formData.get("notifyProduct") === "on",
    },
  });

  const ctx = await requestContext();
  await audit("user.notification_prefs_updated", { actorId: viewer.id, ...ctx });
  revalidatePath("/app/profile");
  return { notice: "Notification preferences saved." };
}

/**
 * Avatar upload. The bytes are magic-byte validated, capped, dimension-checked
 * and STRIPPED OF METADATA (lib/images.ts) — what we persist is what came back
 * from the stripper, never what was uploaded. Storage is outside the web root
 * under a generated name; the file is only ever served by /api/avatar, which
 * requires a session.
 */
export async function uploadAvatar(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const viewer = await requireViewer();
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Images must be 2 MB or smaller." };
  }

  const check = checkAvatar(new Uint8Array(await file.arrayBuffer()));
  if (!check.ok) return { error: check.error };

  const previous = await db.user.findUnique({
    where: { id: viewer.id },
    select: { avatarName: true },
  });

  const storageName = `${randomBytes(16).toString("hex")}.${check.ext}`;
  await mkdir(AVATAR_DIR, { recursive: true });
  await writeFile(path.join(AVATAR_DIR, storageName), check.bytes);

  await db.user.update({
    where: { id: viewer.id },
    data: { avatarName: storageName, avatarMime: check.mime, avatarAt: new Date() },
  });

  // Best-effort cleanup of the file we just replaced. It is already unreachable
  // (nothing points at it), so a failure here leaks disk, not data.
  if (previous?.avatarName) {
    await unlink(path.join(AVATAR_DIR, previous.avatarName)).catch(() => null);
  }

  const ctx = await requestContext();
  await audit("user.avatar_updated", { actorId: viewer.id, ...ctx });
  revalidatePath("/app/profile");
  revalidatePath("/app");
  return { notice: "Photo updated." };
}

export async function removeAvatar(): Promise<void> {
  const viewer = await requireViewer();
  const current = await db.user.findUnique({
    where: { id: viewer.id },
    select: { avatarName: true },
  });

  await db.user.update({
    where: { id: viewer.id },
    data: { avatarName: null, avatarMime: null, avatarAt: null },
  });
  if (current?.avatarName) {
    await unlink(path.join(AVATAR_DIR, current.avatarName)).catch(() => null);
  }

  const ctx = await requestContext();
  await audit("user.avatar_removed", { actorId: viewer.id, ...ctx });
  revalidatePath("/app/profile");
  revalidatePath("/app");
}

/**
 * Password change. Re-authentication is required — the current password must be
 * presented — because a live session is not proof that the person at the keyboard
 * is the account holder, and a password change is exactly the action an attacker
 * on a borrowed session wants.
 *
 * Every other session is revoked on success (R2): if someone else was signed in
 * as you, changing the password is how you evict them.
 */
const Password = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    // Same policy as signup and reset (10) — a second, different rule for the
    // same secret is how policies drift apart.
    next: z.string().min(10, "Password must be at least 10 characters").max(256),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    message: "The new passwords do not match.",
  })
  .refine((v) => v.next !== v.current, {
    message: "That is your current password.",
  });

export async function changePassword(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const viewer = await requireViewer();
  const parsed = Password.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const user = await db.user.findUnique({
    where: { id: viewer.id },
    select: { passwordHash: true },
  });
  if (!user || !(await verify(user.passwordHash, parsed.data.current))) {
    const ctx = await requestContext();
    await audit("user.password_change_failed", { actorId: viewer.id, ...ctx });
    return { error: "That is not your current password." };
  }

  await db.user.update({
    where: { id: viewer.id },
    data: {
      passwordHash: await hash(parsed.data.next, {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      }),
      sessionVersion: { increment: 1 }, // evict every other session
    },
  });

  const ctx = await requestContext();
  await audit("user.password_changed", { actorId: viewer.id, ...ctx });
  return {
    notice: "Password changed. Every other session has been signed out.",
  };
}
