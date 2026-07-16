import Link from "next/link";
import { LogoWordmark } from "./logo";
import { FooterFaq } from "./footer-faq";
import { getCompany } from "@/lib/company";

const columns = [
  [
    { href: "/solutions", label: "Solutions" },
    { href: "/products", label: "Products" },
    { href: "/downloads", label: "Downloads" },
    { href: "/pricing", label: "Pricing" },
    { href: "/company", label: "Company" },
    { href: "/contact", label: "Contact" },
  ],
  [
    { href: "/docs", label: "Documentation" },
    { href: "/blog", label: "Blog" },
    { href: "/collaborate", label: "Collaborate" },
    { href: "/legal/community", label: "Community Guidelines" },
  ],
  [
    { href: "/legal/privacy", label: "Privacy Policy" },
    { href: "/legal/terms", label: "Terms of Service" },
    { href: "/legal/security", label: "Security & Disclosure" },
  ],
  [
    { href: "/legal/security", label: "Report a vulnerability" },
    { href: "/.well-known/security.txt", label: "security.txt" },
  ],
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
      <div className="mx-auto grid max-w-[1360px] gap-14 px-6 py-24 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:px-10">
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
              "Privacy-first technology ecosystem for cybersecurity, AI, cloud, and education."}
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
        {columns.map((col, i) => (
          <ul key={i} className="space-y-5">
            {col.map((l) => (
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
        ))}
        {/* FAQ — an added footer column spanning the full width beneath the link
            columns. Product-focused, inline accordion; no page, section or modal. */}
        <div className="md:col-span-4">
          <FooterFaq />
        </div>
      </div>
      <div className="mx-auto max-w-[1360px] px-6 pb-10 text-sm text-text-muted md:px-10">
        © {new Date().getFullYear()} {company.legalName ?? company.name}. All rights
        reserved.
      </div>
    </footer>
  );
}
