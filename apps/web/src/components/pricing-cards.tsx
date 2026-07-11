"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { EASE, Stagger, Item } from "./motion";

const plans = [
  {
    name: "Free",
    monthly: 0,
    unit: "per month",
    intro: "Includes:",
    features: [
      "Access to free tools and learning content",
      "Community support",
      "Signed downloads with checksums",
      "Privacy-first by default",
    ],
    cta: "Get notified",
    popular: false,
  },
  {
    name: "Pro",
    monthly: 9,
    unit: "per user / month",
    intro: "Everything in Free, and:",
    features: [
      "Full access to released products",
      "Priority updates",
      "Early access to new tools",
      "Email support",
    ],
    cta: "Get notified",
    popular: false,
  },
  {
    name: "Team",
    monthly: 19,
    unit: "per user / month",
    intro: "Everything in Pro, and:",
    features: [
      "Shared team workspace",
      "Consolidated billing & admin controls",
      "Usage insights",
      "Priority support",
    ],
    cta: "Get notified",
    popular: true,
  },
  {
    name: "Enterprise",
    monthly: null,
    unit: "custom",
    intro: "Everything in Team, and:",
    features: [
      "Custom deployment options",
      "Security review & documentation",
      "Dedicated support",
      "Partnership agreements",
    ],
    cta: "Contact sales",
    popular: false,
  },
];

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-1 shrink-0 text-text-primary">
      <path d="M2.5 8.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PricingCards() {
  const [annual, setAnnual] = useState(false);
  const reduce = useReducedMotion();

  return (
    <div>
      {/* annual toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-[15px] text-text-secondary">
          Pay annually <span className="text-text-muted">(save 20%)</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          onClick={() => setAnnual(!annual)}
          className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
            annual ? "bg-ink" : "bg-border-subtle"
          }`}
        >
          <motion.span
            layout
            className="h-5 w-5 rounded-full bg-surface-raised shadow"
            style={{ marginLeft: annual ? "auto" : 0 }}
            transition={{ duration: 0.25, ease: EASE }}
          />
        </button>
      </div>

      <Stagger className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const price =
            p.monthly === null
              ? null
              : annual
                ? Math.round(p.monthly * 0.8)
                : p.monthly;
          return (
            <Item key={p.name} className="h-full">
              <div className="flex h-full flex-col rounded-card border border-border-subtle bg-surface-raised p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-medium">{p.name}</h2>
                  {p.popular && (
                    <span className="rounded-control bg-ink px-2.5 py-1 text-xs font-medium text-surface-raised">
                      Popular
                    </span>
                  )}
                </div>
                <div className="mt-6 flex items-baseline gap-2">
                  {price === null ? (
                    <span className="text-4xl font-medium tracking-tight">Custom</span>
                  ) : (
                    <motion.span
                      key={`${p.name}-${annual}`}
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="text-4xl font-medium tracking-tight"
                    >
                      ${price}
                    </motion.span>
                  )}
                  <span className="text-sm text-text-secondary">{p.unit}</span>
                </div>
                <p className="mt-6 text-[15px] font-medium">{p.intro}</p>
                <ul className="mt-4 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[15px] text-text-secondary">
                      <Check /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className="mt-10 flex h-11 items-center justify-center rounded-control bg-surface-overlay text-sm font-medium text-text-primary transition-colors hover:bg-border-subtle"
                >
                  {p.cta}
                </Link>
              </div>
            </Item>
          );
        })}
      </Stagger>
    </div>
  );
}
