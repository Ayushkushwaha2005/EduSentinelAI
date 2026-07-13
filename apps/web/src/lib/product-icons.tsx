/*
 * Fixed product icon set.
 *
 * The Founder picks an icon by KEY from this list — the dashboard never accepts
 * raw SVG or HTML for a product. That is deliberate: a product record is
 * rendered on the public marketing site, so anything free-form here would be a
 * markup-injection path onto pages we serve to everyone. Adding a new icon is a
 * PR to this file; adding a new *product* needs no code at all.
 */
export const PRODUCT_ICONS = {
  shield: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z",
  phone: "M8 2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2zm2 17h4",
  heart:
    "M12 21C7 16.5 3 13 3 8.8 3 6 5.2 4 7.8 4c1.6 0 3.2.8 4.2 2.2C13 4.8 14.6 4 16.2 4 18.8 4 21 6 21 8.8c0 4.2-4 7.7-9 12.2z",
  leaf: "M12 3C7 3 4 7 4 11c0 5 4 8 8 10 4-2 8-5 8-10 0-4-3-8-8-8zm0 5v8m-3-5c2 1 4 1 6 0",
  spark:
    "M12 3v3m0 12v3M3 12h3m12 0h3M6.5 6.5l2 2m7 7l2 2m0-11l-2 2m-7 7l-2 2M12 9a3 3 0 110 6 3 3 0 010-6z",
  browser: "M3 5h18v14H3V5zm0 4h18M6.5 7h.01M9 7h.01",
  lock: "M6 11h12v9H6v-9zm3 0V8a3 3 0 016 0v3",
  brain:
    "M9 4a3 3 0 00-3 3 3 3 0 00-1 5.8V17a3 3 0 003 3h1V4H9zm6 0a3 3 0 013 3 3 3 0 011 5.8V17a3 3 0 01-3 3h-1V4h0z",
  cloud: "M7 18a4 4 0 010-8 5 5 0 019.6-1.4A3.5 3.5 0 1117.5 18H7z",
  chart: "M4 20V10m5 10V4m5 16v-7m5 7V8",
} as const;

export type ProductIconKey = keyof typeof PRODUCT_ICONS;

export const PRODUCT_ICON_KEYS = Object.keys(PRODUCT_ICONS) as ProductIconKey[];

export function isProductIconKey(value: unknown): value is ProductIconKey {
  return typeof value === "string" && value in PRODUCT_ICONS;
}

/** Renders a product icon by key. An unknown key falls back to the shield. */
export function ProductIcon({
  icon,
  size = 24,
  className,
}: {
  icon: string;
  size?: number;
  className?: string;
}) {
  const d = isProductIconKey(icon) ? PRODUCT_ICONS[icon] : PRODUCT_ICONS.shield;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
