"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, Stagger, Item } from "./motion";
import type { ReactNode } from "react";

/*
 * Pricing cards per the "Price .png" reference: white cards with bold ink
 * borders and hard offset shadows, circular line-icon chip, plan name +
 * one-line description, oversized extrabold price, circled-check feature
 * list, full-width bordered button. Popular card hangs a rotated badge off
 * its top edge and gets the accent button.
 */

type Plan = {
  name: string;
  description: string;
  price: string;
  priceNote: string;
  intro: string;
  features: string[];
  cta: string;
  href: string;
  popular: boolean;
  icon: ReactNode;
};

const plans: Plan[] = [
  {
    name: "Free",
    description: "For everyone getting started",
    price: "$0",
    priceNote: "/month",
    intro: "Includes:",
    features: [
      "Free products",
      "Community support",
      "Verified downloads",
      "Learning resources",
    ],
    cta: "Get Started",
    href: "/signup",
    popular: false,
    icon: <path d="M12 8V21m0-13a3.5 3.5 0 10-3.5-3.5C8.5 6 12 8 12 8zm0 0a3.5 3.5 0 113.5-3.5C15.5 6 12 8 12 8zM4 8h16v4H4V8zm1 4h14v9H5v-9z" />,
  },
  {
    name: "Pro",
    description: "For individual power users",
    price: "$1",
    priceNote: "/user/month",
    intro: "Everything in Free, plus:",
    features: [
      "Premium products",
      "Early access",
      "Priority updates",
      "Email support",
      "Faster downloads",
    ],
    cta: "Upgrade to Pro",
    href: "/contact",
    popular: false,
    icon: <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2z" />,
  },
  {
    name: "Collaboration",
    description: "For developers, startups, researchers and contributors",
    price: "Free",
    priceNote: "to join",
    intro: "Includes:",
    features: [
      "Publish products on EduSentinel AI",
      "Collaboration profile",
      "Verified creator badge",
      "Product analytics",
      "Team workspace",
      "Featured product listing",
      "Collaboration dashboard",
      "Revenue sharing support",
    ],
    cta: "Become a Partner",
    href: "/contact",
    popular: true,
    icon: <path d="M16 11a3 3 0 100-6 3 3 0 000 6zm-8 0a3 3 0 100-6 3 3 0 000 6zm0 2c-2.7 0-5 1.3-5 3v3h10v-3c0-1.7-2.3-3-5-3zm8 0c-.4 0-.8 0-1.2.1 1.3.9 2.2 2 2.2 2.9v3h4v-3c0-1.7-2.3-3-5-3z" />,
  },
  {
    name: "Enterprise",
    description: "For colleges and organizations",
    price: "Custom",
    priceNote: "pricing",
    intro: "Includes:",
    features: [
      "College deployment",
      "Organization deployment",
      "Dedicated support",
      "Security consultation",
      "Custom integration",
      "SLA support",
    ],
    cta: "Contact Sales",
    href: "/contact",
    popular: false,
    icon: <path d="M4 21V5a1 1 0 011-1h8a1 1 0 011 1v16M4 21h10M4 21H2m12 0h2m0 0h4a1 1 0 001-1v-9a1 1 0 00-1-1h-4m0 11V10M7 8h2m-2 4h2m-2 4h2m4-8h1m-1 4h1" />,
  },
];

function CircleCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-ink">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 10.5l2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="relative h-full"
    >
      {plan.popular && (
        <span className="absolute -top-4 right-5 z-10 rotate-6 rounded-full border-2 border-ink bg-brand-glow px-4 py-1.5 text-sm font-bold text-ink shadow-[3px_3px_0_0_var(--color-ink)]">
          Popular!
        </span>
      )}
      <div
        className={`flex h-full flex-col rounded-2xl border-2 border-ink bg-surface-raised p-7 shadow-[8px_8px_0_0_var(--color-ink)] md:p-8 ${
          plan.popular ? "xl:-translate-y-2" : ""
        }`}
      >
        {/* icon chip */}
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border-subtle text-brand-teal">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {plan.icon}
          </svg>
        </span>

        <h2 className="mt-6 text-[26px] font-semibold tracking-tight">
          {plan.name}
        </h2>
        <p className="mt-1 text-[15px] leading-snug text-text-secondary">
          {plan.description}
        </p>

        <div className="mt-6 flex items-baseline gap-1.5">
          <span className="text-[44px] font-extrabold leading-none tracking-[-0.02em]">
            {plan.price}
          </span>
          <span className="text-[15px] text-text-secondary">{plan.priceNote}</span>
        </div>

        <p className="mt-7 text-[15px] font-semibold">{plan.intro}</p>
        <ul className="mt-4 flex-1 space-y-3.5">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-3 text-[15px] leading-snug text-text-primary">
              <CircleCheck /> {f}
            </li>
          ))}
        </ul>

        <Link
          href={plan.href}
          className={`mt-9 flex h-12 items-center justify-center rounded-xl border-2 border-ink text-[15px] font-bold transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
            plan.popular
              ? "bg-brand-glow text-ink shadow-[4px_4px_0_0_var(--color-ink)] hover:bg-brand-glow/85"
              : "bg-surface-raised text-ink shadow-[4px_4px_0_0_var(--color-ink)] hover:bg-surface-overlay"
          }`}
        >
          {plan.cta}
        </Link>
      </div>
    </motion.div>
  );
}

export function PricingCards() {
  return (
    <Stagger className="grid gap-8 pt-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-6">
      {plans.map((p) => (
        <Item key={p.name} className="h-full">
          <PlanCard plan={p} />
        </Item>
      ))}
    </Stagger>
  );
}
