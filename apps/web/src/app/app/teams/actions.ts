"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertCapability } from "@/lib/guard";
import { audit, requestContext } from "@/lib/audit";
import { sanitizeLine } from "@/lib/sanitize";

export type TeamState = { error?: string; ok?: string };

/* Team & project management. Every action is gated on `team.manage`, which is a
 * capability the Founder grants — not a role check, so it can be delegated to
 * an individual without handing over anything else. */

const teamSchema = z.object({
  name: z.string().trim().min(2, "Team name is too short").max(60),
  description: z.string().trim().max(200).optional(),
});

export async function createTeamAction(
  _prev: TeamState,
  formData: FormData,
): Promise<TeamState> {
  let viewer;
  try {
    viewer = await assertCapability("team.manage");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const parsed = teamSchema.safeParse({
    name: sanitizeLine(formData.get("name"), 60),
    description: sanitizeLine(formData.get("description"), 200) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const exists = await db.team.findUnique({ where: { name: parsed.data.name } });
  if (exists) return { error: "A team with that name already exists." };

  const team = await db.team.create({
    data: { name: parsed.data.name, description: parsed.data.description ?? null },
  });

  const ctx = await requestContext();
  await audit("team.create", { actorId: viewer.id, detail: team.name, ...ctx });

  revalidatePath("/app/teams");
  return { ok: `Team "${team.name}" created.` };
}

export async function addMemberAction(
  _prev: TeamState,
  formData: FormData,
): Promise<TeamState> {
  let viewer;
  try {
    viewer = await assertCapability("team.manage");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const teamId = String(formData.get("teamId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const title = sanitizeLine(formData.get("title"), 60) || null;

  const [team, user] = await Promise.all([
    db.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } }),
    db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } }),
  ]);
  if (!team || !user) return { error: "Team or account not found." };

  // Teams are internal. An external collaborator is never a team member —
  // membership implies access to internal workload.
  if (user.role === "COLLABORATOR" || user.role === "USER")
    return { error: "Only staff accounts can join a team." };

  await db.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId, title },
    update: { title },
  });

  const ctx = await requestContext();
  await audit("team.member_add", {
    actorId: viewer.id,
    detail: `${user.email} -> ${team.name}`,
    ...ctx,
  });

  revalidatePath("/app/teams");
  return { ok: `${user.email} added to ${team.name}.` };
}

const projectSchema = z.object({
  name: z.string().trim().min(2, "Project name is too short").max(80),
  progress: z.number().int().min(0).max(100),
});

export async function createProjectAction(
  _prev: TeamState,
  formData: FormData,
): Promise<TeamState> {
  let viewer;
  try {
    viewer = await assertCapability("team.manage");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const teamId = String(formData.get("teamId") ?? "");
  const parsed = projectSchema.safeParse({
    name: sanitizeLine(formData.get("name"), 80),
    progress: Number(formData.get("progress") ?? 0),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const team = await db.team.findUnique({ where: { id: teamId }, select: { name: true } });
  if (!team) return { error: "Team not found." };

  await db.project.create({
    data: { teamId, name: parsed.data.name, progress: parsed.data.progress },
  });

  const ctx = await requestContext();
  await audit("project.create", {
    actorId: viewer.id,
    detail: `${parsed.data.name} (${team.name})`,
    ...ctx,
  });

  revalidatePath("/app/teams");
  return { ok: `Project "${parsed.data.name}" added to ${team.name}.` };
}

export async function setProjectProgressAction(
  _prev: TeamState,
  formData: FormData,
): Promise<TeamState> {
  try {
    await assertCapability("team.manage");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const projectId = String(formData.get("projectId") ?? "");
  const progress = Number(formData.get("progress") ?? 0);
  if (!Number.isInteger(progress) || progress < 0 || progress > 100)
    return { error: "Progress must be between 0 and 100." };

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) return { error: "Project not found." };

  await db.project.update({
    where: { id: projectId },
    data: { progress, status: progress >= 100 ? "DONE" : "ACTIVE" },
  });

  revalidatePath("/app/teams");
  return { ok: "Progress updated." };
}
