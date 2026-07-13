import { requireCapability } from "@/lib/guard";
import { productsFor } from "@/lib/products";
import { parseList } from "@/lib/catalog";
import { Breadcrumb, Panel } from "@/components/dashboard/widgets";
import { UploadReleaseForm } from "./forms";
import { NewProductPanel, ProductRow } from "./product-row";

/*
 * Product management — the catalogue console.
 *
 * Viewing is `products.view`; editing is `products.manage`; publishing and
 * archiving are `products.publish`; permanent deletion is `products.delete`
 * (founder-reserved). Reads are ownership-scoped (R12), so a viewer only ever
 * sees products they own — the Founder sees all.
 */
export default async function ProductsPage() {
  const viewer = await requireCapability("products.view");
  const canManage = viewer.can("products.manage");
  const canPublish = viewer.can("products.publish");
  const canDelete = viewer.can("products.delete");
  const canUpload = viewer.can("releases.upload");

  const products = await productsFor(viewer.id, viewer.role);

  const live = products.filter((p) => p.status === "PUBLISHED").length;
  const drafts = products.filter((p) => p.status === "DRAFT").length;
  const archived = products.filter((p) => p.status === "ARCHIVED").length;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        trail={[{ label: "Dashboards", href: "/app" }, { label: "Products" }]}
      />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Products</h1>
        <p className="mt-1 max-w-3xl text-[15px] text-text-secondary">
          The EduSentinel catalogue. What you publish here is what the public site
          shows — products, pages and the download center all read from this
          record. Uploads still land in quarantine and only the Founder signs a
          release.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Live" value={live} tone="text-success" />
        <Stat label="Drafts" value={drafts} tone="text-text-secondary" />
        <Stat label="Archived" value={archived} tone="text-warning" />
      </div>

      {canManage && <NewProductPanel />}

      <Panel>
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
          Catalogue <span className="text-text-muted">({products.length})</span>
        </h2>

        {products.length === 0 ? (
          <p className="py-12 text-center text-text-muted">
            {canManage
              ? "No products yet — add the first one above."
              : "You do not own any products yet."}
          </p>
        ) : (
          <div className="mt-5 flex flex-col gap-4">
            {products.map((p) => (
              <ProductRow
                key={p.id}
                canManage={canManage}
                canPublish={canPublish}
                canDelete={canDelete}
                product={{
                  id: p.id,
                  slug: p.slug,
                  name: p.name,
                  tagline: p.tagline ?? "",
                  description: p.description,
                  icon: p.icon,
                  pricing: p.pricing,
                  tags: parseList(p.tags),
                  features: parseList(p.features),
                  ctaLabel: p.ctaLabel,
                  ctaHref: p.ctaHref,
                  sortOrder: p.sortOrder,
                  featured: p.featured,
                  status: p.status,
                }}
                releases={p.releases.map((r) => ({
                  id: r.id,
                  version: r.version,
                  status: r.status,
                  scanStatus: r.artifact?.scanStatus ?? null,
                  sha256: r.artifact?.sha256 ?? null,
                }))}
                uploadForm={canUpload ? <UploadReleaseForm productId={p.id} /> : undefined}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-card bg-surface-raised p-5">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-[-0.02em] ${tone}`}>{value}</p>
    </div>
  );
}
