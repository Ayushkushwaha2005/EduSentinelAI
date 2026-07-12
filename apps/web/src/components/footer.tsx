import Link from "next/link";
import { LogoWordmark } from "./logo";

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
    { href: "/legal/privacy", label: "Privacy Policy" },
    { href: "/legal/terms", label: "Terms of Service" },
    { href: "/legal/security", label: "Security & Disclosure" },
  ],
  [
    { href: "/legal/security", label: "Report a vulnerability" },
    { href: "/.well-known/security.txt", label: "security.txt" },
  ],
];

export function Footer() {
  return (
    <footer className="pinstripes border-t border-border-subtle">
      <div className="mx-auto grid max-w-[1360px] gap-14 px-6 py-24 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:px-10">
        <div>
          <LogoWordmark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-muted">
            Privacy-first technology ecosystem for cybersecurity, AI, cloud,
            and education.
          </p>
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
      </div>
      <div className="mx-auto max-w-[1360px] px-6 pb-10 text-sm text-text-muted md:px-10">
        © {new Date().getFullYear()} EduSentinel AI. All rights reserved.
      </div>
    </footer>
  );
}
