"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/components/motion";

/*
 * The page-enter transition, shared by every section's `template.tsx`.
 *
 * IT LIVES BELOW THE LAYOUTS ON PURPOSE. A `template.tsx` re-mounts its whole
 * subtree on every navigation — that is what makes the enter animation replay.
 * When the transition sat at the ROOT (app/template.tsx) it wrapped the layouts
 * too, so every click re-mounted the entire shell: the marketing nav/footer, and
 * far worse, the dashboard's sidebar, top bar and the MeteorField canvas — which
 * tore down and re-seeded ~950 stars and its meteor system on every navigation.
 *
 * Scoped per section and placed under each layout, the animation is identical but
 * only the PAGE CONTENT re-mounts; the shell and its canvas persist. Same motion,
 * a fraction of the work.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
