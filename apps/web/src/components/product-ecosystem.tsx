import { Reveal } from "./motion";
import { CircleMenu } from "./ui/circle-menu";
import { EcosystemPipelinePanel } from "./ecosystem-pipeline-panel";
import { ProductIcon } from "@/lib/product-icons";
import { domainAnchor, type DomainGroup, type ProductDomain } from "@/lib/product-domains";

/*
 * The ecosystem furniture on /products: the engine panel, the domain index and
 * the section header each shelf gets.
 *
 * All server components. Every number rendered here is counted from the
 * catalogue rows the page already loaded — there is no state, no fetch and no
 * placeholder anywhere below. The two client components on this page are the
 * radial launcher and the console gate, and both are leaves.
 */

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand-teal">
      {children}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[12px] uppercase tracking-[0.12em] text-text-muted">{label}</dt>
      <dd className="mt-1 font-display text-3xl tabular-nums tracking-tight">{value}</dd>
    </div>
  );
}

/**
 * The band that says what the ecosystem IS before it lists what is in it: one
 * privacy-first core, several surfaces. The counts are the catalogue's own.
 */
export function EcosystemPanel({
  total,
  domains,
  preview,
}: {
  total: number;
  domains: number;
  preview: number;
}) {
  return (
    <Reveal className="mt-14 md:mt-16">
      <div className="overflow-hidden rounded-card border border-border-subtle bg-surface-raised">
        <div className="flex flex-col gap-8 p-7 md:p-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-xl">
            <Eyebrow>The ecosystem</Eyebrow>
            <h3 className="mt-3 text-3xl font-medium leading-[1.1] tracking-[-0.02em] md:text-4xl">
              One engine. Every product.
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
              Every EduSentinel product is a different surface on the same
              privacy-first core: a signal arrives, threat intelligence and
              on-device models weigh it, and the answer lands in the product you
              were already using. That is why the catalogue can grow without the
              account, the privacy promise or the login ever multiplying.
            </p>
          </div>
          {/* Wraps rather than being forced into three columns: at 320px the
              labels would otherwise break mid-word inside the panel padding. */}
          <dl className="flex shrink-0 flex-wrap gap-x-8 gap-y-4 lg:gap-x-10">
            <Stat label="Products" value={total} />
            <Stat label="Domains" value={domains} />
            <Stat label="In preview" value={preview} />
          </dl>
        </div>

        <div className="border-t border-border-subtle bg-surface-base px-5 py-8 md:px-10 md:py-10">
          <EcosystemPipelinePanel />
          <p className="mt-6 text-center text-[12px] text-text-muted">
            A schematic of the shared Sentinel engine — an illustration of the
            flow, not live telemetry.
          </p>
        </div>
      </div>
    </Reveal>
  );
}

/**
 * The index: every populated domain as a plain link to its shelf, beside the
 * radial launcher that does the same thing with more ceremony.
 *
 * The list is the accessible, no-JavaScript, crawlable route and it is rendered
 * on the server; the launcher is the flourish. Neither filters anything — every
 * product stays on the page, so a visitor with a keyboard, a crawler and a
 * visitor with a pointer all reach the same catalogue.
 */
export function DomainIndex<T>({ groups }: { groups: DomainGroup<T>[] }) {
  const items = [
    {
      label: "All",
      href: "#products",
      icon: <ProductIcon icon="browser" size={18} />,
    },
    ...groups.map(({ domain }) => ({
      label: domain.label,
      href: `#${domainAnchor(domain.id)}`,
      icon: <ProductIcon icon={domain.icon} size={18} />,
    })),
  ];

  return (
    <Reveal className="mt-20 md:mt-28">
      <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div className="lg:col-span-7">
          <Eyebrow>Navigate</Eyebrow>
          <h3 className="mt-3 text-3xl font-medium leading-[1.1] tracking-[-0.02em] md:text-4xl">
            Browse the ecosystem by domain.
          </h3>

          <ul className="mt-8 border-t border-border-subtle">
            {groups.map(({ domain, products }, i) => (
              <li key={domain.id} className="border-b border-border-subtle">
                <a
                  href={`#${domainAnchor(domain.id)}`}
                  className="group flex items-center gap-4 py-4 transition-colors hover:text-brand-teal md:gap-5"
                >
                  <span className="font-mono text-[12px] text-text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-raised text-brand-teal transition-colors group-hover:border-brand-teal/40">
                    <ProductIcon icon={domain.icon} size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-medium">{domain.name}</span>
                    <span className="block truncate text-[13px] text-text-secondary">
                      {domain.blurb}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-[13px] text-text-muted">
                    {products.length}
                  </span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className="shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <path
                      d="M3 8h10m0 0L9 4m4 4l-4 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-5">
          {/*
           * `overflow-clip` only ever bites below ~344px of column width, where
           * the items' 296px swing would otherwise push a horizontal scrollbar
           * onto the whole page. At every real width the launcher is untouched.
           */}
          <div className="flex w-full flex-col items-center overflow-clip py-6">
            <CircleMenu items={items} label="Open the domain launcher" />
            <p className="mt-4 text-center text-[12px] text-text-muted">
              Domain launcher — open it to jump straight to a shelf.
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/** The header a single shelf gets, with its own count and anchor. */
export function DomainHeader({
  domain,
  count,
  index,
}: {
  domain: ProductDomain;
  count: number;
  index: number;
}) {
  return (
    <Reveal>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border-subtle pb-5">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-raised text-brand-teal">
            <ProductIcon icon={domain.icon} size={22} />
          </span>
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[12px] text-text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-2xl font-medium tracking-[-0.02em] md:text-3xl">
                {domain.name}
              </h3>
            </div>
            <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-text-secondary">
              {domain.blurb}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-border-subtle px-3 py-1 tabular-nums text-[12px] font-medium text-text-muted">
          {count} {count === 1 ? "product" : "products"}
        </span>
      </div>
    </Reveal>
  );
}
