import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { productsFor } from "@/lib/products";
import { CreateProductForm, UploadReleaseForm } from "./forms";

const statusTone: Record<string, string> = {
  QUARANTINED: "bg-warning/10 text-warning",
  PUBLISHED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
  REVOKED: "bg-danger/10 text-danger",
};

export default async function PublisherPage() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) redirect("/app");
  const account = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true },
  });
  if (!account?.mfaEnabled) redirect("/app/security");

  const products = await productsFor(session.user.id, session.user.role);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-medium tracking-[-0.02em]">Products</h1>
      <p className="mt-2 text-text-secondary">
        Product registry and release pipeline. Uploads land in quarantine;
        publishing requires founder review and signing.
      </p>

      <section className="mt-10 rounded-card border border-border-subtle bg-surface-raised p-7">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
          New product
        </h2>
        <div className="mt-5 max-w-lg">
          <CreateProductForm />
        </div>
      </section>

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
          <UploadReleaseForm productId={p.id} />
        </section>
      ))}
    </div>
  );
}
