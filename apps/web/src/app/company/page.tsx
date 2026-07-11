import type { Metadata } from "next";
import { Reveal, Stagger, Item, HoverCard } from "@/components/motion";
import { Eyebrow } from "@/components/section";

export const metadata: Metadata = {
  title: "Company",
  description:
    "The team behind EduSentinel AI — building a privacy-first technology ecosystem.",
};

const team = [
  {
    name: "Ayush Kushwaha",
    title: "Founder",
    roles: "Backend · Cloud Computing · AI/ML · Cybersecurity",
  },
  {
    name: "Ayush Maurya",
    title: "Co-Founder",
    roles: "AI/ML · Data Analytics",
  },
  {
    name: "Jujhar Singh",
    title: "Core Team",
    roles: "Frontend Development · Marketing Lead",
  },
  {
    name: "Vedansh",
    title: "Core Team",
    roles: "Backend Development",
  },
  {
    name: "Aishika",
    title: "Core Team",
    roles: "Collaborative Partner · Marketing Manager",
  },
];

const commitments = [
  "No third-party trackers on any EduSentinel property.",
  "Signed releases and published checksums for every download.",
  "A public responsible-disclosure process for security research.",
  "Plain-language policies you can actually read.",
];

export default function CompanyPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-28 pt-36 md:pt-44">
      <Reveal className="flex flex-col items-start">
        <Eyebrow>Company</Eyebrow>
        <h1 className="mt-6 max-w-3xl text-balance text-5xl font-semibold tracking-[-0.04em] md:text-6xl">
          Privacy and capability shouldn’t be a trade-off
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
          We build technology we would trust with our own data — and publish
          the receipts.
        </p>
      </Reveal>

      <Reveal className="mt-24">
        <h2 className="text-2xl font-semibold tracking-tight">The team</h2>
      </Reveal>
      <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((m) => (
          <Item key={m.name}>
            <HoverCard className="group h-full">
              <div className="h-full rounded-card border border-border-subtle bg-surface-raised/60 p-7 transition-colors duration-300 group-hover:border-brand-teal/40">
                <div
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-cyan to-brand-teal font-bold text-surface-base"
                >
                  {m.name[0]}
                </div>
                <h3 className="mt-5 font-semibold tracking-tight">{m.name}</h3>
                <p className="mt-1 text-sm text-brand-glow">{m.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {m.roles}
                </p>
              </div>
            </HoverCard>
          </Item>
        ))}
      </Stagger>

      <Reveal className="mt-24">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-border-subtle bg-surface-raised/40 p-10 md:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-teal/10 blur-[100px]"
          />
          <h2 className="text-2xl font-semibold tracking-tight">
            Our commitments
          </h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-2">
            {commitments.map((c) => (
              <li key={c} className="flex items-start gap-3 text-text-secondary">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-brand-glow"
                >
                  <circle cx="10" cy="10" r="9" stroke="currentColor" strokeOpacity="0.35" />
                  <path d="M6 10.5l2.5 2.5L14 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </main>
  );
}
