import { db } from "./db";

/*
 * Ownership-scoped query helpers (R12). All product/release reads and
 * writes in app code go through these — never raw db.product queries in
 * pages/actions — so a non-founder is structurally unable to touch
 * another owner's rows.
 */

/** Products visible to an actor: FOUNDER sees all, everyone else own only. */
export function productsFor(actorId: string, role: string) {
  return db.product.findMany({
    where: role === "FOUNDER" ? {} : { ownerId: actorId },
    orderBy: { createdAt: "desc" },
    include: {
      releases: {
        orderBy: { createdAt: "desc" },
        include: { artifact: true },
      },
    },
  });
}

/** A single product only if the actor owns it (or is FOUNDER). */
export function ownedProduct(productId: string, actorId: string, role: string) {
  return db.product.findFirst({
    where: {
      id: productId,
      ...(role === "FOUNDER" ? {} : { ownerId: actorId }),
    },
  });
}

/** A release with product, only if actor owns the product (or is FOUNDER). */
export function ownedRelease(releaseId: string, actorId: string, role: string) {
  return db.release.findFirst({
    where: {
      id: releaseId,
      ...(role === "FOUNDER" ? {} : { product: { ownerId: actorId } }),
    },
    include: { product: true, artifact: true },
  });
}

/** Public: published releases for the download center. */
export function publishedReleases() {
  return db.release.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { product: true, artifact: true },
  });
}

/** Public: recently revoked releases (incident notices). */
export function revokedReleases() {
  return db.release.findMany({
    where: { status: "REVOKED" },
    orderBy: { revokedAt: "desc" },
    take: 10,
    include: { product: true },
  });
}
