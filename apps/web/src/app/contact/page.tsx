import type { Metadata } from "next";
import { Reveal, Stagger, Item, HoverCard } from "@/components/motion";
import { Eyebrow } from "@/components/section";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the EduSentinel AI team — partnerships, collaboration, early access, and security reports.",
};

const channels = [
  {
    title: "General & Partnerships",
    body: "Product questions, early access, collaboration proposals, and media.",
    email: "hello@edusentinel.ai",
  },
  {
    title: "Security Reports",
    body: "Found a vulnerability? Please use responsible disclosure — see our Security & Disclosure policy for scope and process.",
    email: "security@edusentinel.ai",
  },
];

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-28 pt-36 md:pt-44">
      <Reveal className="flex flex-col items-start">
        <Eyebrow>Contact</Eyebrow>
        <h1 className="mt-6 max-w-2xl text-balance text-5xl font-semibold tracking-[-0.04em] md:text-6xl">
          A small team that reads everything
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
          Email is the fastest way to reach us — an in-platform contact form
          arrives with our next release.
        </p>
      </Reveal>
      <Stagger className="mt-16 grid gap-5 md:grid-cols-2">
        {channels.map((c) => (
          <Item key={c.title}>
            <HoverCard className="group h-full">
              <div className="h-full rounded-card border border-border-subtle bg-surface-raised/60 p-8 transition-colors duration-300 group-hover:border-brand-teal/40 md:p-9">
                <h2 className="text-xl font-semibold tracking-tight">{c.title}</h2>
                <p className="mt-4 leading-relaxed text-text-secondary">{c.body}</p>
                <a
                  href={`mailto:${c.email}`}
                  className="mt-8 inline-flex items-center gap-2 font-semibold text-brand-glow underline-offset-4 hover:underline"
                >
                  {c.email}
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10m0 0L9 4m4 4l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </HoverCard>
          </Item>
        ))}
      </Stagger>
    </main>
  );
}
