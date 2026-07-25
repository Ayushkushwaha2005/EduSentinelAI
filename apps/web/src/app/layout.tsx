import type { Metadata } from "next";
import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import { getCompany, COMPANY_DEFAULTS } from "@/lib/company";
import "./globals.css";

/*
 * Typography (Phase 10, Task 5). See packages/ui/src/tokens.css for why these
 * three and not others.
 *
 * Every one is self-hosted by next/font at BUILD time — no runtime request to
 * fonts.googleapis.com, which keeps `font-src 'self'` intact and keeps a font CDN
 * (a tracker by any honest definition) off the critical path. `display: swap`
 * means text is readable on the first paint rather than invisible while a face
 * downloads, and the weight lists are deliberately narrow: a display face needs
 * two weights, not nine.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-sora",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

/*
 * Site metadata is the company record (Phase 6.5) — the name in the tab, the
 * description a search engine shows, the site name in a link preview. The Founder
 * edits it on /app/company and it is correct everywhere, with no deploy.
 *
 * The defaults in lib/company.ts are what the site shipped with, so this renders
 * identically against an empty database rather than degrading to blanks.
 */
export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompany();
  const url = company.website ?? COMPANY_DEFAULTS.website!;

  return {
    metadataBase: new URL(url),
    title: {
      default: company.tagline
        ? `${company.name} — ${company.tagline}`
        : company.name,
      template: `%s · ${company.name}`,
    },
    description: company.description ?? undefined,
    openGraph: {
      siteName: company.name,
      type: "website",
      images: ["/og.png"],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sora.variable} ${jetbrains.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
