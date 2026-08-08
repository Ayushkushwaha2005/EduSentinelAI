/*
 * Ecosystem domains — the product taxonomy the /products page navigates by.
 *
 * WHY THIS IS DERIVED AND NOT A COLUMN
 * ------------------------------------
 * A product is a database row the Founder owns (lib/catalog.ts). Adding one
 * needs no deploy, and that property is worth more than a tidy schema — so a
 * new product must not need a schema migration, a dropdown of categories, or a
 * developer, just to appear in the right place on the public site.
 *
 * So a product's domain is RESOLVED from the record the Founder already
 * writes: its tags, name, tagline and slug. The Founder categorises a product
 * by describing it accurately, which they were doing anyway. If a product ever
 * lands in the wrong domain, the fix is a tag — from the dashboard, with no
 * code change and no release.
 *
 * WHY THESE DOMAINS
 * -----------------
 * They are PROBLEM SPACES, not form factors. "Browser extension", "mobile app"
 * and "desktop agent" describe where a product runs; that axis changes every
 * time the industry invents a surface, and it splits one product across two
 * shelves the moment it ships a second client. A problem space ("this protects
 * you from fraud") survives the surface it happens to be delivered on, which is
 * what makes the shelf still correct in five years and at a hundred products.
 *
 * Each domain carries a `scope` — one sentence saying what belongs there,
 * written so that a product nobody has built yet can be placed without a
 * meeting. That sentence is the taxonomy's promise that it scales: the
 * catalogue can go from five products to five hundred and the shelves still
 * answer "where do I find it", because they were never a list of what we happen
 * to ship today.
 *
 * The registry is ordered. A domain with no products gets no SHELF — the page
 * never renders an empty grid or a count of zero — but it is still published in
 * the architecture map on /products, marked open. That is the honest version of
 * "we can grow": the room exists and is named, and nothing is pretending to be
 * a product. Adding a domain is a small PR to this file; adding a PRODUCT to an
 * existing domain is, as ever, a row.
 *
 * NOT A DOMAIN: status. "Coming soon" is a stage a product passes through, not
 * a place it lives — shelving by it would move a product the day it launched
 * and break every link to it. Status is a facet on the card (lib/product-
 * facets.ts) and a filter across the whole catalogue.
 *
 * Nothing here touches the database, so this module is safe to import from
 * anywhere, including a client component.
 */

export const DOMAIN_IDS = [
  "security",
  "intelligence",
  "learning",
  "platform",
  "life",
  "sustainability",
  "research",
] as const;

export type DomainId = (typeof DOMAIN_IDS)[number];

export type ProductDomain = {
  id: DomainId;
  /** Full name, used for the section header and the index row. */
  name: string;
  /** One word for the radial launcher — it sits under a 46px button. */
  label: string;
  /** One line, in EduSentinel's voice, describing what the shelf is for. */
  blurb: string;
  /**
   * What belongs on this shelf, stated plainly enough that a product nobody has
   * built yet can be placed without a meeting. This is the contract the
   * taxonomy makes with its future: if a new product matches the sentence, it
   * has a home already.
   */
  scope: string;
  /** A key into the fixed set in lib/product-icons.tsx — never raw SVG. */
  icon: string;
  /**
   * Word-start signals. Matched with a word boundary and prefix semantics, so
   * "secur" catches "secure"/"security"/"securely" but "api" never fires on
   * "rapid". Scored across the record; the highest total wins.
   */
  signals: readonly string[];
};

export const PRODUCT_DOMAINS: readonly ProductDomain[] = [
  {
    id: "security",
    name: "Cybersecurity",
    label: "Security",
    blurb:
      "Scam, phishing and device protection for the people being targeted every day.",
    scope:
      "Anything whose job is to stop harm reaching a person — detection, verification, blocking, hardening, disclosure. This is the founding shelf: every other domain is built on the engine that lives here.",
    icon: "shield",
    signals: [
      "cybersec",
      "secur",
      "scam",
      "phish",
      "fraud",
      "threat",
      "malware",
      "malicious",
      "breach",
      "vulnerab",
      "protect",
      "defen",
      "safe",
      "privacy",
      "encrypt",
      "spam",
      "spoof",
      "identity",
    ],
  },
  {
    id: "intelligence",
    name: "AI & Productivity",
    label: "AI",
    blurb:
      "Assistants and agents that run close to you and leave your work where you left it.",
    scope:
      "Products where the AI is the product: assistants, agents, automation and on-device reasoning. If it thinks on your behalf and the thinking stays with you, it belongs here.",
    icon: "spark",
    signals: [
      "assistant",
      "agent",
      "copilot",
      "automat",
      "workflow",
      "llm",
      "offline",
      "local",
      "on-device",
      "inference",
      "prompt",
      "reasoning",
      "chatbot",
      "model",
    ],
  },
  {
    id: "learning",
    name: "Education & Awareness",
    label: "Education",
    blurb: "Tools that teach the habit, not just block the link.",
    scope:
      "Products aimed at students, teachers and institutions, and anything whose measure of success is that someone knew better next time rather than that a click was intercepted.",
    icon: "brain",
    signals: [
      "educat",
      "learn",
      "student",
      "school",
      "college",
      "universit",
      "course",
      "curriculum",
      "awareness",
      "training",
      "literac",
      "exam",
      "teacher",
      "tutor",
    ],
  },
  {
    id: "platform",
    name: "Developer Platform",
    label: "Platform",
    blurb: "The shared services and integrations everything else is built on.",
    scope:
      "The surfaces other builders touch: APIs, SDKs, integrations, self-hosting and the infrastructure our own products run on. If its user writes code, it belongs here.",
    icon: "cloud",
    signals: [
      "api",
      "sdk",
      "developer",
      "integration",
      "infrastructure",
      "webhook",
      "deploy",
      "self-host",
      "toolkit",
      "open-source",
    ],
  },
  {
    id: "life",
    name: "Events & Lifestyle",
    label: "Life",
    blurb: "Planning the things that happen once and matter for years.",
    scope:
      "Occasions and personal logistics — weddings, events, guests, budgets, travel. High-stakes, deeply personal data, which is exactly why it is ours to protect rather than someone else's to sell.",
    icon: "heart",
    signals: [
      "wedding",
      "shaadi",
      "marriage",
      "event",
      "venue",
      "guest",
      "budget",
      "plan",
      "celebrat",
      "rsvp",
      "invit",
      "family",
      "lifestyle",
      "travel",
      "occasion",
    ],
  },
  {
    id: "sustainability",
    name: "Climate & Impact",
    label: "Climate",
    blurb: "Measuring the footprint of a digital life, and shrinking it.",
    scope:
      "Anything that measures impact and turns it into a habit — emissions, energy, waste, the quiet cost of running software at scale.",
    icon: "leaf",
    signals: [
      "sustainab",
      "carbon",
      "climate",
      "environment",
      "emission",
      "energy",
      "green",
      "footprint",
      "recycl",
      "waste",
      "renewable",
      "ecolog",
    ],
  },
  {
    id: "research",
    name: "Research",
    label: "Research",
    blurb: "The work we publish before it is a product.",
    scope:
      "Findings, datasets, benchmarks and prototypes released so they can be checked. Nothing here asks for trust — it hands you the method and invites you to disagree.",
    icon: "chart",
    signals: [
      "research",
      "whitepaper",
      "paper",
      "publication",
      "benchmark",
      "dataset",
      "experiment",
      // NOT "stud": it would prefix-match "student" and pull the whole
      // Education shelf across. Prefixes here are deliberately narrow.
      "study",
      "studies",
      "peer-review",
      "findings",
      "methodolog",
    ],
  },
];

export const DOMAINS_BY_ID: Readonly<Record<DomainId, ProductDomain>> =
  Object.fromEntries(PRODUCT_DOMAINS.map((d) => [d.id, d])) as Record<
    DomainId,
    ProductDomain
  >;

/**
 * Where a product goes when nothing matches. Every EduSentinel product is at
 * minimum an AI product, so an unrecognised one is shelved as intelligence
 * rather than dropped — the catalogue never loses a row to a taxonomy gap.
 */
export const DEFAULT_DOMAIN: DomainId = "intelligence";

/** The subset of a catalogue product the classifier reads. Nothing else. */
export type ClassifiableProduct = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  tags: string[];
};

/** The anchor a domain section owns, shared by the index and the launcher. */
export function domainAnchor(id: DomainId): string {
  return `domain-${id}`;
}

const patterns = new Map<string, RegExp>();

function matcher(signal: string): RegExp {
  let re = patterns.get(signal);
  if (!re) {
    re = new RegExp(`\\b${signal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    patterns.set(signal, re);
  }
  return re;
}

/*
 * Field weights. A tag is the Founder saying "this is what this product is",
 * so it is worth three times a passing mention in the description.
 */
const FIELD_WEIGHTS = {
  tags: 3,
  name: 2,
  slug: 2,
  tagline: 2,
  description: 1,
} as const;

function scoreDomain(domain: ProductDomain, p: ClassifiableProduct): number {
  const fields: ReadonlyArray<readonly [string, number]> = [
    [p.tags.join(" "), FIELD_WEIGHTS.tags],
    [p.name, FIELD_WEIGHTS.name],
    [p.slug.replace(/-/g, " "), FIELD_WEIGHTS.slug],
    [p.tagline, FIELD_WEIGHTS.tagline],
    [p.description, FIELD_WEIGHTS.description],
  ];

  let total = 0;
  for (const signal of domain.signals) {
    const re = matcher(signal);
    for (const [text, weight] of fields) {
      if (text && re.test(text)) total += weight;
    }
  }
  return total;
}

/**
 * The one domain a product belongs to. A product lives on exactly one shelf:
 * two shelves means two answers to "where do I find it", and a visitor who
 * meets the same card twice stops trusting the count next to the heading.
 *
 * Deterministic — same record in, same domain out, on the server and in a test.
 */
export function classifyProduct(p: ClassifiableProduct): DomainId {
  let best: DomainId = DEFAULT_DOMAIN;
  let bestScore = 0;

  for (const domain of PRODUCT_DOMAINS) {
    const score = scoreDomain(domain, p);
    // Strictly greater: a tie is broken by registry order, which is why the
    // registry is ordered by how central the domain is to what we build.
    if (score > bestScore) {
      bestScore = score;
      best = domain.id;
    }
  }

  return best;
}

export type DomainGroup<T> = {
  domain: ProductDomain;
  products: T[];
};

/**
 * Groups a catalogue into its populated domains, in registry order. Empty
 * domains are omitted entirely — the page never renders a shelf with nothing
 * on it, and never a count of zero.
 */
export function groupByDomain<T extends ClassifiableProduct>(
  products: T[],
): DomainGroup<T>[] {
  const buckets = new Map<DomainId, T[]>();

  for (const product of products) {
    const id = classifyProduct(product);
    const bucket = buckets.get(id);
    if (bucket) bucket.push(product);
    else buckets.set(id, [product]);
  }

  return PRODUCT_DOMAINS.filter((d) => buckets.has(d.id)).map((domain) => ({
    domain,
    products: buckets.get(domain.id) as T[],
  }));
}
