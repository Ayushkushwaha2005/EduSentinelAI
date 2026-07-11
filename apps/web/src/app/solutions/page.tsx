import type { Metadata } from "next";
import { SplitHeading } from "@/components/section";
import { Reveal, Stagger, Item } from "@/components/motion";
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
    <main className="mx-auto max-w-[1360px] px-6 pb-32 pt-[72px] md:px-10">
      <div className="pt-16 md:pt-24">
        <SplitHeading
          title="One ecosystem, many frontiers"
          aside="Every product area shares the same identity, design language, and privacy guarantees."
        />
      </div>
      <Stagger className="mt-16 grid border-l border-t border-border-subtle md:grid-cols-2 lg:grid-cols-3">
        {areas.map((a) => (
          <Item key={a.title} className="h-full">
            <div className="flex h-full flex-col border-b border-r border-border-subtle bg-surface-raised/40 p-8 transition-colors hover:bg-surface-raised md:p-10">
              <span className="text-sm text-text-muted">{a.status}</span>
              <h2 className="mt-4 text-xl font-semibold tracking-tight">
                {a.title}
              </h2>
              <p className="mt-3 leading-relaxed text-text-secondary">{a.body}</p>
            </div>
          </Item>
        ))}
      </Stagger>
      <Reveal className="mt-20 flex items-center gap-7">
        <Button href="/contact" size="lg">
          Talk to us
        </Button>
        <span className="inline-flex items-center gap-2 text-[15px] text-text-secondary">
          Early access and partnerships <ArrowIcon />
        </span>
      </Reveal>
    </main>
  );
}
