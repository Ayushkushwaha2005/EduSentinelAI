"use server";

import { rename, mkdir } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { signDigest, publishBlockedByScan } from "@/lib/artifacts";
import { assertCapability } from "@/lib/guard";
import type { Capability } from "@/lib/permissions";

export type ReviewState = { error?: string; ok?: string };

const STORAGE = path.join(process.cwd(), "storage");

/*
 * Publish/reject/revoke run on founder-reserved capabilities (Founder Trust
 * Model §3: signing-key operations require founder authorization). Because
 * `releases.publish` / `releases.reject` / `releases.revoke` are in
 * FOUNDER_RESERVED, effectiveCapabilities() strips them from every non-founder
 * regardless of any grant row — so this check can only ever succeed for the
 * FOUNDER, and MFA is enforced inside assertCapability.
 */
async function founderActor(cap: Capability): Promise<string | null> {
  try {
    const viewer = await assertCapability(cap);
    return viewer.id;
  } catch {
    return null;
  }
}

export async function publishReleaseAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const founderId = await founderActor("releases.publish");
  if (!founderId) return { error: "Publishing is founder-only and requires MFA." };

  const release = await db.release.findUnique({
    where: { id: formData.get("releaseId") as string },
    include: { artifact: true, product: true },
  });
  if (!release?.artifact || release.status !== "QUARANTINED") {
    return { error: "Release not found or not in quarantine." };
  }
  if (publishBlockedByScan(release.artifact.scanStatus)) {
    return {
      error:
        release.artifact.scanStatus === "FLAGGED"
          ? "Flagged by malware scan — publishing is blocked. Reject it instead."
          : "No malware scanner is configured (VIRUSTOTAL_API_KEY or ClamAV). Publishing unscanned artifacts is blocked in production.",
    };
  }

  // Sign the artifact digest (founder-gated key operation) and promote the
  // file out of quarantine.
  const signature = signDigest(release.artifact.sha256);
  await mkdir(path.join(STORAGE, "artifacts"), { recursive: true });
  await rename(
    path.join(STORAGE, "quarantine", release.artifact.storageName),
    path.join(STORAGE, "artifacts", release.artifact.storageName),
  );
  await db.release.update({
    where: { id: release.id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      artifact: { update: { signature } },
    },
  });
  const ctx = await requestContext();
  await audit("release.published", {
    actorId: founderId,
    detail: `${release.product.slug}@${release.version} sha256=${release.artifact.sha256.slice(0, 12)}…`,
    ...ctx,
  });
  revalidatePath("/app/admin/releases");
  revalidatePath("/downloads");
  return { ok: `Published ${release.product.name} ${release.version}.` };
}

export async function rejectReleaseAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const founderId = await founderActor("releases.reject");
  if (!founderId) return { error: "Review is founder-only and requires MFA." };
  const release = await db.release.findUnique({
    where: { id: formData.get("releaseId") as string },
    include: { product: true },
  });
  if (!release || release.status !== "QUARANTINED") {
    return { error: "Release not found or not in quarantine." };
  }
  await db.release.update({
    where: { id: release.id },
    data: { status: "REJECTED" },
  });
  const ctx = await requestContext();
  await audit("release.rejected", {
    actorId: founderId,
    detail: `${release.product.slug}@${release.version}`,
    ...ctx,
  });
  revalidatePath("/app/admin/releases");
  return { ok: "Release rejected." };
}

/** R5/R7b: one-click global pull with public incident notice. */
export async function revokeReleaseAction(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const founderId = await founderActor("releases.revoke");
  if (!founderId) return { error: "Revocation is founder-only and requires MFA." };
  const reason = ((formData.get("reason") as string) ?? "").trim();
  if (reason.length < 5) return { error: "A public revocation reason is required." };

  const release = await db.release.findUnique({
    where: { id: formData.get("releaseId") as string },
    include: { product: true },
  });
  if (!release || release.status !== "PUBLISHED") {
    return { error: "Release not found or not published." };
  }
  await db.release.update({
    where: { id: release.id },
    data: { status: "REVOKED", revokedAt: new Date(), revokeReason: reason },
  });
  const ctx = await requestContext();
  await audit("release.revoked", {
    actorId: founderId,
    detail: `${release.product.slug}@${release.version}: ${reason}`,
    ...ctx,
  });
  revalidatePath("/app/admin/releases");
  revalidatePath("/downloads");
  return { ok: "Release revoked; downloads disabled and incident notice published." };
}
