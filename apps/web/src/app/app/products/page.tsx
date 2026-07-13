import { requireCapability } from "@/lib/guard";
import { productsFor } from "@/lib/products";
import { CreateProductForm, UploadReleaseForm } from "./forms";

const statusTone: Record<string, string> = {
  QUARANTINED: "bg-warning/10 text-warning",
  PUBLISHED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
  REVOKED: "bg-danger/10 text-danger",
};

export default async function PublisherPage() {
  // Viewing is `products.view`; creating and uploading are separate
  // capabilities, so the Founder can let someone see the registry without
  // letting them add to it. The list itself is ownership-scoped (R12), so a
  // viewer only ever sees products they own.
  const viewer = await requireCapability("products.view");
  const canManage = viewer.can("products.manage");
  const canUpload = viewer.can("releases.upload");

  const products = await productsFor(viewer.id, viewer.role);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-medium tracking-[-0.02em]">Products</h1>
      <p className="mt-2 text-text-secondary">
        Product registry and release pipeline. Uploads land in quarantine;
        publishing requires founder review and signing.
      </p>

      {canManage && (
        <section className="mt-10 rounded-card border border-border-subtle bg-surface-raised p-7">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
            New product
          </h2>
          <div className="mt-5 max-w-lg">
            <CreateProductForm />
          </div>
        </section>
      )}

      {products.length === 0 && (
        <p className="mt-10 rounded-card border border-border-subtle bg-surface-raised p-10 text-center text-text-muted">
          You do not own any products yet.
        </p>
      )}

      {products.map((p) => (
        <section key={p.id} className="mt-6 rounded-card border border-border-subtle bg-surface-raised p-7">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-tight">{p.name}</h2>
            <code className="text-xs text-text-muted">{p.slug}</code>
          </div>
          <p className="mt-1 text-sm text-text-secondary">{p.description}</p>
          {p.releases.length > 0 && (
            <ul className="mt-4 space-y-2">
              {p.releases.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium">v{r.version}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone[r.status] ?? ""}`}>
                    {r.status}
                  </span>
                  {r.artifact && (
                    <>
                      <span className="text-text-muted">scan: {r.artifact.scanStatus}</span>
                      <code className="text-xs text-text-muted">
                        sha256 {r.artifact.sha256.slice(0, 16)}…
                      </code>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canUpload && <UploadReleaseForm productId={p.id} />}
        </section>
      ))}
    </div>
  );
}
