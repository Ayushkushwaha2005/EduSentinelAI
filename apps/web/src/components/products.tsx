import Link from "next/link";
import { SplitHeading } from "./section";
import { Stagger, Item, HoverCard } from "./motion";
import { DomainHeader, DomainIndex, EcosystemPanel } from "./product-ecosystem";
import { ProductIcon } from "@/lib/product-icons";
import { publicProducts, type CatalogProduct } from "@/lib/catalog";
import { domainAnchor, groupByDomain } from "@/lib/product-domains";

/*
 * Products — the ecosystem, not a list.
 *
 * Still driven entirely by the catalogue the Founder manages from the dashboard
 * (lib/catalog.ts): only PUBLISHED products appear, and adding an EduSentinel
 * product is a row, not a deploy. What changed is the SHAPE of the page. A flat
 * grid is honest at five products and useless at fifty, so the catalogue is now
 * grouped into ecosystem domains (lib/product-domains.ts) — one shelf per
 * problem space, each with its own anchor, header and count.
 *
 * Grouping, not filtering: every published product is still rendered on this
 * page, in the HTML the server sends. The domain index and the radial launcher
 * navigate to shelves, they do not hide products — so nothing about this page
 * depends on JavaScript to be complete, and a crawler sees the whole catalogue
 * exactly as it did before.
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

  const groups = groupByDomain(products);
  // Counted from the rows we already hold — never a hard-coded figure.
  const preview = products.filter((p) => p.pricing === "soon").length;

  return (
    <section id="products" className="mx-auto max-w-[1360px] px-6 pb-24 md:px-10 md:pb-32">
      <SplitHeading
        title="Products built for digital trust."
        aside="Real tools from the EduSentinel ecosystem — every one privacy-first, every one on a single account."
      />

      <EcosystemPanel
        total={products.length}
        domains={groups.length}
        preview={preview}
      />

      <DomainIndex groups={groups} />

      <div className="mt-20 space-y-20 md:mt-28 md:space-y-28">
        {groups.map(({ domain, products: shelf }, i) => (
          <section
            key={domain.id}
            id={domainAnchor(domain.id)}
            /* Clears the fixed header when the index or the launcher jumps here. */
            className="scroll-mt-28"
          >
            <DomainHeader domain={domain} count={shelf.length} index={i} />
            <Stagger className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {shelf.map((p) => (
                <Item key={p.id} className="h-full">
                  <ProductCard product={p} />
                </Item>
              ))}
            </Stagger>
          </section>
        ))}
      </div>
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
