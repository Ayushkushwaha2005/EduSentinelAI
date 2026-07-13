import { db } from "./db";
import { sanitizeLine, sanitizeUserText } from "./sanitize";
import { isProductIconKey } from "./product-icons";

/*
 * Product catalogue (Phase 5.5).
 *
 * The Founder manages products from the dashboard; the public site reads them
 * from here. Adding a new EduSentinel product is a database row, not a code
 * change — but only a PUBLISHED product is ever visible publicly, and only the
 * fields below are ever rendered.
 *
 * Every string that reaches a public page passes through sanitize on write and
 * is rendered as plain text. `icon` is validated against the fixed key set, and
 * `ctaHref` is restricted to an internal path or an https URL — a product record
 * must never be able to inject markup or a javascript: link into the site.
 */

export const PRODUCT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRICING_TONES = ["free", "paid", "soon"] as const;
export type PricingTone = (typeof PRICING_TONES)[number];

export function isProductStatus(v: unknown): v is ProductStatus {
  return typeof v === "string" && (PRODUCT_STATUSES as readonly string[]).includes(v);
}
export function isPricingTone(v: unknown): v is PricingTone {
  return typeof v === "string" && (PRICING_TONES as readonly string[]).includes(v);
}

/** A product as the public site consumes it. */
export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  pricing: PricingTone;
  tags: string[];
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  featured: boolean;
};

/** JSON list columns — tolerate anything, trust nothing. */
export function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").map((x) => sanitizeLine(x, 60))
      : [];
  } catch {
    return [];
  }
}

/** Comma/newline separated founder input -> a capped, sanitized JSON list. */
export function serializeList(input: unknown, max = 12): string {
  const items = String(input ?? "")
    .split(/[,\n]/)
    .map((s) => sanitizeLine(s, 60).trim())
    .filter(Boolean)
    .slice(0, max);
  return JSON.stringify(items);
}

/**
 * A CTA may only be an internal path or an https:// URL. This closes
 * javascript:, data: and protocol-relative links at the point of write.
 */
export function safeHref(input: unknown, fallback = "/contact"): string {
  const raw = sanitizeLine(input, 200).trim();
  if (!raw) return fallback;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol === "https:") return url.toString();
  } catch {
    /* not a URL */
  }
  return fallback;
}

export function sanitizeProductText(input: unknown, max = 600): string {
  return sanitizeUserText(input, max).trim();
}

type Row = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  icon: string;
  pricing: string;
  tags: string;
  features: string;
  ctaLabel: string;
  ctaHref: string;
  featured: boolean;
};

function toCatalog(p: Row): CatalogProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline ?? "",
    description: p.description,
    icon: isProductIconKey(p.icon) ? p.icon : "shield",
    pricing: isPricingTone(p.pricing) ? p.pricing : "free",
    tags: parseList(p.tags),
    features: parseList(p.features),
    ctaLabel: p.ctaLabel,
    ctaHref: safeHref(p.ctaHref),
    featured: p.featured,
  };
}

const PUBLIC_FIELDS = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  description: true,
  icon: true,
  pricing: true,
  tags: true,
  features: true,
  ctaLabel: true,
  ctaHref: true,
  featured: true,
} as const;

/** Everything the public site shows. PUBLISHED only — drafts and archives never leak. */
export async function publicProducts(): Promise<CatalogProduct[]> {
  const rows = await db.product.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: PUBLIC_FIELDS,
  });
  return rows.map(toCatalog);
}

/** A single public product page. Returns null for draft/archived/missing. */
export async function publicProduct(slug: string): Promise<CatalogProduct | null> {
  const row = await db.product.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: PUBLIC_FIELDS,
  });
  return row ? toCatalog(row) : null;
}

/** Published slugs, for generateStaticParams / sitemap. */
export function publicProductSlugs() {
  return db.product.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
}
