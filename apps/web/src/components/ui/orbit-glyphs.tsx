/*
 * Orbit glyphs for the sign-in constellation (Phase 10, Task 1).
 *
 * The reference implementation orbits framework logos pulled from
 * cdn.jsdelivr.net and cdn1.iconfinder.com. Neither can be used here, for two
 * separate reasons, both of which matter:
 *
 *   1. THE CSP WOULD BLOCK THEM. `img-src 'self' blob: data:`
 *      (src/middleware.ts) — the images would simply not render, and the fix
 *      would be to widen the policy on the one page where an attacker most wants
 *      it widened. Not happening.
 *
 *   2. A REMOTE IMAGE IS A TRACKER. A request to a third-party CDN reports the
 *      visitor's IP, user agent and the fact that they are on the EduSentinel
 *      sign-in page, to someone who is not EduSentinel, before they have agreed
 *      to anything. `npm run check:trackers` is the machine-enforced version of
 *      that promise and this would have broken it.
 *
 * So the constellation is drawn locally, and it says what the platform actually
 * is rather than what it is built with: the eight things EduSentinel does to a
 * request. They inherit `currentColor`, so they follow the theme.
 */

export const ORBIT_GLYPHS = {
  /** Protection — the mark's own idea. */
  shield: <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />,

  /** Encryption at rest. */
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </>
  ),

  /** Key management / release signing. */
  key: (
    <>
      <circle cx="8" cy="8" r="4" />
      <path d="M10.8 10.8L20 20m-3-3l2-2m-4 0l1.5-1.5" />
    </>
  ),

  /** Identity. */
  fingerprint: (
    <path d="M12 5a7 7 0 017 7v2m-3.5-2a3.5 3.5 0 00-7 0v3a5 5 0 01-1 3M12 12v3.5m0 3.5a9 9 0 01-1.5-5V12M5 12a7 7 0 013-5.7" />
  ),

  /** Artifact scanning in quarantine. */
  scan: (
    <>
      <path d="M4 8V6a2 2 0 012-2h2M20 8V6a2 2 0 00-2-2h-2M4 16v2a2 2 0 002 2h2m12-4v2a2 2 0 01-2 2h-2" />
      <path d="M4 12h16" />
    </>
  ),

  /** The hash-chained audit log. */
  audit: (
    <>
      <path d="M7 8h10M7 12h10M7 16h6" />
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    </>
  ),

  /** An ed25519 signature over the SHA-256. */
  signature: (
    <>
      <path d="M4 17c3 0 3-9 6-9s3 9 6 9 4-3 4-3" />
      <path d="M3 21h18" />
    </>
  ),

  /** The model. */
  core: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3M6.4 6.4l2.1 2.1m7 7l2.1 2.1m0-11.2l-2.1 2.1m-7 7l-2.1 2.1" />
    </>
  ),

  /** One account across the ecosystem. */
  network: (
    <>
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="5" cy="18" r="2.2" />
      <circle cx="19" cy="18" r="2.2" />
      <path d="M12 7.2v4.3m0 0l-5.3 4.8M12 11.5l5.3 4.8" />
    </>
  ),
} as const;

export type OrbitGlyphName = keyof typeof ORBIT_GLYPHS;

export function OrbitGlyph({
  name,
  size = 32,
}: {
  name: OrbitGlyphName;
  size?: number;
}) {
  return (
    <span
      // A softly-tinted tile so each glyph reads as an object in orbit rather
      // than a stray stroke. `bg-brand-cyan/10` is one of the accent slots dark
      // mode reinterprets (globals.css), so this picks up the region's colour.
      className="flex items-center justify-center rounded-card border border-border-subtle bg-brand-cyan/10 text-brand-cyan backdrop-blur-sm"
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ORBIT_GLYPHS[name]}
      </svg>
    </span>
  );
}
