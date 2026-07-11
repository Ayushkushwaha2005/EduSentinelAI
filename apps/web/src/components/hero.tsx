"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { EASE } from "./motion";
import { Button, ArrowIcon } from "./button";
import { LogoMark } from "./logo";

const tabs = [
  "Security tooling",
  "AI products",
  "Cloud utilities",
  "Learning hub",
  "Research",
];

const areas = [
  "Cybersecurity",
  "AI & Machine Learning",
  "Cloud Computing",
  "Developer Tools",
  "Education",
  "Research",
];

/** Decorative product panel — abstract light UI, no fake data. */
function PreviewPanel() {
  const reduce = useReducedMotion();
  const bars = [38, 62, 48, 74, 58, 86, 66, 52, 78, 92];
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-3 shadow-[0_24px_60px_-24px_rgba(18,19,23,0.18)]">
      <div className="rounded-lg border border-border-subtle/70 bg-surface-base/60 p-5 md:p-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-control border border-border-subtle bg-surface-raised px-3 py-1.5 text-xs font-medium text-text-secondary">
            <LogoMark size={14} /> Platform
          </div>
          <div className="flex -space-x-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-6 w-6 rounded-full border-2 border-surface-raised bg-surface-overlay"
              />
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1.8fr]">
          <div className="hidden space-y-3 md:block">
            {[100, 72, 86, 58, 80, 64].map((w, i) => (
              <motion.div
                key={i}
                className="h-2.5 rounded-full bg-surface-overlay"
                style={{ width: `${w}%` }}
                initial={reduce ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.07, duration: 0.45, ease: EASE }}
              />
            ))}
          </div>
          <div className="flex h-48 items-end gap-2.5 rounded-lg border border-border-subtle/70 bg-surface-raised p-5 md:h-56">
            {bars.map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 origin-bottom rounded-t-[3px] bg-gradient-to-t from-brand-teal to-brand-cyan"
                style={{ height: `${h}%`, opacity: 0.85 }}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.8 + i * 0.05, duration: 0.6, ease: EASE }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState(0);

  const enter = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE, delay },
  });

  return (
    <section className="overflow-hidden pt-[72px]">
      <div className="mx-auto max-w-[1360px] px-6 md:px-10">
        <div className="grid items-center gap-14 pt-16 md:grid-cols-[0.95fr_1.05fr] md:pt-24">
          {/* left column */}
          <div>
            <motion.h1
              {...enter(0.05)}
              className="text-balance text-5xl font-medium leading-[1.04] tracking-[-0.035em] md:text-[4.5rem]"
            >
              Private by design,
              <br />
              at the speed of AI
            </motion.h1>
            <motion.p
              {...enter(0.18)}
              className="mt-7 max-w-md text-[17px] leading-relaxed text-text-secondary"
            >
              EduSentinel AI turns security, AI, cloud, and education into one
              privacy-first product ecosystem — where your data belongs to you.
            </motion.p>
            <motion.div {...enter(0.3)} className="mt-9 flex items-center gap-7">
              <Button href="/contact" size="lg">
                Get started
              </Button>
              <Link
                href="/solutions"
                className="inline-flex items-center gap-2 text-[15px] font-medium text-text-primary transition-colors hover:text-text-secondary"
              >
                Explore solutions <ArrowIcon />
              </Link>
            </motion.div>
          </div>

          {/* right column — panel bleeds off the right edge on desktop */}
          <motion.div
            {...enter(0.35)}
            className="relative md:-mr-16 lg:-mr-28"
          >
            <PreviewPanel />
          </motion.div>
        </div>

        {/* tab strip under the panel, reference-style */}
        <motion.div
          {...enter(0.55)}
          className="mt-12 flex justify-start gap-8 overflow-x-auto pb-1 md:justify-end"
        >
          {tabs.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(i)}
              className={`relative shrink-0 pb-2 text-[15px] transition-colors ${
                tab === i ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {t}
              {tab === i && (
                <motion.span
                  layoutId="hero-tab"
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-ink"
                  transition={{ duration: 0.3, ease: EASE }}
                />
              )}
            </button>
          ))}
        </motion.div>

        {/* trust strip: bordered cell grid (no invented customers) */}
        <motion.div {...enter(0.65)} className="mt-20 md:mt-28">
          <p className="text-[17px] text-text-secondary">
            One team across six disciplines, building in the open
          </p>
          <div className="mt-6 grid grid-cols-2 border-l border-t border-border-subtle sm:grid-cols-3 md:grid-cols-6">
            {areas.map((a) => (
              <div
                key={a}
                className="flex h-24 items-center justify-center border-b border-r border-border-subtle px-3 text-center text-[15px] font-medium text-text-secondary"
              >
                {a}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
