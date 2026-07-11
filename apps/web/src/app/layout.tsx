import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://edusentinel.ai"),
  title: {
    default: "EduSentinel AI — Privacy-First Technology Ecosystem",
    template: "%s · EduSentinel AI",
  },
  description:
    "EduSentinel AI builds privacy-first products across cybersecurity, artificial intelligence, cloud computing, developer tools, and education.",
  openGraph: {
    siteName: "EduSentinel AI",
    type: "website",
    images: ["/og.png"],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
