"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE } from "./motion";
import { Button, ArrowIcon } from "./button";

/*
 * Hero showcase: each tab is a complete product story — real product
 * image, heading, description, and supporting points all switch together.
 * Images live in public/showcase/, sourced from the official
 * "EduSentinel AI pics" asset folder.
 */
const showcases = [
  {
    tab: "Security Tooling",
    image: "/showcase/security-tooling.png",
    heading: "Privacy-first security that protects every click.",
    description:
      "EduSentinel continuously helps users identify suspicious websites, spoofed domains and digital threats before they become real risks. Intelligent protection is delivered without compromising personal privacy.",
    points: [
      "Explainable threat detection",
      "Trusted website verification",
      "Smart redirect protection",
      "Privacy-aware browsing",
      "Real-time risk insights",
    ],
    note: null,
  },
  {
    tab: "AI Products",
    image: "/showcase/ai-products.png",
    heading: "AI built around people, not their data.",
    description:
      "Discover a growing collection of privacy-first AI experiences including intelligent assistants, productivity tools and the upcoming Sentinel Agent — designed to help users work smarter while keeping sensitive information under their control.",
    points: [
      "Sentinel Agent",
      "AI productivity",
      "Secure automation",
      "Local-first intelligence",
      "Explainable decisions",
    ],
    note: "Sentinel Agent — an upcoming privacy-first personal AI companion designed to assist users with productivity, knowledge management, secure workflows and everyday digital tasks while ensuring that personal data remains under the user's control.",
  },
  {
    tab: "Cloud Utilities",
    image: "/showcase/cloud-utilities.png",
    heading: "Modern cloud utilities with security at the core.",
    description:
      "Manage files, deployments, collaboration and digital infrastructure through secure cloud experiences designed for students, professionals and organizations that value trust and reliability.",
    points: [
      "Secure workspace",
      "Cloud deployment",
      "Smart collaboration",
      "Protected storage",
      "Infrastructure management",
    ],
    note: null,
  },
  {
    tab: "Learning Hub",
    image: "/showcase/learning-hub.png",
    heading: "Learn emerging technology through practical experience.",
    description:
      "A dedicated learning ecosystem that helps students and professionals master Cyber Security, Artificial Intelligence, Cloud Computing and modern development through structured learning paths and hands-on projects.",
    points: [
      "Cyber Security",
      "Artificial Intelligence",
      "Cloud Computing",
      "Hands-on learning",
      "Career preparation",
    ],
    note: null,
  },
  {
    tab: "Research",
    image: "/showcase/research.png",
    heading: "Research that turns ideas into real-world innovation.",
    description:
      "EduSentinel Research explores intelligent privacy technologies, explainable AI, secure digital systems and next-generation solutions that help build a safer digital future for everyone.",
    points: [
      "Privacy Engineering",
      "AI Research",
      "Security Innovation",
      "Human-centered technology",
      "Future-ready solutions",
    ],
    note: null,
  },
];

const areas = [
  "Cybersecurity",
  "AI & Machine Learning",
  "Cloud Computing",
  "Developer Tools",
  "Education",
  "Research",
];

function ShowcasePanel({ index }: { index: number }) {
  const reduce = useReducedMotion();
  const s = showcases[index];
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-3 shadow-[0_24px_60px_-24px_rgba(18,19,23,0.18)]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={s.tab}
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <div className="relative aspect-video overflow-hidden rounded-lg border border-border-subtle/70 bg-ink">
            <Image
              src={s.image}
              alt={`${s.tab} — EduSentinel AI product preview`}
              fill
              sizes="(max-width: 768px) 100vw, 55vw"
              className="object-cover object-top"
              priority={index === 0}
            />
          </div>
          <div className="px-4 pb-4 pt-5 md:px-5">
            <h2 className="text-lg font-semibold tracking-tight md:text-xl">
              {s.heading}
            </h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-text-secondary">
              {s.description}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {s.points.map((p) => (
                <li
                  key={p}
                  className="rounded-full border border-border-subtle bg-surface-base px-3 py-1.5 text-[13px] font-medium text-text-secondary"
                >
                  {p}
                </li>
              ))}
            </ul>
            {s.note && (
              <p className="mt-4 border-t border-border-subtle pt-4 text-[13px] leading-relaxed text-text-muted">
                {s.note}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
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
    <section className="overflow-hidden pt-20">
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

          {/* right column — showcase panel bleeds off the right edge on desktop */}
          <motion.div {...enter(0.35)} className="relative md:-mr-16 lg:-mr-28">
            <ShowcasePanel index={tab} />
          </motion.div>
        </div>

        {/* tab strip under the panel — drives the whole showcase */}
        <motion.div
          {...enter(0.55)}
          className="mt-12 flex justify-start gap-8 overflow-x-auto pb-1 md:justify-end"
        >
          {showcases.map((s, i) => (
            <button
              key={s.tab}
              type="button"
              onClick={() => setTab(i)}
              aria-pressed={tab === i}
              className={`relative shrink-0 pb-2 text-[15px] transition-colors ${
                tab === i ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {s.tab}
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
