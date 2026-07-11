import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Solutions",
  description:
    "Cybersecurity, AI/ML, cloud, developer tools, and education technology — the EduSentinel AI product areas.",
};

const areas = [
  {
    title: "Cybersecurity",
    status: "In development",
    body: "Defensive security tooling, threat education, and research publications. Every release ships signed, with published checksums.",
  },
  {
    title: "Artificial Intelligence & ML",
    status: "In development",
    body: "AI products and agents with transparent data practices: what a model sees, stores, and never trains on is documented for every product.",
  },
  {
    title: "Cloud Computing",
    status: "Planned",
    body: "Privacy-respecting cloud utilities and infrastructure tooling for small teams that refuse to trade data for convenience.",
  },
  {
    title: "Developer Tools & Extensions",
    status: "Planned",
    body: "Browser extensions, desktop utilities, and CLI tools distributed through our signed download center.",
  },
  {
    title: "Educational Technology",
    status: "Planned",
    body: "Learning platforms that make security and AI literacy accessible — built for students, not ad networks.",
  },
  {
    title: "Research & Innovation",
    status: "Ongoing",
    body: "Open research projects and future startup innovations incubated on the EduSentinel platform.",
  },
];

export default function SolutionsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <Reveal>
        <h1 className="text-4xl font-bold tracking-tight">Solutions</h1>
        <p className="mt-4 max-w-2xl text-lg text-text-secondary">
          One ecosystem, many product areas — all sharing the same identity,
          design language, and privacy guarantees.
        </p>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {areas.map((a, i) => (
          <Reveal key={a.title} delay={i * 0.06}>
            <div className="h-full rounded-card border border-border-subtle bg-surface-raised p-8">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">{a.title}</h2>
                <span className="shrink-0 rounded-full border border-border-subtle px-3 py-1 text-xs text-text-muted">
                  {a.status}
                </span>
              </div>
              <p className="mt-3 text-text-secondary">{a.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal className="mt-16 text-center">
        <p className="text-text-secondary">
          Want early access or a partnership?
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-block rounded-control bg-gradient-to-r from-brand-cyan to-brand-teal px-6 py-3 font-semibold text-surface-base transition-opacity hover:opacity-90"
        >
          Contact Us
        </Link>
      </Reveal>
    </main>
  );
}
