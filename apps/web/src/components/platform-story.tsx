import { Reveal, Stagger, Item } from "./motion";
import { Button } from "./button";
import { ProductIcon } from "@/lib/product-icons";

/*
 * The platform story (Phase 12).
 *
 * The homepage used to open with a hero and then go straight to selling. A
 * first-time visitor could read the whole page and still not be able to answer
 * "what IS this?" — so these are the sections that answer it, in the order the
 * questions actually arrive: what it is, why it exists, why one account covers
 * all of it.
 *
 * Everything here is content, not chrome. No client hooks, no state, no fetch:
 * these are server components that render text and CSS, and the only
 * interactivity in the file comes from the shared Reveal/Stagger wrappers.
 *
 * The identity ladder below — Cybersecurity → Shared AI → Products → Expansion
 * — is the one thing on the site that must never drift. Cybersecurity is rung
 * one because that is what EduSentinel is; everything above it is what the
 * security engine made possible. Reordering these is a brand decision, not a
 * layout one.
 */

const LADDER = [
  {
    step: "01",
    icon: "shield",
    title: "A cybersecurity platform",
    body: "It starts where we started: telling a real message from a crafted one, a safe download from a costly one. Every other rung stands on this.",
  },
  {
    step: "02",
    icon: "spark",
    title: "Shared AI intelligence",
    body: "One engine learns to make that judgement, and every product asks the same engine. There is no second-rate model behind the smaller products.",
  },
  {
    step: "03",
    icon: "browser",
    title: "A product ecosystem",
    body: "Browser, mobile, planning, analytics — different surfaces, identical core. One account signs into all of them, and one privacy promise covers them.",
  },
  {
    step: "04",
    icon: "cloud",
    title: "Room to expand",
    body: "New products join by clearing the same bar, not by loosening it. The catalogue can grow to hundreds without the identity changing once.",
  },
];

const PROBLEMS = [
  {
    icon: "shield",
    problem: "Scams have gotten better than we have",
    answer:
      "A fake internship offer now reads better than the real one. EduSentinel checks who actually sent a thing and where a link actually goes, and shows you the working rather than a verdict.",
  },
  {
    icon: "lock",
    problem: "Free tools are paid for with your data",
    answer:
      "The usual bargain is protection in exchange for surveillance. We take neither side of it: no third-party trackers, no analytics SDKs, no tracking pixels in our email, no data resale — checked by a script in our build, not by a promise on a page.",
  },
  {
    icon: "spark",
    problem: "AI you cannot inspect is AI you cannot trust",
    answer:
      "What a model sees, what it stores, and what it never trains on is documented for every product we ship. Where the work can be done on your device, it is done on your device.",
  },
  {
    icon: "browser",
    problem: "Ten tools, ten accounts, ten privacy policies",
    answer:
      "Every EduSentinel product runs on one engine and one identity. Adding the next product to your life does not mean adding another company to the list of people who hold your data.",
  },
];

/**
 * "What is EduSentinel AI?" — the section the site was missing.
 *
 * Placed immediately after the hero, because everything below it assumes an
 * answer the visitor does not have yet.
 */
export function WhatIsEduSentinel() {
  return (
    <section
      id="what-is-edusentinel"
      className="scroll-mt-24 border-y border-border-subtle bg-surface-raised/40"
      data-accent="azure"
    >
      <div className="mx-auto max-w-[1360px] px-6 py-24 md:px-10 md:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand-teal">
                What is EduSentinel AI?
              </p>
              <h2 className="mt-4 text-balance text-4xl font-medium leading-[1.08] tracking-[-0.03em] md:text-5xl">
                A cybersecurity platform that grew an ecosystem.
              </h2>
              <div className="mt-6 space-y-5 text-[17px] leading-relaxed text-text-secondary">
                <p>
                  EduSentinel AI began with a specific, unglamorous problem:
                  students were losing money and data to scams that looked
                  entirely legitimate. Answering that well meant building an
                  engine that could judge a message, a sender and a link in
                  context — and do it without shipping anyone’s inbox to a
                  server for scoring.
                </p>
                <p>
                  That engine turned out to be worth more than the one product.
                  So instead of starting a second company every time it was
                  useful somewhere new, we built the next product on the same
                  core, behind the same account, under the same promise. That is
                  the whole platform in one sentence.
                </p>
                <p className="text-text-primary">
                  Cybersecurity is not one of the things we do. It is the thing
                  everything else is made of.
                </p>
              </div>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Button href="/products" size="lg">
                  See what we build
                </Button>
                <Button href="/legal/security" size="lg" variant="secondary">
                  Read the security model
                </Button>
              </div>
            </Reveal>
          </div>

          {/* The identity ladder, read top-down: each rung is what the rung
              below made possible. Numbered so the dependency is unmistakable. */}
          <div className="lg:col-span-7">
            <Stagger className="flex flex-col gap-3">
              {LADDER.map((rung, i) => (
                <Item key={rung.step}>
                  <div className="relative flex gap-5 rounded-card border border-border-subtle bg-surface-raised p-6 md:p-7">
                    <div className="flex shrink-0 flex-col items-center">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-subtle bg-surface-base text-brand-teal">
                        <ProductIcon icon={rung.icon} size={21} />
                      </span>
                      {/* The spine only draws BETWEEN rungs — no dangling tail
                          under the last one. */}
                      {i < LADDER.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="mt-3 w-px flex-1 bg-gradient-to-b from-border-subtle to-transparent"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-3">
                        <span className="font-mono text-[12px] text-text-muted">
                          {rung.step}
                        </span>
                        <span className="text-[17px] font-semibold tracking-tight">
                          {rung.title}
                        </span>
                      </p>
                      <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
                        {rung.body}
                      </p>
                    </div>
                  </div>
                </Item>
              ))}
            </Stagger>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Why it exists — the four problems, each paired with what we actually did
 * about it. A problem list without answers is a complaint.
 */
export function WhyWeExist() {
  return (
    <section className="mx-auto max-w-[1360px] px-6 py-24 md:px-10 md:py-28">
      <Reveal>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h2 className="max-w-2xl text-balance text-4xl font-medium leading-[1.08] tracking-[-0.03em] md:text-5xl">
            The four problems we refused to live with.
          </h2>
          <p className="max-w-md text-[17px] leading-relaxed text-text-secondary md:text-right">
            Each one is why a specific piece of this platform exists. None of
            them are solved by a better landing page.
          </p>
        </div>
      </Reveal>

      <Stagger className="mt-14 grid gap-x-12 gap-y-12 md:grid-cols-2">
        {PROBLEMS.map((p) => (
          <Item key={p.problem}>
            <div className="border-t border-border-subtle pt-7">
              <div className="flex items-start gap-3.5">
                <span className="mt-0.5 shrink-0 text-brand-teal">
                  <ProductIcon icon={p.icon} size={22} />
                </span>
                <h3 className="text-[19px] font-semibold leading-snug tracking-tight">
                  {p.problem}
                </h3>
              </div>
              <p className="mt-3.5 leading-relaxed text-text-secondary">{p.answer}</p>
            </div>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}

const SHARED = [
  {
    icon: "spark",
    title: "One AI",
    body: "The same engine answers in every product. Nothing gets a weaker model because it is not the flagship.",
  },
  {
    icon: "lock",
    title: "One identity",
    body: "Who you are is established once. No product asks you to prove it again, and no product learns something the others should not know.",
  },
  {
    icon: "browser",
    title: "One account",
    body: "Sign in once and every product you are entitled to is already open. Leaving is one action too — it takes everything with it.",
  },
  {
    icon: "shield",
    title: "Shared security",
    body: "Signed releases, published checksums and a single disclosure process. A fix to the core is a fix everywhere, on the same day.",
  },
  {
    icon: "leaf",
    title: "Shared privacy",
    body: "One promise, not one per product: no trackers, no resale, no training on your content. It holds for the newest product as strictly as the oldest.",
  },
  {
    icon: "brain",
    title: "Shared intelligence",
    body: "What the engine learns about a threat protects every surface at once — the browser, the phone, the inbox — without moving your data between them.",
  },
];

/**
 * The shared-ecosystem section: why these are one platform and not a portfolio.
 * This is the argument for creating an account, so it sits directly before the
 * page's closing call to action.
 */
export function SharedEcosystem() {
  return (
    <section
      className="mx-auto max-w-[1360px] px-6 pb-24 md:px-10 md:pb-28"
      data-accent="azure"
    >
      <Reveal className="flex flex-col items-center text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand-teal">
          One ecosystem
        </p>
        <h2 className="mt-4 max-w-3xl text-balance text-4xl font-medium leading-[1.08] tracking-[-0.03em] md:text-5xl">
          Every product is a window onto the same engine.
        </h2>
        <p className="mt-5 max-w-2xl text-balance text-[17px] leading-relaxed text-text-secondary">
          Six things are shared across everything we ship — and they are the
          reason the catalogue can keep growing without asking anything more of
          you than it already has.
        </p>
      </Reveal>

      <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SHARED.map((s) => (
          <Item key={s.title} className="h-full">
            <div className="flex h-full flex-col rounded-card border border-border-subtle bg-surface-raised p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-subtle bg-surface-base text-brand-teal">
                <ProductIcon icon={s.icon} size={21} />
              </span>
              <h3 className="mt-5 text-[17px] font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-text-secondary">
                {s.body}
              </p>
            </div>
          </Item>
        ))}
      </Stagger>
    </section>
  );
}
