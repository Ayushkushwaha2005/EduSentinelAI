import { Hero } from "@/components/hero";
import { SplitHeading } from "@/components/section";
import { Stagger, Item, Reveal } from "@/components/motion";
import { CardRail } from "@/components/card-rail";
import { publicRoster } from "@/lib/org";
import { Button } from "@/components/button";
import { LogoMark } from "@/components/logo";
import { SentinelAgent } from "@/components/sentinel-agent";

const featureQuad = [
  {
    title: "Privacy by default",
    body: "No third-party trackers, no data resale. We collect the minimum required to operate.",
    icon: <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />,
  },
  {
    title: "Signed releases",
    body: "Every download ships signed, with SHA-256 checksums published alongside it.",
    icon: <path d="M9 12l2 2 4-5m-3-6l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />,
  },
  {
    title: "Transparent AI",
    body: "What a model sees, stores, and never trains on is documented for every product.",
    icon: <path d="M12 3v3m0 12v3M3 12h3m12 0h3M6.5 6.5l2 2m7 7l2 2m0-11l-2 2m-7 7l-2 2M12 9a3 3 0 110 6 3 3 0 010-6z" />,
  },
  {
    title: "Responsible disclosure",
    body: "A public process for security research, with a 90-day coordinated window.",
    icon: <path d="M12 9v4m0 3h.01M10.3 4.3L2.9 17a2 2 0 001.7 3h14.8a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z" />,
  },
];

const showcases = [
  {
    title: "Security tooling with receipts",
    body: "Defensive tools and research publications, distributed through a download center where every artifact is signed and verifiable.",
    icon: <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />,
    rows: [88, 64, 76, 52],
  },
  {
    title: "AI that shows its work",
    body: "Products and agents that document their data practices up front, so trust is verifiable instead of promised.",
    icon: <path d="M12 3v3m0 12v3M3 12h3m12 0h3M6.5 6.5l2 2m7 7l2 2m0-11l-2 2m-7 7l-2 2M12 9a3 3 0 110 6 3 3 0 010-6z" />,
    rows: [70, 92, 58, 80],
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

      {/* four-across feature row */}
      <section className="mx-auto max-w-[1360px] px-6 py-24 md:px-10 md:py-32">
        <Stagger className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {featureQuad.map((f) => (
            <Item key={f.title}>
              <div className="flex items-center gap-2.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-text-primary">
                  {f.icon}
                </svg>
                <h3 className="text-[17px] font-semibold tracking-tight">{f.title}</h3>
              </div>
              <p className="mt-3 leading-relaxed text-text-secondary">{f.body}</p>
            </Item>
          ))}
        </Stagger>
      </section>

      {/* products preview — full showcase lives at /products */}
      {/* Violet: the same colour the catalogue carries everywhere else. */}
      {/* ambient-glow (Task 6): a centred headline, one paragraph and a button in
          a very tall band — one of the emptiest stretches on the site. */}
      <section
        className="ambient-glow mx-auto max-w-[1360px] px-6 pb-24 md:px-10 md:pb-32"
        data-accent="violet"
      >
        <Reveal className="flex flex-col items-center text-center">
          <h2 className="max-w-2xl text-balance text-4xl font-medium tracking-[-0.03em] md:text-6xl">
            Products built for digital trust.
          </h2>
          <p className="mt-5 max-w-xl text-balance text-[17px] leading-relaxed text-text-secondary">
            Browser protection, mobile security, AI planning tools, and the
            upcoming SentinelAI Agent — every one privacy-first, every one on
            a single account.
          </p>
          <Button href="/products" size="lg" className="mt-9">
            View Products
          </Button>
        </Reveal>
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
       *   - It has NARRATIVE JUSTIFICATION. The section immediately above already
       *     promises "the upcoming SentinelAI Agent". The character arrives as the
       *     payoff to a sentence the page was already making, instead of as a
       *     robot bolted onto a security site.
       *
       *   - It EARNS ITS SPACE. This was one of the emptiest stretches of the
       *     page — a straight run of centred text blocks — so the agent does
       *     double duty as the Task 6 answer to excessive whitespace here.
       *
       * Azure: the agent is live, active workflow, not catalogue.
       */}
      <section
        className="mx-auto max-w-[1360px] px-6 pb-24 md:px-10 md:pb-32"
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
              The official EduSentinel AI assistant. It reads a page the way an
              analyst would — checking who really sent something, what a link
              actually points at, and whether a download is signed by someone you
              have reason to trust — and it does that work on your device.
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

      {/* big split heading + hairline-divided showcase */}
      <section className="mx-auto max-w-[1360px] px-6 pb-24 md:px-10 md:pb-32">
        <SplitHeading
          title="Built for serious privacy."
          aside="EduSentinel is designed for people who read the fine print. Our commitments are engineering requirements, not marketing."
        />
        <div className="mt-16 grid border-t border-border-subtle md:grid-cols-2 md:divide-x md:divide-border-subtle">
          {showcases.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1} className={`pt-12 ${i === 0 ? "md:pr-14" : "md:pl-14"}`}>
              <div className="flex items-center gap-2.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {s.icon}
                </svg>
                <h3 className="text-xl font-semibold tracking-tight">{s.title}</h3>
              </div>
              <p className="mt-4 max-w-md leading-relaxed text-text-secondary">{s.body}</p>
              {/* abstract light visual */}
              <div className="mt-10 rounded-card bg-gradient-to-b from-surface-overlay/70 to-surface-base p-8 md:p-10">
                <div className="rounded-lg border border-border-subtle bg-surface-raised p-6 shadow-[0_16px_40px_-20px_rgba(18,19,23,0.15)]">
                  <div className="h-3 w-2/5 rounded-full bg-surface-overlay" />
                  <div className="mt-5 space-y-3">
                    {s.rows.map((w, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <div className="h-2.5 rounded-full bg-surface-overlay" style={{ width: `${w}%` }} />
                        <div className="h-2.5 w-8 rounded-full bg-gradient-to-r from-brand-cyan/60 to-brand-teal/60" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* voices rail (reference testimonial layout, honest content) */}
      <section className="mx-auto max-w-[1360px] px-6 pb-24 md:px-10 md:pb-32">
        {team.length > 0 && (
          <CardRail title="Hear it from the team" members={team} />
        )}
      </section>

      {/* brand statement band — ambient-grid (Task 6): the widest empty area on
          the page, and the one place a measured plane suits the copy. */}
      <section className="ambient-grid border-y border-border-subtle bg-surface-raised/40">
        <div className="mx-auto max-w-[1360px] px-6 py-24 md:px-10 md:py-28">
          <Reveal className="flex flex-col items-center text-center">
            <h2 className="max-w-3xl text-balance text-3xl font-medium leading-[1.15] tracking-[-0.03em] md:text-5xl">
              Trust Every Click.
              <br />
              Protect Every Digital Asset.
            </h2>
            <p className="mt-7 max-w-2xl text-balance text-[17px] leading-relaxed text-text-secondary">
              EduSentinel AI is a privacy-first cybersecurity ecosystem focused
              on digital trust, source verification, scam prevention, phishing
              defense, browser protection, educational security and local
              AI-powered intelligence.
            </p>
            <p className="mt-8 text-[17px] font-semibold tracking-tight text-brand-teal">
              Build Until Success Finds You.
            </p>
          </Reveal>
        </div>
      </section>

      {/* centered CTA — ambient-horizon (Task 6): a headline and a button alone
          above the footer, the last and emptiest band on the page. */}
      <section className="ambient-horizon mx-auto max-w-[1360px] px-6 pb-32 pt-8 md:px-10">
        <Reveal className="flex flex-col items-center text-center">
          <h2 className="max-w-2xl text-balance text-4xl font-medium tracking-[-0.03em] md:text-6xl">
            Build something you’re proud of
          </h2>
          <Button href="/products" size="lg" className="mt-10">
            <span className="flex items-center gap-1">
              Try <LogoMark size={26} /> EduSentinel
            </span>
          </Button>
        </Reveal>
      </section>
    </main>
  );
}
