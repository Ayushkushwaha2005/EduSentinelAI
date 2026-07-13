import Link from "next/link";
import { SplitHeading } from "./section";
import { Stagger, Item, HoverCard } from "./motion";
import { ProductIcon } from "@/lib/product-icons";
import { publicProducts, type CatalogProduct } from "@/lib/catalog";

/*
 * Products grid — now driven by the catalogue the Founder manages from the
 * dashboard (lib/catalog.ts). Only PUBLISHED products appear here; adding a new
 * EduSentinel product is a row, not a deploy.
 *
 * Everything rendered below is plain text sanitized on write, and the icon is a
 * key into a fixed set — a product record cannot inject markup into this page.
 */
const badgeTones = {
  free: "bg-surface-overlay text-text-secondary",
  paid: "bg-ink text-surface-raised",
  soon: "bg-brand-teal/10 text-brand-teal",
};

export async function ProductsSection() {
  const products = await publicProducts();
  if (products.length === 0) return null;

  return (
    <section id="products" className="mx-auto max-w-[1360px] px-6 pb-24 md:px-10 md:pb-32">
      <SplitHeading
        title="Products built for digital trust."
        aside="Real tools from the EduSentinel ecosystem — every one privacy-first, every one on a single account."
      />
      <Stagger className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <Item key={p.id} className="h-full">
            <ProductCard product={p} />
          </Item>
        ))}
      </Stagger>
    </section>
  );
}

export function ProductCard({ product: p }: { product: CatalogProduct }) {
  return (
    <HoverCard className="group h-full">
      <div className="flex h-full flex-col rounded-card border border-border-subtle bg-surface-raised p-7 transition-colors duration-300 group-hover:border-brand-teal/40 md:p-8">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-surface-base text-brand-teal">
            <ProductIcon icon={p.icon} size={24} />
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeTones[p.pricing]}`}
          >
            {p.pricing === "soon" ? "Coming Soon" : p.pricing === "paid" ? "Paid" : "Free"}
          </span>
        </div>

        <h3 className="mt-5 text-lg font-semibold tracking-tight">
          <Link href={`/products/${p.slug}`} className="hover:text-brand-teal">
            {p.name}
          </Link>
        </h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
          {p.tagline || p.description}
        </p>

        {p.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border-subtle bg-surface-base px-2.5 py-1 text-[12px] font-medium text-text-muted"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <ul className="mt-4 flex-1 space-y-2">
          {p.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[14px] text-text-secondary">
              <svg
                width="15"
                height="15"
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

        <Link
          href={p.ctaHref}
          className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-text-primary transition-colors hover:text-brand-teal"
        >
          {p.ctaLabel}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 8h10m0 0L9 4m4 4l-4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </HoverCard>
  );
}
