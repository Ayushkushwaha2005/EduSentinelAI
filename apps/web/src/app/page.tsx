import { Hero } from "@/components/hero";
import { SectionHeading } from "@/components/section";
import { Stagger, Item, HoverCard, Reveal } from "@/components/motion";
import { Button, ArrowIcon } from "@/components/button";

const pillars = [
  {
    title: "Cybersecurity",
    body: "Defensive tooling and security research built on a privacy-first foundation — protection without surveillance.",
    wide: true,
    icon: (
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
    ),
  },
  {
    title: "AI & Machine Learning",
    body: "Products and agents with transparent data practices, documented for every release.",
    wide: false,
    icon: (
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3M6.5 6.5l2 2m7 7l2 2m0-11l-2 2m-7 7l-2 2M12 9a3 3 0 110 6 3 3 0 010-6z" />
    ),
  },
  {
    title: "Cloud & Developer Tools",
    body: "Extensions, utilities, and infrastructure that respect developers and their data.",
    wide: false,
    icon: (
      <path d="M7 17a4.5 4.5 0 01-.4-8.98A6 6 0 0118.3 9.6 4 4 0 0117.5 17H7z" />
    ),
  },
  {
    title: "Education & Research",
    body: "Learning technology and open research that make security and AI knowledge accessible to everyone.",
    wide: true,
    icon: (
      <path d="M12 4L2 9l10 5 10-5-10-5zm-6 7.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
    ),
  },
];

const principles = [
  {
    n: "01",
    title: "Privacy by default",
    body: "No third-party trackers, no data resale. We collect the minimum required to operate — and we publish exactly what that is.",
  },
  {
    n: "02",
    title: "Security as a discipline",
    body: "Signed releases, published checksums, responsible disclosure, and audit-logged privileged actions across everything we ship.",
  },
  {
    n: "03",
    title: "Built to last",
    body: "One identity, one design language, one platform — engineered so every future product strengthens the ecosystem.",
  },
];

function PillarCard({ p }: { p: (typeof pillars)[number] }) {
  return (
    <HoverCard className={`group h-full ${p.wide ? "md:col-span-3" : "md:col-span-2"}`}>
      <div className="relative h-full overflow-hidden rounded-card border border-border-subtle bg-surface-raised/60 p-8 transition-colors duration-300 group-hover:border-brand-teal/40 md:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-brand-cyan/0 blur-[80px] transition-colors duration-500 group-hover:bg-brand-cyan/10"
        />
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-subtle bg-surface-overlay/60 text-brand-glow">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {p.icon}
          </svg>
        </div>
        <h3 className="mt-6 text-xl font-semibold tracking-tight">{p.title}</h3>
        <p className="mt-3 leading-relaxed text-text-secondary">{p.body}</p>
      </div>
    </HoverCard>
  );
}

export default function Home() {
  return (
    <main>
      <Hero />

      {/* Pillars — bento grid */}
      <section className="mx-auto max-w-6xl px-6 py-28 md:py-36">
        <SectionHeading
          eyebrow="The platform"
          title="One platform. Many frontiers."
          lead="Every product area shares the same identity, design language, and privacy guarantees."
        />
        <Stagger className="mt-16 grid gap-5 md:grid-cols-5">
          {pillars.map((p) => (
            <Item key={p.title} className={p.wide ? "md:col-span-3" : "md:col-span-2"}>
              <PillarCard p={p} />
            </Item>
          ))}
        </Stagger>
      </section>

      {/* Principles — numbered rail */}
      <section className="relative border-y border-border-subtle bg-surface-raised/30">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-teal/40 to-transparent"
        />
        <div className="mx-auto max-w-6xl px-6 py-28 md:py-36">
          <SectionHeading
            eyebrow="Principles"
            title="Why privacy-first"
            center={false}
          />
          <Stagger className="mt-16 grid gap-x-12 gap-y-14 md:grid-cols-3">
            {principles.map((p) => (
              <Item key={p.n}>
                <div className="text-sm font-semibold tracking-[0.2em] text-brand-glow">
                  {p.n}
                </div>
                <div className="mt-4 h-px w-full bg-gradient-to-r from-border-subtle to-transparent" />
                <h3 className="mt-6 text-lg font-semibold tracking-tight">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {p.body}
                </p>
              </Item>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-28 md:py-36">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.5rem] border border-border-subtle bg-surface-raised/60 px-8 py-20 text-center md:py-24">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-cyan/12 blur-[100px]"
            />
            <h2 className="relative mx-auto max-w-2xl text-balance text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
              Build the future with us
            </h2>
            <p className="relative mx-auto mt-5 max-w-xl text-balance text-lg text-text-secondary">
              Partnerships, collaboration, and early access — we’d like to
              hear from you.
            </p>
            <div className="relative mt-10 flex justify-center">
              <Button href="/contact" size="lg">
                Contact the Team <ArrowIcon />
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
