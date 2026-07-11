"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const MotionLink = motion.create(Link);

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan";

const variants = {
  primary:
    "bg-gradient-to-r from-brand-cyan to-brand-teal text-surface-base shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_8px_30px_-8px_rgba(20,184,166,0.5)] hover:shadow-[0_0_0_1px_rgba(34,211,238,0.4),0_12px_40px_-8px_rgba(20,184,166,0.65)]",
  ghost:
    "border border-border-subtle text-text-primary bg-surface-raised/50 hover:border-brand-teal/60",
};

const sizes = {
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base",
};

export function Button({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <MotionLink
      href={href}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      whileHover={reduce ? undefined : { scale: 1.03 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </MotionLink>
  );
}

export function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8h10m0 0L9 4m4 4l-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
