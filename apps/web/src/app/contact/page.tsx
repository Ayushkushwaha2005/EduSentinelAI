import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";

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
    <main className="mx-auto max-w-6xl px-6 py-20">
      <Reveal>
        <h1 className="text-4xl font-bold tracking-tight">Contact</h1>
        <p className="mt-4 max-w-2xl text-lg text-text-secondary">
          A small team that reads everything. Email is the fastest way to
          reach us — an in-platform contact form arrives with our next
          release.
        </p>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {channels.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.08}>
            <div className="h-full rounded-card border border-border-subtle bg-surface-raised p-8">
              <h2 className="text-xl font-semibold">{c.title}</h2>
              <p className="mt-3 text-text-secondary">{c.body}</p>
              <a
                href={`mailto:${c.email}`}
                className="mt-6 inline-block font-semibold text-brand-glow underline-offset-4 hover:underline"
              >
                {c.email}
              </a>
            </div>
          </Reveal>
        ))}
      </div>
    </main>
  );
}
