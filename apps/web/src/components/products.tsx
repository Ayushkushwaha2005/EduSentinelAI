import Link from "next/link";
import { SplitHeading } from "./section";
import { Stagger, Item, HoverCard, Reveal } from "./motion";
import {
  CategoryArchitecture,
  DomainHeader,
  DomainIndex,
  EcosystemPanel,
} from "./product-ecosystem";
import { ProductIcon } from "@/lib/product-icons";
import { publicProducts, type CatalogProduct } from "@/lib/catalog";
import {
  classifyProduct,
  DOMAINS_BY_ID,
  domainAnchor,
  groupByDomain,
} from "@/lib/product-domains";
import {
  audienceOf,
  benefitsOf,
  platformsOf,
  priceOf,
  stageOf,
} from "@/lib/product-facets";

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
const stageTones = {
  live: "border-brand-teal/30 bg-brand-teal/10 text-brand-teal",
  preview: "border-border-subtle bg-surface-overlay text-text-secondary",
};

export async function ProductsSection() {
  const products = await publicProducts();
  if (products.length === 0) return null;

  const groups = groupByDomain(products);
  // Counted from the rows we already hold — never a hard-coded figure.
  const preview = products.filter((p) => p.pricing === "soon").length;

  return (
    <section id="products" className="mx-auto max-w-[1360px] px-6 pb-24 md:px-10 md:pb-32">
      <Reveal>
        <p className="mb-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-brand-teal">
          The EduSentinel ecosystem
        </p>
      </Reveal>
      <SplitHeading
        title="One platform. A growing family of products."
        aside="EduSentinel started as cybersecurity and never stopped being it. Everything below runs on that same engine, that same privacy promise, and the one account you already have."
      />

      <EcosystemPanel
        total={products.length}
        domains={groups.length}
        preview={preview}
      />

      <CategoryArchitecture groups={groups} />

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

/** One labelled fact on a card. Values are plain text, never markup. */
function Facet({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 truncate text-[13px] font-medium text-text-secondary">
        {value}
      </dd>
    </div>
  );
}

/*
 * A product card answers six questions before the visitor has to ask one:
 * what stage it is at, what it is, who it is for, where it runs, what it does,
 * and what it costs. Everything but the name and description is DERIVED from
 * the record (lib/product-domains.ts, lib/product-facets.ts), so a new product
 * arrives fully described without a schema change — see those modules for why.
 *
 * All of it is plain text sanitized on write, and the icon is a key into the
 * fixed set; a product record cannot inject markup here.
 */
export function ProductCard({ product: p }: { product: CatalogProduct }) {
  const domain = DOMAINS_BY_ID[classifyProduct(p)];
  const stage = stageOf(p);
  const platforms = platformsOf(p);
  const audience = audienceOf(p);
  const price = priceOf(p);
  const benefits = benefitsOf(p);

  return (
    <HoverCard className="group h-full">
      <div className="flex h-full flex-col rounded-card border border-border-subtle bg-surface-raised p-6 transition-colors duration-300 group-hover:border-brand-teal/40 md:p-7">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-base text-brand-teal">
            <ProductIcon icon={p.icon} size={24} />
          </span>
          <span
            title={stage.detail}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${stageTones[stage.tone]}`}
          >
            {stage.label}
          </span>
        </div>

        {/* Category first: it tells you which shelf you are on even when the
            card is met on its own, out of the domain that contains it. */}
        <p className="mt-5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-teal">
          <ProductIcon icon={domain.icon} size={13} />
          {domain.name}
        </p>

        <h3 className="mt-2 text-lg font-semibold tracking-tight">
          <Link href={`/products/${p.slug}`} className="hover:text-brand-teal">
            {/* The whole card is a hover target; the link stays on the name so
                keyboard users get one predictable stop per product. */}
            {p.name}
          </Link>
        </h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
          {p.tagline || p.description}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border-subtle py-4">
          <Facet label="Platform" value={platforms.join(" · ")} />
          <Facet label="Built for" value={audience.join(" · ")} />
        </dl>

        {benefits.shown.length > 0 && (
          <ul className="mt-4 flex-1 space-y-2">
            {benefits.shown.map((f) => (
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
            {/* Counted, never rounded — the rest are on the product page. */}
            {benefits.more > 0 && (
              <li className="pl-[25px] text-[13px] text-text-muted">
                <Link href={`/products/${p.slug}`} className="hover:text-brand-teal">
                  +{benefits.more} more capabilit{benefits.more === 1 ? "y" : "ies"}
                </Link>
              </li>
            )}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Link
            href={p.ctaHref}
            className="inline-flex items-center gap-2 text-[15px] font-semibold text-text-primary transition-colors hover:text-brand-teal"
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
          {/* Omitted rather than guessed while a product is still in preview:
              we do not know what it will cost, so the card does not say. */}
          {price && (
            <span className="shrink-0 text-[13px] font-medium text-text-muted">
              {price}
            </span>
          )}
        </div>
      </div>
    </HoverCard>
  );
}
