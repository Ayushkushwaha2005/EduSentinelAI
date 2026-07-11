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
];

export function Footer() {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">
        <div>
          <LogoWordmark />
          <p className="mt-4 max-w-xs text-sm text-text-muted">
            Privacy-first technology ecosystem for cybersecurity, AI, cloud,
            and education.
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h3 className="text-sm font-semibold text-text-primary">{g.title}</h3>
            <ul className="mt-4 space-y-2">
              {g.links.map((l) => (
                <li key={l.href}>
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
      <div className="border-t border-border-subtle py-6 text-center text-xs text-text-muted">
        © {new Date().getFullYear()} EduSentinel AI. All rights reserved.
      </div>
    </footer>
  );
}
