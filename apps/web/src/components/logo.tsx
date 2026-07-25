import Image from "next/image";

/*
 * Official EduSentinel AI logo.
 *
 * ASSET NOTE (Phase 10, Task 8). The mark used to be served from public/logo.svg
 * — a bitmap auto-traced into 886 paths, 578 KB — with `unoptimized priority`,
 * behind every nav bar, sidebar, mobile drawer and auth screen on the site. A
 * 36px logo was the heaviest thing on most pages.
 *
 * It now comes from public/logo-mark.png (256px master, 19 KB) THROUGH the Next
 * image optimizer, which re-encodes it to AVIF/WebP at exactly the width each
 * surface asks for — a couple of KB, immutably cached. Same artwork: the tile is
 * the same master the SVG was traced from, only resampled rather than redrawn.
 * logo.svg survives as the large-format/print master and is no longer requested
 * by the browser.
 *
 * Per brand policy this is the only mark used anywhere on the site.
 */
export function LogoMark({
  size = 36,
  priority = false,
  className = "",
}: {
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/logo-mark.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      // `sizes` keeps the optimizer from generating a full ladder of widths for
      // a mark that is only ever drawn at one size on a given surface.
      sizes={`${size}px`}
      priority={priority}
      className={className}
    />
  );
}

export function LogoWordmark({
  /** Nav and sidebar render this above the fold — those two ask for priority. */
  priority = false,
  /**
   * The standing idle from Task 2 (a slow bloom + an occasional light sweep,
   * pure CSS — see `.logo-idle` in globals.css). On by default, because the nav
   * mark is exactly where the brief wanted it; off for surfaces that carry their
   * own animation, so two effects never run on one mark.
   */
  idle = true,
}: {
  priority?: boolean;
  idle?: boolean;
}) {
  return (
    <span className="flex items-center gap-1">
      {/* nudge down 2px so the mark and text share one visual centerline */}
      <span className={`translate-y-[2px] ${idle ? "logo-idle relative inline-flex" : ""}`}>
        <LogoMark priority={priority} />
      </span>
      <span className="font-display text-[28px] font-extrabold tracking-[-0.02em] text-text-primary">
        EduSentinel <span className="text-brand-teal">AI</span>
      </span>
    </span>
  );
}
