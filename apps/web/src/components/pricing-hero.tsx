"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "./motion";
import { LogoMark } from "./logo";

/*
 * Pricing hero per the "Price .png" reference: centered accent eyebrow,
 * huge extrabold headline with a highlight bar under one word, gray
 * subtitle, decorative floating marks at the sides (official logo in
 * place of the reference's star doodles), and a visible-but-disabled
 * yearly billing toggle.
 */
export function PricingHero() {
  const reduce = useReducedMotion();

  const float = (delay: number) =>
    reduce
      ? {}
      : {
          animate: { y: [0, -12, 0], rotate: [-6, 4, -6] },
          transition: {
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut" as const,
            delay,
          },
        };

  const enter = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: EASE, delay },
  });

  return (
    <div className="relative text-center">
      {/* floating brand marks, reference-style side decorations */}
      <motion.div
        aria-hidden="true"
        className="absolute -top-2 left-2 hidden md:block lg:left-16"
        {...float(0)}
      >
        <LogoMark size={96} />
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="absolute right-2 top-10 hidden md:block lg:right-16"
        {...float(1.4)}
      >
        <LogoMark size={72} />
      </motion.div>

      <motion.p
        {...enter(0)}
        className="text-[17px] font-semibold text-brand-teal"
      >
        Simple Pricing
      </motion.p>

      <motion.h1
        {...enter(0.1)}
        className="mx-auto mt-5 max-w-3xl text-balance text-5xl font-extrabold tracking-[-0.03em] md:text-[4.25rem] md:leading-[1.05]"
      >
        One account.{" "}
        <span className="relative inline-block">
          Every product.
          <span
            aria-hidden="true"
            className="absolute inset-x-1 bottom-1 -z-10 h-4 rounded-md bg-brand-glow/40 md:h-5"
          />
        </span>
      </motion.h1>

      <motion.p
        {...enter(0.2)}
        className="mx-auto mt-6 max-w-xl text-lg text-text-secondary"
      >
        Start free — grow with the EduSentinel AI ecosystem as it launches.
      </motion.p>

      {/* yearly toggle: visible but disabled, per current billing status */}
      <motion.div
        {...enter(0.3)}
        className="mt-9 flex items-center justify-center gap-3"
      >
        <span className="text-[15px] font-medium text-text-muted">
          Yearly Billing{" "}
          <span className="ml-1 rounded-full bg-surface-overlay px-2.5 py-1 text-xs font-semibold text-text-secondary">
            Coming Soon
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={false}
          disabled
          aria-label="Yearly billing (coming soon)"
          className="flex h-7 w-12 cursor-not-allowed items-center rounded-full border-2 border-border-subtle bg-surface-overlay p-1 opacity-60"
        >
          <span className="h-4 w-4 rounded-full bg-surface-raised shadow" />
        </button>
      </motion.div>
    </div>
  );
}
