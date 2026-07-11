import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";

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

export default function CompanyPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <Reveal>
        <h1 className="text-4xl font-bold tracking-tight">Company</h1>
        <p className="mt-4 max-w-2xl text-lg text-text-secondary">
          EduSentinel AI exists because privacy and capability shouldn’t be a
          trade-off. We build technology we would trust with our own data.
        </p>
      </Reveal>

      <Reveal className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight">The team</h2>
      </Reveal>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((m, i) => (
          <Reveal key={m.name} delay={i * 0.06}>
            <div className="h-full rounded-card border border-border-subtle bg-surface-raised p-6">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-cyan to-brand-teal font-bold text-surface-base"
              >
                {m.name[0]}
              </div>
              <h3 className="mt-4 font-semibold">{m.name}</h3>
              <p className="text-sm text-brand-glow">{m.title}</p>
              <p className="mt-2 text-sm text-text-secondary">{m.roles}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-20 rounded-card border border-border-subtle bg-surface-raised/40 p-10">
        <h2 className="text-2xl font-bold tracking-tight">Our commitments</h2>
        <ul className="mt-6 space-y-3 text-text-secondary">
          <li>— No third-party trackers on any EduSentinel property.</li>
          <li>— Signed releases and published checksums for every download.</li>
          <li>— A public responsible-disclosure process for security research.</li>
          <li>— Plain-language policies you can actually read.</li>
        </ul>
      </Reveal>
    </main>
  );
}
