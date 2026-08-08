import { Hero } from "@/components/hero";
import { Stagger, Item, Reveal } from "@/components/motion";
import { CardRail } from "@/components/card-rail";
import { publicRoster } from "@/lib/org";
import { Button } from "@/components/button";
import { LogoMark } from "@/components/logo";
import { SentinelAgent } from "@/components/sentinel-agent";
import {
  SharedEcosystem,
  WhatIsEduSentinel,
  WhyWeExist,
} from "@/components/platform-story";

/*
 * The homepage, ordered as a story rather than a feature list (Phase 12).
 *
 * The sections below answer nine questions in the order a first-time visitor
 * actually asks them, and the order is the design — moving a section moves the
 * argument:
 *
 *   1. What is this?            Hero, then WhatIsEduSentinel
 *   2. Why does it exist?       WhatIsEduSentinel, then WhyWeExist
 *   3. Why should I trust it?   The commitments quad — claims that can be checked
 *   4. What problems does it solve?   WhyWeExist
 *   5. What products exist?     The catalogue band
 *   6. Why are there several?   SharedEcosystem
 *   7. Why are they connected?  SharedEcosystem
 *   8. Why make an account?     SharedEcosystem, then the closing CTA
 *   9. Why stay?                The brand band and the closing CTA
 *
 * WHAT WAS REMOVED, and why: a "Built for serious privacy" band of two cards
 * with abstract mock-UI bar charts. Both cards restated commitments the quad
 * below already makes — signed releases, and AI that documents what it does —
 * and did it with invented interface art. Saying the same thing twice is how a
 * page stops being believed the first time. Nothing else lost a section.
 */

const commitments = [
  {
    title: "Privacy by default",
    body: "No third-party trackers, no data resale. We collect the minimum required to operate, and a build check fails the release if a tracker ever appears.",
    icon: <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />,
  },
  {
    title: "Signed releases",
    body: "Every download ships signed, with SHA-256 checksums published alongside it. Verify a build before you run it — the key is public.",
    icon: <path d="M9 12l2 2 4-5m-3-6l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />,
  },
  {
    title: "Transparent AI",
    body: "What a model sees, stores, and never trains on is documented for every product. If we cannot explain it in a paragraph, we do not ship it.",
    icon: <path d="M12 3v3m0 12v3M3 12h3m12 0h3M6.5 6.5l2 2m7 7l2 2m0-11l-2 2m-7 7l-2 2M12 9a3 3 0 110 6 3 3 0 010-6z" />,
  },
  {
    title: "Responsible disclosure",
    body: "A public process for security research, with a 90-day coordinated window and credit where it is due. Found something? Tell us first, not last.",
    icon: <path d="M12 9v4m0 3h.01M10.3 4.3L2.9 17a2 2 0 001.7 3h14.8a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z" />,
  },
];

export default async function Home() {
  // The team rail renders the database (Phase 6.5) — the same records the Founder
  // edits on /app/organization. Only members with something to say are shown: a
  // card with an empty quote is a card that should not exist.
  const team = (await publicRoster()).filter((m) => m.bio);

  return (
    <main>
      <Hero />

      {/* 1 & 2 — what it is, and why it exists at all. */}
      <WhatIsEduSentinel />

      {/* 4 — the problems, each with what we did about it. */}
      <WhyWeExist />

      {/* 3 — why trust it. Four commitments, every one of them checkable, which
          is the only kind worth printing. */}
      <section className="border-y border-border-subtle bg-surface-raised/40">
        <div className="mx-auto max-w-[1360px] px-6 py-20 md:px-10 md:py-24">
          <Reveal>
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <h2 className="max-w-2xl text-balance text-3xl font-medium leading-[1.1] tracking-[-0.03em] md:text-4xl">
                Four commitments you can verify without taking our word for it.
              </h2>
              <p className="max-w-md text-[15px] leading-relaxed text-text-secondary md:text-right">
                Trust that cannot be checked is marketing. Each of these is
                enforced somewhere you can look.
              </p>
            </div>
          </Reveal>
          <Stagger className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {commitments.map((f) => (
              <Item key={f.title}>
                <div className="flex items-center gap-2.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-brand-teal">
                    {f.icon}
                  </svg>
                  <h3 className="text-[17px] font-semibold tracking-tight">{f.title}</h3>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
                  {f.body}
                </p>
              </Item>
            ))}
          </Stagger>
        </div>
      </section>

      {/*
       * ---- The Sentinel Agent (Phase 10, Task 4) ----
       *
       * PLACEMENT, and why here. The brief left the position to judgement, with
       * the instruction to pick the most premium one. This is it, for three
       * reasons that all point the same way:
       *
       *   - It is BELOW THE FOLD. The agent is a 600 KB WebGL scene; putting it
       *     in the hero would have made it the Largest Contentful Paint element
       *     on the site's most important page and undone Task 8 in one move.
       *     Here it is fetched on approach and never blocks first paint.
       *
       *   - It has NARRATIVE JUSTIFICATION. It follows the commitments — the
       *     character arrives as the thing those promises are made of, instead
       *     of as a robot bolted onto a security site.
       *
       *   - It EARNS ITS SPACE. This was one of the emptiest stretches of the
       *     page — a straight run of centred text blocks — so the agent does
       *     double duty as the Task 6 answer to excessive whitespace here.
       *
       * Azure: the agent is live, active workflow, not catalogue.
       */}
      <section
        className="mx-auto max-w-[1360px] px-6 pb-24 pt-24 md:px-10 md:pb-28 md:pt-28"
        data-accent="azure"
      >
        <div className="grid items-center gap-10 rounded-card border border-border-subtle bg-surface-raised px-6 py-12 md:px-12 lg:grid-cols-[1fr_1.05fr] lg:gap-6 lg:py-6 lg:pr-6">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-teal">
              Meet the assistant
            </p>
            <h2 className="mt-4 text-balance text-4xl font-medium tracking-[-0.03em] md:text-5xl">
              Sentinel Agent
            </h2>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-text-secondary">
              The engine at the centre of the platform, given a face. It reads a
              page the way an analyst would — checking who really sent something,
              what a link actually points at, and whether a download is signed by
              someone you have reason to trust — and it does that work on your
              device.
            </p>

            <ul className="mt-8 flex flex-col gap-3.5">
              {[
                "Runs locally — pages you read are not sent anywhere to be scored.",
                "Explains its reasoning instead of returning a verdict you cannot check.",
                "Verifies release signatures against the published key.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-brand-cyan"
                  >
                    <path d="M9 12l2 2 4-5m-3-6l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
                  </svg>
                  <span className="leading-relaxed text-text-secondary">{line}</span>
                </li>
              ))}
            </ul>

            <Button href="/products" size="lg" className="mt-9">
              Explore the ecosystem
            </Button>
          </Reveal>

          {/* The scene mounts itself only when it is wanted — see
              components/sentinel-agent.tsx for the three gates. */}
          <SentinelAgent />
        </div>
      </section>

      {/* 6, 7 & 8 — why there are several products, why they are one thing, and
          what an account actually gets you. */}
      <SharedEcosystem />

      {/* voices rail (reference testimonial layout, honest content) */}
      {team.length > 0 && (
        <section className="mx-auto max-w-[1360px] px-6 pb-24 md:px-10 md:pb-28">
          <CardRail title="Hear it from the team" members={team} />
        </section>
      )}

      {/* 9 — the close. The brand statement and the close were two separate
          centred bands saying the same thing to the same reader; they are now
          one. ambient-horizon (Task 6) stays with it: the last and emptiest
          band on the page. */}
      <section className="ambient-horizon mx-auto max-w-[1360px] px-6 pb-32 pt-12 md:px-10 md:pt-16">
        <Reveal className="flex flex-col items-center text-center">
          <h2 className="max-w-3xl text-balance text-4xl font-medium leading-[1.08] tracking-[-0.03em] md:text-6xl">
            Trust Every Click.
            <br />
            Protect Every Digital Asset.
          </h2>
          <p className="mt-7 max-w-2xl text-balance text-[17px] leading-relaxed text-text-secondary">
            EduSentinel AI is a cybersecurity-first platform: source
            verification, scam prevention, phishing defence and browser
            protection, powered by shared on-device intelligence — and a growing
            family of products built on exactly the same core.
          </p>
          <p className="mt-8 text-[17px] font-semibold tracking-tight text-brand-teal">
            Build Until Success Finds You.
          </p>
          <Button href="/products" size="lg" className="mt-10">
            <span className="flex items-center gap-1">
              Get started with <LogoMark size={26} /> EduSentinel
            </span>
          </Button>
        </Reveal>
      </section>
    </main>
  );
}
