/*
 * Product facets — the four things a visitor needs in order to understand a
 * card in five seconds: where it runs, who it is for, what stage it is at, and
 * what it actually does for them.
 *
 * DERIVED, NOT STORED — for the same reason lib/product-domains.ts is derived.
 * A product is a database row the Founder owns and can add without a deploy
 * (lib/catalog.ts). The moment "platform" becomes a column, adding a product
 * needs a migration, a dropdown and a developer, and the one property that
 * makes this catalogue scale is gone. So the facets are read out of the record
 * the Founder was already writing accurately: its tags, name, tagline and
 * description. Wrong facet? Fix a tag from the dashboard. No code, no release.
 *
 * WORD MATCHING IS EXACT HERE, unlike the domain classifier's prefixes. A facet
 * is a specific claim ("this runs on Android"), and a prefix match makes
 * specific claims out of coincidences — "local" would fire on "localized",
 * "web" on "website". Every signal below is matched as a whole word.
 *
 * Nothing here touches the database, so this module is safe to import anywhere,
 * including a client component.
 */

import type { PricingTone } from "./catalog";

/** The subset of a catalogue product the facet readers look at. Nothing else. */
export type FacetedProduct = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  tags: string[];
  features: string[];
  pricing: PricingTone;
  /**
   * The label on the product's own button. Read ONLY by `stageOf` — see the
   * comment there for why a waitlist CTA is the honest signal that a product
   * has not shipped.
   */
  ctaLabel?: string;
};

/* ------------------------------------------------------------------ *
 * Matching
 * ------------------------------------------------------------------ */

const cache = new Map<string, RegExp>();

/** Whole-word, case-insensitive. Hyphens in a signal are matched literally. */
function word(signal: string): RegExp {
  let re = cache.get(signal);
  if (!re) {
    const escaped = signal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i");
    cache.set(signal, re);
  }
  return re;
}

function haystack(p: FacetedProduct): string {
  return [
    p.tags.join(" "),
    p.name,
    p.slug.replace(/-/g, " "),
    p.tagline,
    p.description,
  ]
    .filter(Boolean)
    .join(" \n ");
}

function matches(text: string, signals: readonly string[]): boolean {
  return signals.some((s) => word(s).test(text));
}

/* ------------------------------------------------------------------ *
 * Platform — where the product actually runs
 * ------------------------------------------------------------------ */

type Facet = { label: string; signals: readonly string[] };

const PLATFORMS: readonly Facet[] = [
  {
    label: "Browser",
    signals: [
      "browser",
      "extension",
      "extensions",
      "chrome",
      "chromium",
      "firefox",
      "add-on",
      "addon",
    ],
  },
  {
    label: "Mobile",
    signals: [
      "mobile",
      "android",
      "ios",
      "kotlin",
      "swift",
      "smartphone",
      "phone",
      "sms",
      "tablet",
    ],
  },
  {
    label: "Desktop",
    // NOT "local-first" or "on-device": those describe where the COMPUTATION
    // happens, not which client you install. A local-first assistant may well
    // ship on a phone. Claiming Desktop from them put a surface on a card that
    // the product had never claimed.
    signals: ["desktop", "windows", "macos", "linux", "electron"],
  },
  {
    label: "Web",
    signals: [
      "web",
      "website",
      "webapp",
      "platform",
      "dashboard",
      "portal",
      "online",
      "saas",
    ],
  },
  {
    label: "API",
    signals: ["api", "apis", "sdk", "cli", "webhook", "webhooks", "self-hosted"],
  },
];

/**
 * Where a product runs, most-specific first, capped at three so a card never
 * turns into a compatibility matrix.
 *
 * The fallback is "Cross-platform", not a guess at a specific client. A product
 * that has not claimed a surface has not claimed a surface; saying "Web"
 * because we had nothing better would be inventing a fact on a public page.
 */
export function platformsOf(p: FacetedProduct): string[] {
  const text = haystack(p);
  const found = PLATFORMS.filter((f) => matches(text, f.signals)).map((f) => f.label);
  return found.length > 0 ? found.slice(0, 3) : ["Cross-platform"];
}

/* ------------------------------------------------------------------ *
 * Audience — who it was built for
 * ------------------------------------------------------------------ */

const AUDIENCES: readonly Facet[] = [
  {
    label: "Students & educators",
    signals: [
      "student",
      "students",
      "school",
      "schools",
      "college",
      "university",
      "campus",
      "teacher",
      "teachers",
      "learner",
      "learners",
      "exam",
      "exams",
      "education",
      "educational",
      "curriculum",
    ],
  },
  {
    label: "Developers",
    signals: [
      "developer",
      "developers",
      "engineer",
      "engineers",
      "api",
      "sdk",
      "cli",
      "self-hosted",
      "open-source",
    ],
  },
  {
    label: "Teams & organisations",
    signals: [
      "team",
      "teams",
      "business",
      "businesses",
      "enterprise",
      // Plural only. Singular "organization" is far more often the ACTIVITY
      // ("event organization") than the institution, and it was putting
      // "Teams & organisations" on a wedding planner.
      "organisations",
      "organizations",
      "company",
      "workplace",
      "staff",
      "employees",
    ],
  },
  {
    label: "Couples & families",
    signals: [
      "wedding",
      "weddings",
      "shaadi",
      "marriage",
      "family",
      "families",
      "parent",
      "parents",
      "guests",
      "couple",
      "couples",
    ],
  },
];

/**
 * Who a product is for. Capped at two — a card claiming four audiences is
 * claiming none.
 *
 * "Everyone online" is a real answer, not a placeholder: a scam filter for
 * anyone with a phone is genuinely for everyone, and narrowing it to sound
 * specific would be worse than saying so.
 */
export function audienceOf(p: FacetedProduct): string[] {
  const text = haystack(p);
  const found = AUDIENCES.filter((f) => matches(text, f.signals)).map((f) => f.label);
  return found.length > 0 ? found.slice(0, 2) : ["Everyone online"];
}

/* ------------------------------------------------------------------ *
 * Status — the stage, kept separate from the price
 * ------------------------------------------------------------------ */

export type ProductStage = {
  label: string;
  /** Long form, for the product page and the card's title attribute. */
  detail: string;
  tone: "live" | "preview";
};

/*
 * Waitlist wording. A product whose own button says "Get notified" is a product
 * you cannot install, whatever its price says.
 */
const WAITLIST_CTA = [
  "notified",
  "notify",
  "waitlist",
  "wait-list",
  "early access",
  "coming soon",
  "join",
  "register interest",
];

/**
 * Stage and price are two different questions, and the old badge answered them
 * with one word. "Coming soon" is not a price, and "Free" says nothing about
 * whether you can install it today. They are split so a card can answer both.
 *
 * WHY THE CTA IS READ HERE. `pricing` alone cannot answer "can I install this?"
 * — it has three values and two of them are prices. Reading only `pricing`
 * marked every free product "Available · Shipping now" while its own button
 * offered a waitlist and the Download Center held nothing: the page claimed
 * installability the catalogue had never claimed. The Founder already writes
 * the honest answer into the CTA label, so that is what is read. A product is
 * reported as shipping only when nothing about its record says otherwise.
 */
export function stageOf(p: FacetedProduct): ProductStage {
  const waitlisted =
    p.pricing === "soon" ||
    WAITLIST_CTA.some((s) => (p.ctaLabel ?? "").toLowerCase().includes(s));

  return waitlisted
    ? {
        label: "In development",
        detail: "Not released yet — ask to be told when it ships.",
        tone: "preview",
      }
    : {
        label: "Available",
        detail: "Released, on the account you already have.",
        tone: "live",
      };
}

/** The price, as its own fact. `null` when the product has not shipped yet. */
export function priceOf(p: FacetedProduct): string | null {
  if (p.pricing === "soon") return null;
  return p.pricing === "paid" ? "Paid" : "Free";
}

/* ------------------------------------------------------------------ *
 * Benefits
 * ------------------------------------------------------------------ */

/**
 * The primary benefits — the first few features, plus an honest count of what
 * was left off. Seven bullets on a card is a specification; three is a reason
 * to click. The remainder is not hidden, it is summarised and linked.
 */
export function benefitsOf(p: FacetedProduct, limit = 3): {
  shown: string[];
  more: number;
} {
  const shown = p.features.slice(0, limit);
  return { shown, more: Math.max(0, p.features.length - shown.length) };
}
