import type { Metadata } from "next";
import { Reveal, Stagger, Item, HoverCard } from "@/components/motion";
import { Eyebrow } from "@/components/section";
import { Button, ArrowIcon } from "@/components/button";

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
    <main className="mx-auto max-w-6xl px-6 pb-28 pt-36 md:pt-44">
      <Reveal className="flex flex-col items-start">
        <Eyebrow>Solutions</Eyebrow>
        <h1 className="mt-6 max-w-2xl text-balance text-5xl font-semibold tracking-[-0.04em] md:text-6xl">
          One ecosystem, many frontiers
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
          Every product area shares the same identity, design language, and
          privacy guarantees.
        </p>
      </Reveal>
      <Stagger className="mt-16 grid gap-5 md:grid-cols-2">
        {areas.map((a) => (
          <Item key={a.title}>
            <HoverCard className="group h-full">
              <div className="h-full rounded-card border border-border-subtle bg-surface-raised/60 p-8 transition-colors duration-300 group-hover:border-brand-teal/40 md:p-9">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold tracking-tight">{a.title}</h2>
                  <span className="shrink-0 rounded-full border border-border-subtle bg-surface-overlay/50 px-3 py-1 text-xs text-text-muted">
                    {a.status}
                  </span>
                </div>
                <p className="mt-4 leading-relaxed text-text-secondary">{a.body}</p>
              </div>
            </HoverCard>
          </Item>
        ))}
      </Stagger>
      <Reveal className="mt-20 flex flex-col items-center gap-5 text-center">
        <p className="text-lg text-text-secondary">
          Want early access or a partnership?
        </p>
        <Button href="/contact" size="lg">
          Contact Us <ArrowIcon />
        </Button>
      </Reveal>
    </main>
  );
}
