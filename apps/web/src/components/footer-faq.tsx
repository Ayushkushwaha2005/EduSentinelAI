"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE } from "./motion";

/*
 * Footer FAQ (Phase 9.5 polish).
 *
 * A product-focused accordion that lives INSIDE the footer as one more column —
 * no page, no modal, no redirect. Copy is written for a first-time visitor: what
 * EduSentinel is, why it is different, and how the privacy-first promise actually
 * holds. Typography and spacing mirror the surrounding footer so it reads as part
 * of the same surface, not a bolted-on widget.
 */
const FAQ: { q: string; a: string }[] = [
  {
    q: "What is EduSentinel AI?",
    a: "A cybersecurity platform with AI at its centre. It began by answering one question — is this link, this sender, this download safe? — and the engine built to answer it now powers everything else we ship. Security is not a feature of the platform; it is the platform.",
  },
  {
    q: "Why does a security company build other products?",
    a: "Because the engine was already there. Once you can tell a real message from a crafted one, the same judgement helps with a wedding vendor's quote or a study plan. Every product is a new surface on the same core, not a new company — which is why one account and one privacy promise cover all of them.",
  },
  {
    q: "How is it different from other AI platforms?",
    a: "Most platforms treat privacy as a setting. We treat it as an architecture. Every release is signed, no third-party trackers touch our properties, and your data is never the product. Capability and privacy aren't a trade-off here — that is the whole point.",
  },
  {
    q: "What's inside the ecosystem?",
    a: "A growing catalogue organised by problem space rather than form factor — cybersecurity first, then AI productivity, education, developer tooling and more. Each category states what belongs in it, so the next product has a shelf waiting before it is built.",
  },
  {
    q: "Is it really privacy-first?",
    a: "Structurally, yes. There are no analytics SDKs, no tracking pixels in our emails, and no hidden data flows. What we cannot measure privately, we simply do not measure — we would rather ship less than surveil you.",
  },
  {
    q: "Is my data used to train AI models?",
    a: "No. Your content stays yours. We do not mine it to train models, and we do not sell or share it. Any AI that touches your data does so transparently — if we cannot explain what a model does with it in a paragraph, we do not ship it.",
  },
  {
    q: "Can students, developers and teams all use one account?",
    a: "Yes — the same sign-in works whether you are learning, building or securing an organization, and moving between products never asks you to register again or leaves a trail behind you.",
  },
  {
    q: "Which platforms are supported?",
    a: "Two surfaces are being built: a Chrome browser extension, and an Android app using on-device TensorFlow Lite models. Neither has been released yet — when they are, each download will be signed and published with its checksum. Anything else you read about here is a category, not a client you can install.",
  },
  {
    q: "What's coming next?",
    a: "The browser extension and the mobile app, then SentinelAI Agent — the local-first assistant listed in the catalogue as in development. We have not published dates, because we have not earned the right to promise them yet.",
  },
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <li className="border-b border-border-subtle/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-[15px] text-text-primary/85 transition-colors hover:text-text-primary"
      >
        <span>{q}</span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 45 : 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.25, ease: EASE }}
          className="shrink-0 text-text-muted"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 1, height: "auto" } : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 1, height: "auto" } : { height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="pb-4 pr-6 text-sm leading-relaxed text-text-muted">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function FooterFaq() {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
        Frequently asked
      </h3>
      <ul className="mt-4 grid gap-x-14 md:grid-cols-2">
        {FAQ.map((item) => (
          <Item key={item.q} {...item} />
        ))}
      </ul>
    </div>
  );
}
