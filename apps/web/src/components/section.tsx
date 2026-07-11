import type { ReactNode } from "react";
import { Reveal } from "./motion";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-raised/60 px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-text-secondary">
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand-cyan to-brand-teal"
      />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  center = true,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  center?: boolean;
}) {
  return (
    <Reveal className={center ? "flex flex-col items-center text-center" : ""}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-6 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
        {title}
      </h2>
      {lead && (
        <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-text-secondary">
          {lead}
        </p>
      )}
    </Reveal>
  );
}
