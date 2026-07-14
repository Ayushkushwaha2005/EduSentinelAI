import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicProduct, publicProductSlugs } from "@/lib/catalog";
import { ProductIcon } from "@/lib/product-icons";

/*
 * Public product page. Generated from the catalogue, so a product the Founder
 * adds in the dashboard gets its own URL with no code change. Draft and archived
 * products 404 here — publicProduct() only returns PUBLISHED rows.
 */
export async function generateStaticParams() {
  const rows = await publicProductSlugs();
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await publicProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.tagline || product.description.slice(0, 160),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await publicProduct(slug);
  if (!product) notFound();

  const badge =
    product.pricing === "soon" ? "Coming Soon" : product.pricing === "paid" ? "Paid" : "Free";

  return (
    <main className="pt-20" data-accent="violet">
      <div className="mx-auto max-w-[880px] px-6 pb-24 pt-16 md:px-10 md:pt-24">
        <Link
          href="/products"
          className="text-sm font-medium text-text-secondary transition-colors hover:text-brand-teal"
        >
          ← All products
        </Link>

        <div className="mt-8 flex items-start gap-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border-subtle bg-surface-raised text-brand-teal">
            <ProductIcon icon={product.icon} size={32} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
                {product.name}
              </h1>
              <span className="rounded-full bg-surface-overlay px-3 py-1 text-xs font-semibold text-text-secondary">
                {badge}
              </span>
            </div>
            {product.tagline && (
              <p className="mt-2 text-lg text-text-secondary">{product.tagline}</p>
            )}
          </div>
        </div>

        <p className="mt-10 text-[17px] leading-relaxed text-text-secondary">
          {product.description}
        </p>

        {product.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {product.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border-subtle bg-surface-raised px-3 py-1.5 text-sm font-medium text-text-muted"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {product.features.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">What it does</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {product.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 rounded-card border border-border-subtle bg-surface-raised p-4 text-[15px] text-text-secondary"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-brand-teal"
                  >
                    <path
                      d="M2.5 8.5l3.5 3.5 7.5-8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href={product.ctaHref}
            className="inline-flex h-12 items-center rounded-control bg-ink px-6 text-[15px] font-semibold text-surface-raised transition-colors hover:bg-ink-hover"
          >
            {product.ctaLabel}
          </Link>
          <Link
            href="/downloads"
            className="inline-flex h-12 items-center rounded-control border border-border-subtle px-6 text-[15px] font-semibold transition-colors hover:bg-surface-overlay"
          >
            Signed downloads
          </Link>
        </div>
      </div>
    </main>
  );
}
