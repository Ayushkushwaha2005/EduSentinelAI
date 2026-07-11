import Link from "next/link";
import { SplitHeading } from "./section";
import { Stagger, Item, HoverCard, Reveal } from "./motion";
import { TeamPhoto } from "./team-photo";
import type { ReactNode } from "react";

/*
 * Products grid — the ecosystem's real products, in the site's existing
 * card language. Pricing badges reflect current status honestly; CTAs
 * route to contact until the Phase 3 download center exists.
 */
type Product = {
  name: string;
  badges: { label: string; tone: "free" | "paid" | "soon" }[];
  description: string;
  tags: string[];
  features: string[];
  cta: string;
  icon: ReactNode;
};

const products: Product[] = [
  {
    name: "EduSentinel AI Extension",
    badges: [{ label: "Free", tone: "free" }],
    description:
      "Developed a Chrome browser extension and supporting backend platform focused on digital scam detection, fake internship alerts, student safety, phishing awareness and social engineering protection.",
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
    cta: "Get notified",
    icon: <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />,
  },
  {
    name: "EduSentinel AI App",
    badges: [{ label: "Free", tone: "free" }],
    description:
      "An AI-driven, privacy-first mobile defense ecosystem designed to protect mobile users from SMS scams, phishing attempts, malicious download links and device security risks using localized TensorFlow Lite models and encrypted on-device storage.",
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
    cta: "Get notified",
    icon: <path d="M8 2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2zm2 17h4" />,
  },
  {
    name: "EduSentinel Shaadi AI",
    badges: [{ label: "Free", tone: "free" }],
    description:
      "An AI-powered wedding planning platform that simplifies venue discovery, guest management, budget planning and event organization with intelligent recommendations.",
    tags: ["AI Planning", "Event Management", "Budget Optimization", "Smart Assistant"],
    features: [
      "Budget optimization",
      "Guest management",
      "Venue recommendations",
      "Smart planning assistant",
    ],
    cta: "Get notified",
    icon: <path d="M12 21C7 16.5 3 13 3 8.8 3 6 5.2 4 7.8 4c1.6 0 3.2.8 4.2 2.2C13 4.8 14.6 4 16.2 4 18.8 4 21 6 21 8.8c0 4.2-4 7.7-9 12.2z" />,
  },
  {
    name: "Carbon Footprint AI",
    badges: [{ label: "Free", tone: "free" }],
    description:
      "A sustainability platform that helps users monitor carbon emissions, understand environmental impact and build greener digital habits through AI-powered analytics.",
    tags: ["Sustainability", "AI Analytics", "Environmental Intelligence", "Carbon Tracking"],
    features: [
      "Environmental insights",
      "Sustainability reports",
      "Educational analytics",
    ],
    cta: "Get notified",
    icon: <path d="M12 3C7 3 4 7 4 11c0 5 4 8 8 10 4-2 8-5 8-10 0-4-3-8-8-8zm0 5v8m-3-5c2 1 4 1 6 0" />,
  },
  {
    name: "SentinelAI Agent",
    badges: [
      { label: "Coming Soon", tone: "soon" },
      { label: "Paid", tone: "paid" },
    ],
    description:
      "A privacy-first intelligent AI assistant designed for local execution, offline productivity, secure automation and personalized workflows without compromising user privacy.",
    tags: ["Local AI", "Offline Intelligence", "AI Assistant", "Privacy-first Computing"],
    features: [
      "Offline intelligence",
      "Privacy-first automation",
      "Productivity assistant",
      "Advanced AI workflows",
    ],
    cta: "Join the waitlist",
    icon: <path d="M12 3v3m0 12v3M3 12h3m12 0h3M6.5 6.5l2 2m7 7l2 2m0-11l-2 2m-7 7l-2 2M12 9a3 3 0 110 6 3 3 0 010-6z" />,
  },
];

/* Product contributors — shown once beneath the grid; identical across products. */
const contributors: {
  name: string;
  position: string;
  photo: string | null;
  links: { label: string; href: string }[];
}[] = [
  {
    name: "Ayush Kushwaha",
    position: "Founder",
    photo: "/team/ayush-kushwaha.jpg",
    links: [
      { label: "Portfolio", href: "https://www.ayushkushwaha.me/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/ayush-kushwaha-b881132b8/" },
      { label: "GitHub", href: "https://github.com/Ayushkushwaha2005" },
    ],
  },
  {
    name: "Ayush Maurya",
    position: "Co-Founder",
    photo: null,
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/contactayush111/" },
    ],
  },
  {
    name: "Jujhar Singh",
    position: "Core Team",
    photo: "/team/jujhar-singh.jpeg",
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/jujhar-singh-23137a341/" },
    ],
  },
  {
    name: "Vedansh Devnani",
    position: "Core Team",
    photo: null,
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/vedansh-devnani-7269b6322/" },
    ],
  },
  {
    name: "Aishika",
    position: "Collaborative Partner",
    photo: null,
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/aishika-0a185725b/" },
    ],
  },
];

const badgeTones = {
  free: "bg-surface-overlay text-text-secondary",
  paid: "bg-ink text-surface-raised",
  soon: "bg-brand-teal/10 text-brand-teal",
};

export function ProductsSection() {
  return (
    <section id="products" className="mx-auto max-w-[1360px] px-6 pb-24 md:px-10 md:pb-32">
      <SplitHeading
        title="Products built for digital trust."
        aside="Real tools from the EduSentinel ecosystem — every one privacy-first, every one on a single account."
      />
      <Stagger className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <Item key={p.name} className="h-full">
            <HoverCard className="group h-full">
              <div className="flex h-full flex-col rounded-card border border-border-subtle bg-surface-raised p-7 transition-colors duration-300 group-hover:border-brand-teal/40 md:p-8">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-surface-base text-brand-teal">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {p.icon}
                    </svg>
                  </span>
                  <span className="flex gap-1.5">
                    {p.badges.map((b) => (
                      <span
                        key={b.label}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeTones[b.tone]}`}
                      >
                        {b.label}
                      </span>
                    ))}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{p.name}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border-subtle bg-surface-base px-2.5 py-1 text-[12px] font-medium text-text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px] text-text-secondary">
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-brand-teal">
                        <path d="M2.5 8.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-text-primary transition-colors hover:text-brand-teal"
                >
                  {p.cta}
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10m0 0L9 4m4 4l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </HoverCard>
          </Item>
        ))}
      </Stagger>

      {/* contributors — credited once for the whole product line */}
      <Reveal className="mt-16">
        <div className="rounded-card border border-border-subtle bg-surface-raised/50 p-8 md:p-10">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-muted">
            Contributors
          </h3>
          <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {contributors.map((c) => (
              <div key={c.name} className="flex items-center gap-4">
                <TeamPhoto
                  name={c.name}
                  photo={c.photo}
                  sizes="56px"
                  compact
                  className="h-14 w-14 shrink-0 rounded-xl"
                />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold tracking-tight">
                    {c.name}
                  </p>
                  <p className="text-[13px] text-text-muted">{c.position}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {c.links.map((l) => (
                      <a
                        key={l.label}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] font-medium text-brand-teal underline-offset-4 hover:underline"
                      >
                        {l.label}
                      </a>
                    ))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
