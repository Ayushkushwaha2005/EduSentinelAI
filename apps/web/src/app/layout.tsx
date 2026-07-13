import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getCompany, COMPANY_DEFAULTS } from "@/lib/company";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
