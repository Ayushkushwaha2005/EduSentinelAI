import type { Metadata } from "next";
import { SplitHeading } from "@/components/section";
import { Reveal, Stagger, Item } from "@/components/motion";
import { TeamPhoto } from "@/components/team-photo";
import { TEAM } from "@/lib/team";

export const metadata: Metadata = {
  title: "Company",
  description:
    "The team behind EduSentinel AI — building a privacy-first technology ecosystem.",
};

const commitments = [
  "No third-party trackers on any EduSentinel property.",
  "Signed releases and published checksums for every download.",
  "A public responsible-disclosure process for security research.",
  "Plain-language policies you can actually read.",
];

export default function CompanyPage() {
  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-32 pt-20 md:px-10">
      <div className="pt-16 md:pt-24">
        <SplitHeading
          title="Privacy and capability shouldn’t be a trade-off."
          aside="We build technology we would trust with our own data — and publish the receipts."
        />
      </div>

      <Reveal className="mt-24">
        <h2 className="text-2xl font-medium tracking-tight">The team</h2>
      </Reveal>
      <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM.map((m) => (
          <Item key={m.name} className="h-full">
            <div className="flex h-full flex-col overflow-hidden rounded-card border border-border-subtle bg-surface-raised">
              <TeamPhoto
                name={m.name}
                photo={m.photo}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="aspect-[4/4.5] w-full"
              />
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold tracking-tight">{m.name}</h3>
                <p className="mt-0.5 text-sm font-medium text-brand-teal">
                  {m.position}
                </p>
                <ul className="mt-3 space-y-1">
                  {m.roles.map((r) => (
                    <li key={r} className="text-sm leading-snug text-text-secondary">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Item>
        ))}
      </Stagger>

      <Reveal className="mt-24">
        <div className="rounded-card border border-border-subtle bg-surface-raised p-10 md:p-14">
          <h2 className="text-2xl font-medium tracking-tight">Our commitments</h2>
          <ul className="mt-8 grid gap-x-12 gap-y-5 md:grid-cols-2">
            {commitments.map((c) => (
              <li key={c} className="flex items-start gap-3 text-[15px] leading-relaxed text-text-secondary">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-text-primary">
                  <path d="M2.5 8.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
