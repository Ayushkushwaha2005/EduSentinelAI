"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const MotionLink = motion.create(Link);

const base =
  "inline-flex items-center justify-center gap-2 rounded-control font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/* Reference button set: solid black, quiet gray, and plain text link. */
const variants = {
  primary: "bg-ink text-surface-raised hover:bg-ink-hover transition-colors",
  secondary:
    "bg-surface-overlay text-text-primary hover:bg-border-subtle transition-colors",
  text: "text-text-primary hover:text-text-secondary transition-colors !px-0",
};

const sizes = {
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
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
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
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
