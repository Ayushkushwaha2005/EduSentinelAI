import { db } from "@/lib/db";
import { requireCapability } from "@/lib/guard";
import { publishBlockedByScan } from "@/lib/artifacts";
import { ReviewControls, RevokeControl } from "./review-forms";
import { Breadcrumb } from "@/components/dashboard/widgets";

export default async function ReleaseReviewPage() {
  // Viewing the queue needs `releases.review`; acting on it needs the
  // founder-reserved capabilities, which no grant can hand to anyone else.
  const viewer = await requireCapability("releases.review");
  const isFounder = viewer.can("releases.publish");

  const [pending, published] = await Promise.all([
    db.release.findMany({
      where: { status: "QUARANTINED" },
      orderBy: { createdAt: "asc" },
      include: { product: true, artifact: true },
    }),
    db.release.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: { product: true, artifact: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Releases" }]} />
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Release review</h1>
      <p className="max-w-3xl text-[15px] text-text-secondary">
        Quarantined uploads await founder review. Publishing signs the
        artifact with the platform key; revocation pulls it globally.
        {!isFounder && " (You can view this queue; publish/reject/revoke are founder-only.)"}
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          Quarantine <span className="text-text-muted">({pending.length})</span>
        </h2>
        <div className="mt-4 space-y-4">
          {pending.length === 0 && (
            <p className="text-[15px] text-text-muted">Nothing awaiting review.</p>
          )}
          {pending.map((r) => (
            <div key={r.id} className="rounded-card border border-border-subtle bg-surface-raised p-6">
              <div className="flex flex-wrap items-center gap-3 text-[15px]">
                <span className="font-semibold">{r.product.name}</span>
                <span className="font-medium">v{r.version}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.artifact?.scanStatus === "CLEAN"
                      ? "bg-success/10 text-success"
                      : r.artifact?.scanStatus === "FLAGGED"
                        ? "bg-danger/10 text-danger"
                        : "bg-warning/10 text-warning"
                  }`}
                >
                  scan: {r.artifact?.scanStatus}
                </span>
              </div>
              <p className="mt-2 text-sm text-text-secondary">
                {r.artifact?.fileName} · {((r.artifact?.size ?? 0) / 1024).toFixed(0)} KB ·{" "}
                <code className="text-xs">sha256 {r.artifact?.sha256}</code>
              </p>
              {r.artifact?.scanDetail && (
                <p className="mt-1 text-xs text-text-muted">{r.artifact.scanDetail}</p>
              )}
              {isFounder && (
                <div className="mt-4">
                  <ReviewControls
                    releaseId={r.id}
                    flagged={publishBlockedByScan(r.artifact?.scanStatus ?? "PENDING")}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">
          Published <span className="text-text-muted">({published.length})</span>
        </h2>
        <div className="mt-4 space-y-4">
          {published.map((r) => (
            <div key={r.id} className="rounded-card border border-border-subtle bg-surface-raised p-6">
              <div className="flex flex-wrap items-center gap-3 text-[15px]">
                <span className="font-semibold">{r.product.name}</span>
                <span className="font-medium">v{r.version}</span>
                <span className="text-sm text-text-muted">
                  {r.artifact?.downloadCount ?? 0} downloads
                </span>
              </div>
              {isFounder && (
                <div className="mt-4">
                  <RevokeControl releaseId={r.id} />
                </div>
              )}
            </div>
          ))}
          {published.length === 0 && (
            <p className="text-[15px] text-text-muted">No published releases yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
