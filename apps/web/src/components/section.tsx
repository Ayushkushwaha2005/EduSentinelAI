import type { ReactNode } from "react";
import { Reveal } from "./motion";

/*
 * Reference section header: giant left-aligned title with a right-aligned
 * two-line gray paragraph sitting on the same row (stacks on mobile).
 */
export function SplitHeading({
  title,
  aside,
}: {
  title: ReactNode;
  aside?: string;
}) {
  return (
    <Reveal>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <h2 className="max-w-3xl text-balance text-4xl font-medium leading-[1.06] tracking-[-0.03em] md:text-6xl">
          {title}
        </h2>
        {aside && (
          <p className="max-w-md text-[17px] leading-relaxed text-text-secondary md:text-right">
            {aside}
          </p>
        )}
      </div>
    </Reveal>
  );
}

export function CenterHeading({
  title,
  lead,
}: {
  title: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <Reveal className="flex flex-col items-center text-center">
      <h1 className="max-w-3xl text-balance text-5xl font-medium tracking-[-0.03em] md:text-7xl">
        {title}
      </h1>
      {lead && (
        <p className="mt-6 max-w-xl text-balance text-[17px] leading-relaxed text-text-secondary">
          {lead}
        </p>
      )}
    </Reveal>
  );
}
