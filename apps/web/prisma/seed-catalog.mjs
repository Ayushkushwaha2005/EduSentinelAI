// Catalogue migration (Phase 5.5): moves the five products that were hard-coded
// in components/products.tsx into the database, so the public site keeps showing
// exactly what it showed before — but now the Founder owns them and can edit,
// publish, archive or add more from the dashboard without touching code.
//
// Idempotent: skips a product whose slug already exists, so re-running it never
// overwrites edits made from the dashboard.
//
// Usage: npm run db:seed:catalog   (run db:seed first — products need a Founder owner)
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const founder = await db.user.findFirst({
  where: { role: "FOUNDER" },
  select: { id: true, email: true },
});
if (!founder) {
  console.error(
    "seed:catalog — no FOUNDER account exists. Run `npm run db:seed` first: every product needs an owner (R12).",
  );
  process.exit(1);
}

const PRODUCTS = [
  {
    slug: "edusentinel-extension",
    name: "EduSentinel AI Extension",
    tagline: "Scam and phishing detection for students, right in the browser.",
    description:
      "Developed a Chrome browser extension and supporting backend platform focused on digital scam detection, fake internship alerts, student safety, phishing awareness and social engineering protection.",
    icon: "shield",
    pricing: "free",
    tags: ["Cybersecurity", "AI Prototyping", "Scam Detection", "Chrome Extension"],
    features: [
      "Website verification",
      "Scam detection",
      "Fake internship alerts",
      "Phishing protection",
      "Safe browsing",
      "Student safety",
      "Privacy-first architecture",
    ],
    ctaLabel: "Get notified",
    featured: true,
  },
  {
    slug: "edusentinel-app",
    name: "EduSentinel AI App",
    tagline: "A privacy-first mobile defense ecosystem, running on-device.",
    description:
      "An AI-driven, privacy-first mobile defense ecosystem designed to protect mobile users from SMS scams, phishing attempts, malicious download links and device security risks using localized TensorFlow Lite models and encrypted on-device storage.",
    icon: "phone",
    pricing: "free",
    tags: ["Android", "Kotlin", "TensorFlow Lite", "Mobile Security"],
    features: [
      "SMS scam detection",
      "Phishing protection",
      "Safe download verification",
      "Device security monitoring",
      "Offline AI analysis",
      "Privacy-first architecture",
      "Secure encrypted storage",
    ],
    ctaLabel: "Get notified",
    featured: true,
  },
  {
    slug: "edusentinel-shaadi-ai",
    name: "EduSentinel Shaadi AI",
    tagline: "AI-powered wedding planning, from venue to budget.",
    description:
      "An AI-powered wedding planning platform that simplifies venue discovery, guest management, budget planning and event organization with intelligent recommendations.",
    icon: "heart",
    pricing: "free",
    tags: ["AI Planning", "Event Management", "Budget Optimization", "Smart Assistant"],
    features: [
      "Budget optimization",
      "Guest management",
      "Venue recommendations",
      "Smart planning assistant",
    ],
    ctaLabel: "Get notified",
  },
  {
    slug: "carbon-footprint-ai",
    name: "Carbon Footprint AI",
    tagline: "Understand your environmental impact, build greener habits.",
    description:
      "A sustainability platform that helps users monitor carbon emissions, understand environmental impact and build greener digital habits through AI-powered analytics.",
    icon: "leaf",
    pricing: "free",
    tags: [
      "Sustainability",
      "AI Analytics",
      "Environmental Intelligence",
      "Carbon Tracking",
    ],
    features: [
      "Environmental insights",
      "Sustainability reports",
      "Educational analytics",
    ],
    ctaLabel: "Get notified",
  },
  {
    slug: "sentinelai-agent",
    name: "SentinelAI Agent",
    tagline: "A local-first AI assistant that never sends your work away.",
    description:
      "A privacy-first intelligent AI assistant designed for local execution, offline productivity, secure automation and personalized workflows without compromising user privacy.",
    icon: "spark",
    pricing: "soon",
    tags: ["Local AI", "Offline Intelligence", "AI Assistant", "Privacy-first Computing"],
    features: [
      "Offline intelligence",
      "Privacy-first automation",
      "Productivity assistant",
      "Advanced AI workflows",
    ],
    ctaLabel: "Join the waitlist",
  },
];

let created = 0;
let skipped = 0;

for (const [i, p] of PRODUCTS.entries()) {
  const exists = await db.product.findUnique({ where: { slug: p.slug } });
  if (exists) {
    skipped++;
    continue;
  }

  await db.product.create({
    data: {
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      icon: p.icon,
      pricing: p.pricing,
      tags: JSON.stringify(p.tags),
      features: JSON.stringify(p.features),
      ctaLabel: p.ctaLabel,
      ctaHref: "/contact",
      sortOrder: i,
      featured: !!p.featured,
      ownerId: founder.id,
      // These were already public on the marketing site — keep them public.
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  created++;
}

console.log(
  `seed:catalog — ${created} product(s) created, ${skipped} already present. Owner: ${founder.email}`,
);
await db.$disconnect();
