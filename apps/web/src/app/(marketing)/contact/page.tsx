import type { Metadata } from "next";
import Link from "next/link";
import { SplitHeading } from "@/components/section";
import { Reveal } from "@/components/motion";
import { issueFormToken } from "@/lib/bot-defense";
import { ORG_EMAIL } from "@/lib/org-email";
import { ContactForm } from "./forms";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the EduSentinel AI team — partnerships, collaboration, early access, and security reports.",
};

/*
 * Contact (Phase 10, Task 11).
 *
 * This page used to be two `mailto:` links and the line "an in-platform contact
 * form arrives with our next release". It now has the form, and the addresses
 * come from lib/org-email.ts rather than being typed in here (Task 12).
 *
 * The direct addresses are KEPT alongside the form, deliberately. A contact form
 * is a single point of failure — if delivery breaks, a visitor with no other
 * route simply cannot reach us — and some people would always rather use their
 * own mail client. Offering both costs nothing.
 */

/* The form is a server-issued token per render, so this page must not be
   statically cached — the timing token would be stale for every visitor. */
export const dynamic = "force-dynamic";

const directChannels = [
  {
    title: "General & partnerships",
    body: "Product questions, early access, collaboration proposals, and media.",
    email: ORG_EMAIL.hello,
  },
  {
    title: "Security reports",
    body: "Found a vulnerability? Please use responsible disclosure — the form on our Security & Disclosure policy page reaches the same inbox and tells us what we need to triage it.",
    email: ORG_EMAIL.security,
    href: "/legal/security",
    linkLabel: "Open the disclosure form",
  },
];

export default function ContactPage() {
  const token = issueFormToken();

  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-32 pt-20 md:px-10" data-accent="amber">
      <div className="pt-16 md:pt-24">
        <SplitHeading
          title="A small team that reads everything."
          aside="Send us a message and a person will read it. If you would rather use your own mail client, the direct addresses are below."
        />
      </div>

      <div className="mt-16 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <Reveal>
          <div className="rounded-card border border-border-subtle bg-surface-raised p-8 md:p-10">
            <h2 className="text-xl font-semibold tracking-tight">Send a message</h2>
            <p className="mt-3 mb-8 leading-relaxed text-text-secondary">
              We reply to the address you give us. We do not add it to a mailing
              list, and there is no tracking in our email.
            </p>
            <ContactForm token={token} />
          </div>
        </Reveal>

        <Reveal delay={0.1} className="flex flex-col gap-5">
          {directChannels.map((c) => (
            <div
              key={c.title}
              className="flex flex-col rounded-card border border-border-subtle bg-surface-raised p-8"
            >
              <h2 className="text-xl font-semibold tracking-tight">{c.title}</h2>
              <p className="mt-4 flex-1 leading-relaxed text-text-secondary">{c.body}</p>
              <a
                href={`mailto:${c.email}`}
                className="mt-8 inline-flex h-11 w-fit items-center rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover"
              >
                {c.email}
              </a>
              {c.href && (
                <Link
                  href={c.href}
                  className="mt-4 text-sm font-medium text-brand-cyan hover:text-brand-teal"
                >
                  {c.linkLabel} →
                </Link>
              )}
            </div>
          ))}
        </Reveal>
      </div>
    </main>
  );
}
