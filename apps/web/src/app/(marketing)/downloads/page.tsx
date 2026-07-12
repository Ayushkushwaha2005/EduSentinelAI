import type { Metadata } from "next";
import { SplitHeading } from "@/components/section";
import { Reveal, Stagger, Item } from "@/components/motion";
import { publishedReleases, revokedReleases } from "@/lib/products";
import { downloadUrl } from "@/lib/artifacts";

export const metadata: Metadata = {
  title: "Download Center",
  description:
    "Verified, signed downloads for EduSentinel AI products — every artifact ships with a published SHA-256 checksum and signature.",
};

export const dynamic = "force-dynamic"; // signed URLs are per-request

export default async function DownloadsPage() {
  const [releases, revoked] = await Promise.all([
    publishedReleases(),
    revokedReleases(),
  ]);

  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-32 pt-20 md:px-10">
      <div className="pt-16 md:pt-24">
        <SplitHeading
          title="Download Center"
          aside="Every artifact is signed and published with its SHA-256 checksum. Verify before you install — that's the whole point."
        />
      </div>

      <Stagger className="mt-16 grid gap-5 md:grid-cols-2">
        {releases.map((r) => (
          <Item key={r.id} className="h-full">
            <div className="flex h-full flex-col rounded-card border border-border-subtle bg-surface-raised p-7">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight">{r.product.name}</h2>
                <span className="text-sm text-text-muted">v{r.version}</span>
              </div>
              <p className="mt-1.5 text-[15px] text-text-secondary">{r.product.description}</p>
              {r.notes && <p className="mt-3 text-sm text-text-muted">{r.notes}</p>}
              {r.artifact && (
                <div className="mt-4 space-y-1.5 border-t border-border-subtle pt-4 text-xs text-text-muted">
                  <p>
                    <span className="font-medium text-text-secondary">SHA-256</span>{" "}
                    <code className="break-all">{r.artifact.sha256}</code>
                  </p>
                  <p>
                    {(r.artifact.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                    {r.artifact.downloadCount} downloads · scan {r.artifact.scanStatus}
                  </p>
                </div>
              )}
              {r.artifact && (
                <a
                  href={downloadUrl(r.artifact.id)}
                  className="mt-6 inline-flex h-11 w-fit items-center rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover"
                >
                  Download
                </a>
              )}
            </div>
          </Item>
        ))}
        {releases.length === 0 && (
          <p className="text-[15px] text-text-muted">
            No published downloads yet — check back soon.
          </p>
        )}
      </Stagger>

      <Reveal className="mt-14 rounded-card border border-border-subtle bg-surface-raised/50 p-6 text-sm text-text-secondary">
        <p>
          Verify any download:{" "}
          <code className="text-xs">sha256sum &lt;file&gt;</code> and compare to
          the checksum shown above. Our signing public key is at{" "}
          <a href="/signing-key.pem" className="text-brand-teal underline underline-offset-4">
            /signing-key.pem
          </a>
          .
        </p>
      </Reveal>

      {revoked.length > 0 && (
        <Reveal className="mt-8 rounded-card border border-danger/30 bg-danger/5 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-danger">
            Revoked releases
          </h3>
          <ul className="mt-3 space-y-1.5 text-sm text-text-secondary">
            {revoked.map((r) => (
              <li key={r.id}>
                <span className="font-medium">{r.product.name} v{r.version}</span> —{" "}
                {r.revokeReason}
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </main>
  );
}
