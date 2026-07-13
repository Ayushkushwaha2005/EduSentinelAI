"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requestContext } from "@/lib/audit";
import { assertCapability } from "@/lib/guard";
import { ownedProduct } from "@/lib/products";
import { isProductIconKey } from "@/lib/product-icons";
import {
  isPricingTone,
  safeHref,
  sanitizeProductText,
  serializeList,
} from "@/lib/catalog";
import { sanitizeLine } from "@/lib/sanitize";

export type CatalogState = { error?: string; ok?: string };

/*
 * Product management — the Founder's catalogue console.
 *
 * Lifecycle: DRAFT -> PUBLISHED -> ARCHIVED (and back), plus permanent delete.
 * Capabilities:
 *   products.manage  — create and edit (draft-level work; grantable)
 *   products.publish — make it public / archive it (grantable, leadership default)
 *   products.delete  — permanent removal (FOUNDER-RESERVED, non-delegable)
 *
 * Every write is ownership-scoped through lib/products.ts (R12) and audited.
 * Publishing a product changes what the whole world sees, so it revalidates the
 * public routes immediately.
 */

const PUBLIC_ROUTES = ["/", "/products", "/downloads"];

function revalidatePublic(slug?: string) {
  for (const r of PUBLIC_ROUTES) revalidatePath(r);
  if (slug) revalidatePath(`/products/${slug}`);
  revalidatePath("/app/products");
}

const detailsSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,60}$/, "Slug: lowercase letters, digits, hyphens"),
  description: z.string().trim().min(10, "Description is too short").max(600),
});

/** Shared field parsing for create + update. */
function readFields(formData: FormData) {
  const icon = String(formData.get("icon") ?? "shield");
  const pricing = String(formData.get("pricing") ?? "free");
  const order = Number(formData.get("sortOrder") ?? 0);

  return {
    tagline: sanitizeLine(formData.get("tagline"), 120).trim() || null,
    icon: isProductIconKey(icon) ? icon : "shield",
    pricing: isPricingTone(pricing) ? pricing : "free",
    tags: serializeList(formData.get("tags")),
    features: serializeList(formData.get("features")),
    ctaLabel: sanitizeLine(formData.get("ctaLabel"), 40).trim() || "Get notified",
    ctaHref: safeHref(formData.get("ctaHref")),
    sortOrder: Number.isFinite(order) ? Math.trunc(order) : 0,
    featured: formData.get("featured") === "on",
  };
}

export async function createCatalogProductAction(
  _prev: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  let actor;
  try {
    actor = await assertCapability("products.manage");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const parsed = detailsSchema.safeParse({
    name: sanitizeLine(formData.get("name"), 80),
    slug: sanitizeLine(formData.get("slug"), 60),
    description: sanitizeProductText(formData.get("description")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (await db.product.findUnique({ where: { slug: parsed.data.slug } }))
    return { error: "That slug is already in use." };

  // New products always start as DRAFT — nothing reaches the public site
  // without a deliberate publish.
  const product = await db.product.create({
    data: {
      ...parsed.data,
      ...readFields(formData),
      ownerId: actor.id,
      status: "DRAFT",
    },
  });

  const ctx = await requestContext();
  await audit("product.created", {
    actorId: actor.id,
    detail: `${product.slug} (draft)`,
    ...ctx,
  });

  revalidatePath("/app/products");
  return { ok: `"${product.name}" created as a draft. Publish it when it's ready.` };
}

export async function updateCatalogProductAction(
  _prev: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  let actor;
  try {
    actor = await assertCapability("products.manage");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const id = String(formData.get("productId") ?? "");
  const existing = await ownedProduct(id, actor.id, actor.role);
  if (!existing) return { error: "Product not found." };

  const parsed = detailsSchema.safeParse({
    name: sanitizeLine(formData.get("name"), 80),
    slug: sanitizeLine(formData.get("slug"), 60),
    description: sanitizeProductText(formData.get("description")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const clash = await db.product.findUnique({ where: { slug: parsed.data.slug } });
  if (clash && clash.id !== existing.id) return { error: "That slug is already in use." };

  const product = await db.product.update({
    where: { id: existing.id },
    data: { ...parsed.data, ...readFields(formData) },
  });

  const ctx = await requestContext();
  await audit("product.updated", { actorId: actor.id, detail: product.slug, ...ctx });

  revalidatePublic(product.slug);
  if (existing.slug !== product.slug) revalidatePath(`/products/${existing.slug}`);
  return { ok: `"${product.name}" updated.` };
}

/** DRAFT/ARCHIVED -> PUBLISHED. This is what puts a product on the public site. */
export async function publishCatalogProductAction(
  _prev: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  let actor;
  try {
    actor = await assertCapability("products.publish");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const id = String(formData.get("productId") ?? "");
  const existing = await ownedProduct(id, actor.id, actor.role);
  if (!existing) return { error: "Product not found." };
  if (existing.status === "PUBLISHED") return { error: "Already published." };

  const product = await db.product.update({
    where: { id: existing.id },
    data: { status: "PUBLISHED", publishedAt: new Date(), archivedAt: null },
  });

  const ctx = await requestContext();
  await audit("product.published", { actorId: actor.id, detail: product.slug, ...ctx });

  revalidatePublic(product.slug);
  return { ok: `"${product.name}" is now live on the public site.` };
}

/** PUBLISHED -> DRAFT. Pulls it from the public site without destroying it. */
export async function unpublishCatalogProductAction(
  _prev: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  let actor;
  try {
    actor = await assertCapability("products.publish");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const id = String(formData.get("productId") ?? "");
  const existing = await ownedProduct(id, actor.id, actor.role);
  if (!existing) return { error: "Product not found." };

  const product = await db.product.update({
    where: { id: existing.id },
    data: { status: "DRAFT", publishedAt: null },
  });

  const ctx = await requestContext();
  await audit("product.unpublished", { actorId: actor.id, detail: product.slug, ...ctx });

  revalidatePublic(product.slug);
  return { ok: `"${product.name}" pulled from the public site (kept as a draft).` };
}

/** Retire a product without losing its releases or its history. */
export async function archiveCatalogProductAction(
  _prev: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  let actor;
  try {
    actor = await assertCapability("products.publish");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const id = String(formData.get("productId") ?? "");
  const existing = await ownedProduct(id, actor.id, actor.role);
  if (!existing) return { error: "Product not found." };

  const product = await db.product.update({
    where: { id: existing.id },
    data: { status: "ARCHIVED", archivedAt: new Date(), publishedAt: null },
  });

  const ctx = await requestContext();
  await audit("product.archived", { actorId: actor.id, detail: product.slug, ...ctx });

  revalidatePublic(product.slug);
  return { ok: `"${product.name}" archived and removed from the public site.` };
}

/**
 * Permanent removal — founder-reserved and non-delegable, because it cannot be
 * undone. Refused while the product still has releases: published artifacts have
 * been distributed and their audit trail must not be orphaned. Archive instead.
 */
export async function deleteCatalogProductAction(
  _prev: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  let actor;
  try {
    actor = await assertCapability("products.delete");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const id = String(formData.get("productId") ?? "");
  const confirm = sanitizeLine(formData.get("confirm"), 80).trim();

  const existing = await db.product.findUnique({
    where: { id },
    include: { releases: { select: { id: true } } },
  });
  if (!existing) return { error: "Product not found." };

  if (confirm !== existing.slug)
    return { error: `Type the slug "${existing.slug}" to confirm deletion.` };

  if (existing.releases.length > 0)
    return {
      error:
        "This product has releases. Deleting it would orphan distributed artifacts and their audit trail — archive it instead.",
    };

  await db.product.delete({ where: { id: existing.id } });

  const ctx = await requestContext();
  await audit("product.deleted", {
    actorId: actor.id,
    detail: `${existing.slug} (${existing.name})`,
    ...ctx,
  });

  revalidatePublic(existing.slug);
  return { ok: `"${existing.name}" permanently deleted.` };
}
