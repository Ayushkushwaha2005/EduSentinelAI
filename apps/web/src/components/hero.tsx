"use client";

import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { MaskedLines, EASE } from "./motion";
import { Eyebrow } from "./section";
import { Button, ArrowIcon } from "./button";

/** Decorative, abstract platform panel — animated bars and rows, no fake data. */
function PreviewPanel() {
  const reduce = useReducedMotion();
  const bars = [42, 68, 55, 80, 63, 90, 74, 58, 85, 70, 96, 62];
  return (
    <div className="relative rounded-[1.25rem] border border-border-subtle bg-surface-raised/70 p-2 shadow-[0_40px_120px_-40px_rgba(34,211,238,0.25)] backdrop-blur-xl">
      <div className="rounded-xl border border-border-subtle/60 bg-surface-base/80 p-6">
        {/* window chrome */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-full bg-surface-overlay" />
          ))}
          <div className="ml-4 h-6 w-48 rounded-full bg-surface-overlay/70" />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_2fr]">
          {/* sidebar skeleton */}
          <div className="hidden space-y-3 md:block">
            {[100, 75, 88, 60, 82].map((w, i) => (
              <motion.div
                key={i}
                className="h-3 rounded-full bg-surface-overlay"
                style={{ width: `${w}%` }}
                initial={reduce ? false : { opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.08, duration: 0.5, ease: EASE }}
              />
            ))}
          </div>
          {/* animated chart */}
          <div className="flex h-44 items-end gap-2 rounded-lg border border-border-subtle/60 p-4">
            {bars.map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 origin-bottom rounded-t-sm bg-gradient-to-t from-brand-teal/50 to-brand-cyan"
                style={{ height: `${h}%` }}
                initial={reduce ? false : { scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 + i * 0.05, duration: 0.7, ease: EASE }}
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
  const { scrollY } = useScroll();
  const orbY = useTransform(scrollY, [0, 600], [0, 120]);
  const panelY = useTransform(scrollY, [0, 600], [0, -40]);

  return (
    <section className="relative overflow-hidden pt-40 md:pt-48">
      {/* glow field */}
      <motion.div
        aria-hidden="true"
        style={reduce ? undefined : { y: orbY }}
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem]"
      >
        <div className="absolute left-1/2 top-[-12rem] h-[28rem] w-[44rem] -translate-x-1/2 rounded-full bg-brand-cyan/15 blur-[120px]" />
        <div className="absolute left-1/4 top-32 h-64 w-64 rounded-full bg-brand-teal/10 blur-[100px]" />
        <div className="absolute right-1/5 top-52 h-72 w-72 rounded-full bg-brand-glow/10 blur-[110px]" />
      </motion.div>
      {/* grid texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(245,247,250,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(245,247,250,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(60%_50%_at_50%_10%,black,transparent)]"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Eyebrow>Privacy-first technology ecosystem</Eyebrow>
        </motion.div>

        <MaskedLines
          delay={0.15}
          className="mt-8 text-balance text-5xl font-semibold leading-[1.04] tracking-[-0.04em] md:text-7xl"
          lines={[
            <>Technology that answers</>,
            <>
              to{" "}
              <span className="bg-gradient-to-r from-brand-glow via-brand-cyan to-brand-teal bg-clip-text text-transparent">
                you alone
              </span>
            </>,
          ]}
        />

        <motion.p
          className="mt-7 max-w-xl text-balance text-lg leading-relaxed text-text-secondary md:text-xl"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
        >
          EduSentinel AI builds cybersecurity, AI, cloud, and education
          products on one principle: your data belongs to you.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.65 }}
        >
          <Button href="/contact" size="lg">
            Get Started <ArrowIcon />
          </Button>
          <Button href="/solutions" variant="ghost" size="lg">
            Explore Solutions
          </Button>
        </motion.div>

        <motion.div
          className="relative mt-20 w-full max-w-4xl"
          style={reduce ? undefined : { y: panelY }}
          initial={reduce ? false : { opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.8 }}
        >
          <PreviewPanel />
          {/* reflection fade */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -bottom-24 h-24 bg-gradient-to-b from-surface-base/0 to-surface-base"
          />
        </motion.div>
      </div>
    </section>
  );
}
