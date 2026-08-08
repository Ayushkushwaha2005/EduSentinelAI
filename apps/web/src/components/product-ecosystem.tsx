import { Reveal } from "./motion";
import { CircleMenu } from "./ui/circle-menu";
import { EcosystemPipelinePanel } from "./ecosystem-pipeline-panel";
import { ProductIcon } from "@/lib/product-icons";
import {
  PRODUCT_DOMAINS,
  domainAnchor,
  type DomainGroup,
  type ProductDomain,
} from "@/lib/product-domains";

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
              security core: a signal arrives, threat intelligence and on-device
              models weigh it, and the answer lands in the product you were
              already using. A planning tool and a phishing filter are not two
              companies here — they are two windows onto one engine, which is why
              the catalogue can grow without the account, the privacy promise or
              the login ever multiplying.
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
 * The category architecture — the whole taxonomy, including the categories
 * nothing has been built for yet.
 *
 * This is the section that makes the scaling claim CHECKABLE instead of
 * asserted. A visitor sees seven named categories, each with a sentence saying
 * exactly what belongs in it, and three of them saying openly that they are
 * empty. That is the argument: the shelves were designed for the products we
 * have not built, so the hundredth product needs a row, not a redesign.
 *
 * An open category is marked "Open" and is NOT a link — there is nothing to
 * jump to, and a link that scrolls nowhere is the kind of dead control this
 * codebase deletes rather than styles. Counts are the catalogue's own.
 */
export function CategoryArchitecture<T>({ groups }: { groups: DomainGroup<T>[] }) {
  const counts = new Map(groups.map((g) => [g.domain.id, g.products.length]));
  const open = PRODUCT_DOMAINS.length - groups.length;

  return (
    <Reveal className="mt-20 md:mt-28">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <Eyebrow>Category architecture</Eyebrow>
          <h3 className="mt-3 text-3xl font-medium leading-[1.1] tracking-[-0.02em] md:text-4xl">
            Built to hold the products we haven’t made yet.
          </h3>
          <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
            Categories here are problem spaces, not form factors — “protects you
            from fraud” outlives whichever surface it ships on. Each one states
            what belongs in it, so a new product finds its shelf on the day it is
            added, from the dashboard, with no code and no redesign.
          </p>
        </div>
        {open > 0 && (
          <p className="shrink-0 text-[13px] text-text-muted md:text-right">
            {PRODUCT_DOMAINS.length} categories
            <span className="mx-1.5 text-border-subtle">·</span>
            {open} waiting to be filled
          </p>
        )}
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_DOMAINS.map((domain) => {
          const count = counts.get(domain.id) ?? 0;
          const populated = count > 0;

          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle ${
                    populated
                      ? "bg-surface-base text-brand-teal"
                      : "bg-surface-base text-text-muted"
                  }`}
                >
                  <ProductIcon icon={domain.icon} size={19} />
                </span>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums ${
                    populated
                      ? "border-border-subtle text-text-secondary"
                      : "border-dashed border-border-subtle text-text-muted"
                  }`}
                >
                  {populated
                    ? `${count} ${count === 1 ? "product" : "products"}`
                    : "Open"}
                </span>
              </div>
              <p className="mt-4 text-[16px] font-medium tracking-tight">{domain.name}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                {domain.scope}
              </p>
            </>
          );

          return (
            <li key={domain.id} className="h-full">
              {populated ? (
                <a
                  href={`#${domainAnchor(domain.id)}`}
                  className="flex h-full flex-col rounded-card border border-border-subtle bg-surface-raised p-6 transition-colors hover:border-brand-teal/40"
                >
                  {body}
                </a>
              ) : (
                <div className="flex h-full flex-col rounded-card border border-dashed border-border-subtle bg-surface-raised/50 p-6">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
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
 *
 * DEMOTED, deliberately. CategoryArchitecture above now carries the naming and
 * the explaining, so this section stopped being a second essay about the same
 * seven words and became what its name always said it was: an index. The
 * heading is one step smaller, the per-row blurb is gone (it was the `scope`
 * sentence's shorter twin, printed a screen apart), and what is left is the
 * thing the architecture grid does NOT give you — counts and a jump.
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
          <h3 className="mt-3 text-2xl font-medium leading-[1.15] tracking-[-0.02em] md:text-3xl">
            Jump straight to a shelf.
          </h3>

          <ul className="mt-7 border-t border-border-subtle">
            {groups.map(({ domain, products }, i) => (
              <li key={domain.id} className="border-b border-border-subtle">
                <a
                  href={`#${domainAnchor(domain.id)}`}
                  className="group flex items-center gap-4 py-3.5 transition-colors hover:text-brand-teal md:gap-5"
                >
                  <span className="font-mono text-[12px] text-text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-raised text-brand-teal transition-colors group-hover:border-brand-teal/40">
                    <ProductIcon icon={domain.icon} size={19} />
                  </span>
                  <span className="min-w-0 flex-1 text-[16px] font-medium">
                    {domain.name}
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
