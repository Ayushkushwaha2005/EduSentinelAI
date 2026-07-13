"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { sanitizeLine } from "@/lib/sanitize";
import { assertCapability } from "@/lib/guard";

export type ModerationState = { error?: string; ok?: boolean };

/*
 * Moderation runs on the `collab.moderate` capability, so the Founder can grant
 * it to one person without also handing over products, releases or the account
 * directory. MFA for privileged roles is enforced inside assertCapability.
 */
async function requireModerator(): Promise<string | null> {
  try {
    return (await assertCapability("collab.moderate")).id;
  } catch {
    return null;
  }
}

const COLLAB_STATUSES = ["APPROVED", "REJECTED", "SPAM"];

export async function moderateCollaborationAction(
  _prev: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  const moderatorId = await requireModerator();
  if (!moderatorId) return { error: "Moderation requires the collab.moderate permission and MFA." };

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
  /*
   * Approving a request CREATES THE COLLABORATION (Phase 6.5).
   *
   * This is the seam where the two lists used to diverge. A request was approved,
   * the row's status changed — and nothing anywhere recorded that a collaboration
   * now existed. The People page (accounts) and the Collaboration page (requests)
   * were left describing different populations, and the relationship itself had no
   * home in the schema at all.
   *
   * The record is linked to the request it came from, and to the person's account
   * if they already have one (matched on the verified email they submitted).
   * Idempotent: re-approving does not mint a second collaboration.
   */
  if (status === "APPROVED") {
    const account = await db.user.findUnique({
      where: { email: request.email.toLowerCase() },
      select: { id: true, collaboration: { select: { id: true } } },
    });
    const alreadyLinked = account?.collaboration || (await db.collaboration.findUnique({
      where: { requestId: request.id },
      select: { id: true },
    }));

    if (!alreadyLinked) {
      await db.collaboration.create({
        data: {
          requestId: request.id,
          userId: account?.id ?? null,
          name: request.name,
          org: request.org,
          email: request.email,
          kind: request.kind,
          status: "ACTIVE",
          summary: request.message.slice(0, 300),
          createdBy: moderatorId,
        },
      });
    }
  }

  const ctx = await requestContext();
  await audit("collaboration.moderated", {
    actorId: moderatorId,
    detail: `${request.email} -> ${status}`,
    ...ctx,
  });
  revalidatePath("/app/collaborations");
  revalidatePath("/app/admin/collaborations");
  return { ok: true };
}

export async function handleAbuseReportAction(
  _prev: ModerationState,
  formData: FormData,
): Promise<ModerationState> {
  const moderatorId = await requireModerator();
  if (!moderatorId) return { error: "Moderation requires the collab.moderate permission and MFA." };

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
  revalidatePath("/app/collaborations");
  revalidatePath("/app/admin/collaborations");
  return { ok: true };
}
