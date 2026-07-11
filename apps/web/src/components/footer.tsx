import Link from "next/link";
import { LogoWordmark } from "./logo";

const groups = [
  {
    title: "Platform",
    links: [
      { href: "/solutions", label: "Solutions" },
      { href: "/company", label: "Company" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/security", label: "Security & Disclosure" },
    ],
  },
  {
    title: "Security",
    links: [
      { href: "/legal/security", label: "Report a vulnerability" },
      { href: "/.well-known/security.txt", label: "security.txt" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border-subtle">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-teal/40 to-transparent"
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <LogoWordmark />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-text-muted">
            Privacy-first technology ecosystem for cybersecurity, AI, cloud,
            and education. Your data belongs to you.
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
              {g.title}
            </h3>
            <ul className="mt-5 space-y-3">
              {g.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border-subtle/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-7 text-xs text-text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} EduSentinel AI. All rights reserved.</span>
          <span>Designed & engineered by the EduSentinel team.</span>
        </div>
      </div>
    </footer>
  );
}
