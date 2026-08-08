import Link from "next/link";
import { LogoWordmark } from "./logo";
import { FooterFaq } from "./footer-faq";
import { getCompany } from "@/lib/company";

/*
 * The footer is now HEADED. Four unlabelled stacks of links made the visitor
 * read every one to find out what the column was about; a heading turns each
 * into a place you can aim at.
 *
 * RESOURCES is where Solutions, Documentation and Blog live now. They were in
 * the top navigation, where they competed with the five decisions a visitor
 * actually makes there. Nothing was removed: every route still exists, still
 * renders, and is still linked from the footer of every page on the site, so
 * they remain reachable and crawlable.
 */
const columns: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { href: "/products", label: "Products" },
      { href: "/downloads", label: "Downloads" },
      { href: "/pricing", label: "Pricing" },
      { href: "/company", label: "Company" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/solutions", label: "Solutions" },
      { href: "/docs", label: "Documentation" },
      // NOTE: /demo is deliberately NOT linked here. The sandbox is reachable
      // only by the dedicated demo account and only in local development — it
      // must not be discoverable from the public site.
      { href: "/blog", label: "Blog" },
      { href: "/collaborate", label: "Collaborate" },
      { href: "/legal/community", label: "Community Guidelines" },
    ],
  },
  /*
   * Legal and Security are ONE column. As two, "Security" was a fifth cell in a
   * four-column grid, so it wrapped onto a row of its own under the brand block
   * — a two-link stack floating in white space, which is what made it read as
   * bolted on. Its "Report a vulnerability" link pointed at /legal/security —
   * the page Legal already linked to as "Security & Disclosure" — so the merged
   * column carries the action wording, which is the one a researcher scans for,
   * rather than listing the same destination twice.
   */
  {
    title: "Legal & Security",
    links: [
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/security", label: "Report a vulnerability" },
      { href: "/.well-known/security.txt", label: "security.txt" },
    ],
  },
];

/*
 * The footer reads the company record (Phase 6.5): name, tagline, contact and
 * social links come from the database, so the Founder changes them once and every
 * page of the site is correct. The nav links stay in code — they are routes, not
 * company information.
 */
export async function Footer() {
  const company = await getCompany();

  return (
    <footer className="pinstripes border-t border-border-subtle">
      <div className="mx-auto max-w-[1360px] px-6 py-24 md:px-10">
        {/*
         * TWO PARTS, in this order.
         *
         * 1. The FAQ, full width and on its own. It is a section, not a column:
         *    it is never a cell in the navigation grid below, so it can never
         *    be read as a fourth list of links.
         */}
        <FooterFaq />

        {/*
         * 2. The navigation row: brand, then the three link columns, in the
         *    original four-cell grid. The generous gap is the separator — the
         *    FAQ ends, then this begins.
         */}
        <div className="mt-20 grid gap-14 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logoUrl}
                alt={company.name}
                className="h-8 w-auto max-w-[180px] object-contain"
              />
            ) : (
              <LogoWordmark />
            )}
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-muted">
              {company.tagline ??
                "A cybersecurity-first AI platform. One engine, one account, one privacy promise — across every product we build."}
            </p>
            {(company.email || company.links.length > 0) && (
              <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
                {company.email && <span>{company.email}</span>}
                {company.links.map((l) => (
                  <a
                    key={l.label + l.href}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-text-primary"
                  >
                    {l.label}
                  </a>
                ))}
              </p>
            )}
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              {/* Same heading style as the FAQ above, so the whole footer reads
                  as one system rather than two widgets. */}
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                {col.title}
              </h3>
              <ul className="mt-5 space-y-4">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[15px] text-text-primary/85 transition-colors hover:text-text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-[1360px] px-6 pb-10 text-sm text-text-muted md:px-10">
        © {new Date().getFullYear()} {company.legalName ?? company.name}. All rights
        reserved.
      </div>
    </footer>
  );
}
