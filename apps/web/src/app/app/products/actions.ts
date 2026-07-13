"use server";

import { createHash, randomBytes } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { ownedProduct } from "@/lib/products";
import { detectArtifactType, MAX_ARTIFACT_BYTES } from "@/lib/artifacts";
import { scanArtifact } from "@/lib/scanner";
import { assertCapability } from "@/lib/guard";
import type { Capability } from "@/lib/permissions";

export type PublishState = { error?: string; ok?: string };

const STORAGE = path.join(process.cwd(), "storage");

/*
 * Publisher gate, now capability-based: registering a product (`products.manage`)
 * and uploading an artifact (`releases.upload`) are distinct powers, so the
 * Founder can grant one without the other. MFA for privileged roles is enforced
 * inside assertCapability. Writes stay ownership-scoped via lib/products.ts.
 */
async function publisher(cap: Capability): Promise<{ id: string; role: string } | null> {
  try {
    const viewer = await assertCapability(cap);
    return { id: viewer.id, role: viewer.role };
  } catch {
    return null;
  }
}

const productSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,60}$/, "Slug: lowercase letters, digits, hyphens"),
  description: z.string().trim().min(10).max(500),
});

export async function createProductAction(
  _prev: PublishState,
  formData: FormData,
): Promise<PublishState> {
  const actor = await publisher("products.manage");
  if (!actor) return { error: "Creating a product requires the products.manage permission and MFA." };

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.product.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return { error: "That slug is already in use." };

  const product = await db.product.create({
    data: { ...parsed.data, ownerId: actor.id },
  });
  const ctx = await requestContext();
  await audit("product.created", {
    actorId: actor.id,
    detail: `${product.slug} (${product.id})`,
    ...ctx,
  });
  revalidatePath("/app/products");
  return { ok: `Product "${product.name}" created.` };
}

export async function uploadReleaseAction(
  _prev: PublishState,
  formData: FormData,
): Promise<PublishState> {
  const actor = await publisher("releases.upload");
  if (!actor) return { error: "Uploading a release requires the releases.upload permission and MFA." };

  const productId = formData.get("productId") as string;
  const version = ((formData.get("version") as string) ?? "").trim();
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;
  const file = formData.get("file");

  if (!/^\d+\.\d+(\.\d+)?([-.][a-z0-9]+)*$/i.test(version)) {
    return { error: "Version must look like 1.0.0" };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > MAX_ARTIFACT_BYTES) {
    return { error: "File exceeds the 100 MB limit." };
  }

  // R12: ownership enforced structurally.
  const product = await ownedProduct(productId, actor.id, actor.role);
  if (!product) return { error: "Product not found." };

  const buf = Buffer.from(await file.arrayBuffer());

  // R5: magic-byte allowlist — extension and client MIME are never trusted.
  const kind = detectArtifactType(buf.subarray(0, 8));
  if (!kind) {
    return {
      error: "Unsupported file format (allowed: zip/crx/apk, tar.gz, pdf).",
    };
  }

  const sha256 = createHash("sha256").update(buf).digest("hex");
  const storageName = `${randomBytes(16).toString("hex")}.bin`;
  await mkdir(path.join(STORAGE, "quarantine"), { recursive: true });
  const quarantinePath = path.join(STORAGE, "quarantine", storageName);
  await writeFile(quarantinePath, buf);

  const release = await db.release.create({
    data: {
      productId: product.id,
      version,
      notes,
      createdById: actor.id,
      artifact: {
        create: {
          fileName: file.name.slice(0, 120),
          storageName,
          size: buf.length,
          mime: file.type || "application/octet-stream",
          sha256,
        },
      },
    },
  });
  const ctx = await requestContext();
  await audit("release.uploaded", {
    actorId: actor.id,
    detail: `${product.slug}@${version} sha256=${sha256.slice(0, 12)}… (${kind})`,
    ...ctx,
  });

  // Automated scan (adapter); result recorded, quarantine holds either way.
  const scan = await scanArtifact(quarantinePath, sha256);
  await db.artifact.update({
    where: { releaseId: release.id },
    data: { scanStatus: scan.status, scanDetail: scan.detail },
  });
  if (scan.status === "FLAGGED") {
    await audit("release.scan_flagged", {
      actorId: actor.id,
      detail: `${product.slug}@${version}: ${scan.detail}`,
      ...ctx,
    });
  }

  revalidatePath("/app/products");
  revalidatePath("/app/admin/releases");
  return {
    ok: `Release ${version} uploaded to quarantine (scan: ${scan.status}). Founder review required before publishing.`,
  };
}
