"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { audit, requestContext } from "@/lib/audit";
import { sanitizeLine } from "@/lib/sanitize";

export type ModerationState = { error?: string; ok?: boolean };

async function requireModerator() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) return null;
  const account = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true },
  });
  if (!account?.mfaEnabled) return null;
  return session.user.id;
}

const COLLAB_STATUSES = ["APPROVED", "REJECTED", "SPAM"];

export async function moderateCollaborationAction(
  _prev: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  const moderatorId = await requireModerator();
  if (!moderatorId) return { error: "Moderation requires an admin role with MFA." };

  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  const note = sanitizeLine(formData.get("note"), 300);
  if (!COLLAB_STATUSES.includes(status)) return { error: "Invalid action." };

  const request = await db.collaborationRequest.findUnique({ where: { id } });
  if (!request) return { error: "Request not found." };

  await db.collaborationRequest.update({
    where: { id },
    data: {
      status,
      reviewedAt: new Date(),
      reviewedBy: moderatorId,
      reviewNote: note || null,
    },
  });
  const ctx = await requestContext();
  await audit("collaboration.moderated", {
    actorId: moderatorId,
    detail: `${request.email} -> ${status}`,
    ...ctx,
  });
  revalidatePath("/app/admin/collaborations");
  return { ok: true };
}

export async function handleAbuseReportAction(
  _prev: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  const moderatorId = await requireModerator();
  if (!moderatorId) return { error: "Moderation requires an admin role with MFA." };

  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!["ACTIONED", "DISMISSED"].includes(status)) return { error: "Invalid action." };

  const report = await db.abuseReport.findUnique({ where: { id } });
  if (!report) return { error: "Report not found." };

  await db.abuseReport.update({
    where: { id },
    data: { status, handledAt: new Date(), handledBy: moderatorId },
  });
  const ctx = await requestContext();
  await audit("abuse.handled", {
    actorId: moderatorId,
    detail: `${report.targetType} -> ${status}`,
    ...ctx,
  });
  revalidatePath("/app/admin/collaborations");
  return { ok: true };
}
