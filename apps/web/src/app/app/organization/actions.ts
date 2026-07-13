"use server";

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { requireFounder } from "@/lib/guard";
import { checkAvatar } from "@/lib/images";
import { cleanMemberInput, isVisibility, serializeLinks } from "@/lib/org";
import { sanitizeLine, sanitizeUserText } from "@/lib/sanitize";

/*
 * Organization management (Phase 6.5) — FOUNDER ONLY.
 *
 * `org.manage` is founder-reserved (lib/permissions.ts), so `requireFounder()` and
 * the capability check say the same thing. Both are here on purpose: the reserved
 * set is the law, and this is the door.
 *
 * Why reserved rather than grantable: someone who can edit the org chart can add
 * themselves to it as CTO and publish that to the marketing site. That is not an
 * operational chore — it is the company's public statement about who it is.
 *
 * Every write revalidates the PUBLIC pages as well as the dashboard, because the
 * whole point of this milestone is that one edit lands everywhere at once.
 */

const BRAND_DIR = path.join(process.cwd(), "storage", "brand");

export type OrgState = { error?: string; notice?: string };

/** One edit changes the org chart, the directory, the company page and the home rail. */
function revalidateEverywhere() {
  revalidatePath("/app/organization");
  revalidatePath("/app/people");
  revalidatePath("/company");
  revalidatePath("/");
  revalidatePath("/app");
}

export async function saveMember(_prev: OrgState, formData: FormData): Promise<OrgState> {
  const founder = await requireFounder();

  const id = (formData.get("id") as string) || null;
  const clean = cleanMemberInput({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    designation: formData.get("designation"),
    bio: formData.get("bio"),
  });

  // A linked member takes their name from their account, so the org row does not
  // need one. An unlinked member (an advisor, an investor) is nothing without one.
  const userId = (formData.get("userId") as string) || null;
  if (!userId && !clean.name) {
    return { error: "A member with no linked account needs a name." };
  }
  if (!clean.designation) return { error: "Give this person a designation." };

  const visibilityRaw = formData.get("visibility");
  const visibility = isVisibility(visibilityRaw) ? visibilityRaw : "INTERNAL";

  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const departmentId = (formData.get("departmentId") as string) || null;
  const teamId = (formData.get("teamId") as string) || null;

  // The link is unique: one account is one person on the chart. Catching it here
  // gives a sentence instead of a Prisma constraint error.
  if (userId) {
    const taken = await db.orgMember.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (taken && taken.id !== id) {
      return { error: "That account is already on the org chart." };
    }
  }

  const data = {
    ...clean,
    userId,
    designation: clean.designation,
    departmentId,
    teamId,
    visibility,
    sortOrder: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
    links: serializeLinks(formData.get("links")),
  };

  const ctx = await requestContext();
  if (id) {
    await db.orgMember.update({ where: { id }, data });
    await audit("org.member_updated", {
      actorId: founder.id,
      detail: `${data.designation}: ${clean.name || userId}`,
      ...ctx,
    });
  } else {
    await db.orgMember.create({ data });
    await audit("org.member_added", {
      actorId: founder.id,
      detail: `${data.designation}: ${clean.name || userId}`,
      ...ctx,
    });
  }

  revalidateEverywhere();
  return { notice: id ? "Member updated." : "Member added." };
}

export async function removeMember(formData: FormData): Promise<void> {
  const founder = await requireFounder();
  const id = formData.get("id") as string;
  if (!id) return;

  const member = await db.orgMember.findUnique({
    where: { id },
    select: { name: true, designation: true, photoName: true },
  });
  if (!member) return;

  await db.orgMember.delete({ where: { id } });
  // Removing someone from the ORG CHART does not touch their ACCOUNT. Those are
  // different facts about a person and conflating them here would mean an
  // org-chart tidy-up silently revoked someone's access.
  if (member.photoName) {
    await unlink(path.join(BRAND_DIR, member.photoName)).catch(() => null);
  }

  const ctx = await requestContext();
  await audit("org.member_removed", {
    actorId: founder.id,
    detail: `${member.designation}: ${member.name}`,
    ...ctx,
  });
  revalidateEverywhere();
}

/**
 * Photo for a member with no linked account. A linked member's photo IS their
 * profile avatar (Phase 6.2) — uploading a second one here would create exactly
 * the duplicate this milestone exists to remove, so it is refused.
 */
export async function uploadMemberPhoto(
  _prev: OrgState,
  formData: FormData,
): Promise<OrgState> {
  const founder = await requireFounder();
  const id = formData.get("id") as string;
  const file = formData.get("photo");

  const member = await db.orgMember.findUnique({
    where: { id },
    select: { userId: true, photoName: true, name: true },
  });
  if (!member) return { error: "That member no longer exists." };
  if (member.userId) {
    return {
      error:
        "This person has an account — their photo comes from their own profile, so there is only ever one of it.",
    };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  // Same pipeline as avatars: magic bytes, size cap, EXIF/GPS stripped, no SVG.
  const check = checkAvatar(new Uint8Array(await file.arrayBuffer()));
  if (!check.ok) return { error: check.error };

  const storageName = `${randomBytes(16).toString("hex")}.${check.ext}`;
  await mkdir(BRAND_DIR, { recursive: true });
  await writeFile(path.join(BRAND_DIR, storageName), check.bytes);

  await db.orgMember.update({
    where: { id },
    data: { photoName: storageName, photoMime: check.mime, photoAt: new Date() },
  });
  if (member.photoName) {
    await unlink(path.join(BRAND_DIR, member.photoName)).catch(() => null);
  }

  const ctx = await requestContext();
  await audit("org.member_photo_updated", {
    actorId: founder.id,
    detail: member.name,
    ...ctx,
  });
  revalidateEverywhere();
  return { notice: "Photo updated." };
}

export async function saveDepartment(
  _prev: OrgState,
  formData: FormData,
): Promise<OrgState> {
  const founder = await requireFounder();

  const id = (formData.get("id") as string) || null;
  const name = sanitizeLine(formData.get("name"), 60);
  if (!name) return { error: "A department needs a name." };

  const slug =
    sanitizeLine(formData.get("slug"), 60).toLowerCase().replace(/[^a-z0-9-]+/g, "-") ||
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const description = sanitizeUserText(formData.get("description"), 300) || null;
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  const clash = await db.department.findFirst({
    where: { OR: [{ name }, { slug }], ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (clash) return { error: "A department with that name already exists." };

  const data = {
    name,
    slug,
    description,
    sortOrder: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
  };
  if (id) await db.department.update({ where: { id }, data });
  else await db.department.create({ data });

  const ctx = await requestContext();
  await audit(id ? "org.department_updated" : "org.department_added", {
    actorId: founder.id,
    detail: name,
    ...ctx,
  });
  revalidateEverywhere();
  return { notice: id ? "Department updated." : "Department added." };
}

export async function removeDepartment(formData: FormData): Promise<void> {
  const founder = await requireFounder();
  const id = formData.get("id") as string;
  if (!id) return;

  const dept = await db.department.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!dept) return;

  // Members and teams are NOT deleted with the department — the schema's SetNull
  // sees to that. Deleting a department is a reorganization, not a redundancy.
  await db.department.delete({ where: { id } });

  const ctx = await requestContext();
  await audit("org.department_removed", {
    actorId: founder.id,
    detail: dept.name,
    ...ctx,
  });
  revalidateEverywhere();
}

/** Move a team under a department (or out of one). */
export async function assignTeamDepartment(formData: FormData): Promise<void> {
  const founder = await requireFounder();
  const teamId = formData.get("teamId") as string;
  const departmentId = (formData.get("departmentId") as string) || null;
  if (!teamId) return;

  await db.team.update({ where: { id: teamId }, data: { departmentId } });

  const ctx = await requestContext();
  await audit("org.team_assigned", { actorId: founder.id, detail: teamId, ...ctx });
  revalidateEverywhere();
}
