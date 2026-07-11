import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { Reveal } from "@/components/reveal";

const pillars = [
  {
    title: "Cybersecurity",
    body: "Security tooling and research built on a privacy-first foundation — protection without surveillance.",
  },
  {
    title: "AI & Machine Learning",
    body: "Practical AI products and agents designed with transparent data practices from day one.",
  },
  {
    title: "Cloud & Developer Tools",
    body: "Infrastructure, extensions, and utilities that respect developers and their data.",
  },
  {
    title: "Education & Research",
    body: "Learning technology and open research that make security and AI knowledge accessible.",
  },
];

const principles = [
  {
    title: "Privacy by default",
    body: "No third-party trackers, no data resale. We collect the minimum required to operate — and we say exactly what that is.",
  },
  {
    title: "Security as a discipline",
    body: "Signed releases, published checksums, responsible disclosure, and audited privileged actions across everything we ship.",
  },
  {
    title: "Built to last",
    body: "One identity, one design language, one platform — engineered so every future product strengthens the ecosystem.",
  },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(34,211,238,0.12),transparent)]"
        />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-28 text-center">
          <Reveal>
            <LogoMark size={72} />
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mt-8 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
              A privacy-first{" "}
              <span className="bg-gradient-to-r from-brand-cyan to-brand-teal bg-clip-text text-transparent">
                technology ecosystem
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-2xl text-lg text-text-secondary">
              EduSentinel AI builds products across cybersecurity, artificial
              intelligence, cloud, and education — engineered on one principle:
              your data belongs to you.
            </p>
          </Reveal>
          <Reveal delay={0.3} className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="rounded-control bg-gradient-to-r from-brand-cyan to-brand-teal px-6 py-3 font-semibold text-surface-base transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
            <Link
              href="/solutions"
              className="rounded-control border border-border-subtle px-6 py-3 font-semibold text-text-primary transition-colors hover:border-brand-teal"
            >
              Explore Solutions
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <h2 className="text-center text-3xl font-bold tracking-tight">
            One platform. Many frontiers.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="h-full rounded-card border border-border-subtle bg-surface-raised p-8 transition-colors hover:border-brand-teal/50">
                <h3 className="text-xl font-semibold">{p.title}</h3>
                <p className="mt-3 text-text-secondary">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Principles */}
      <section className="border-y border-border-subtle bg-surface-raised/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight">
              Why privacy-first
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {principles.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <h3 className="font-semibold text-brand-glow">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {p.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight">
            Build the future with us
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-text-secondary">
            Partnerships, collaboration, and early access — we’d like to hear
            from you.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-block rounded-control bg-gradient-to-r from-brand-cyan to-brand-teal px-8 py-3 font-semibold text-surface-base transition-opacity hover:opacity-90"
          >
            Contact the Team
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
