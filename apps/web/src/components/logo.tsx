/*
 * Placeholder vector mark until the designer-traced SVG master lands
 * (Phase 0 open item). Geometry is original — a gradient hexagon + ES
 * monogram echoing assets/brand/logo-master.png.
 */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="es-grad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="var(--color-brand-glow)" />
          <stop offset="100%" stopColor="var(--color-brand-teal)" />
        </linearGradient>
      </defs>
      <path
        d="M24 3 42 13.5v21L24 45 6 34.5v-21L24 3Z"
        fill="url(#es-grad)"
        stroke="url(#es-grad)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text
        x="24"
        y="30.5"
        textAnchor="middle"
        fontFamily="var(--font-sans)"
        fontWeight="800"
        fontSize="17"
        fill="#ffffff"
      >
        ES
      </text>
    </svg>
  );
}

export function LogoWordmark() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-[19px] font-semibold tracking-tight text-text-primary">
        EduSentinel <span className="text-brand-teal">AI</span>
      </span>
    </span>
  );
}
