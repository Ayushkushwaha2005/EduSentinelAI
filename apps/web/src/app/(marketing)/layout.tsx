import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { MeteorField } from "@/components/meteors";
import { ThemeScript } from "@/components/theme";

/*
 * The marketing shell.
 *
 * ThemeScript runs before first paint so there is no flash of the wrong theme.
 * These pages are statically prerendered, so they cannot carry a per-request
 * nonce — their CSP is already `script-src 'self' 'unsafe-inline'` (SN-002,
 * unchanged by Phase 9.4). Nothing was loosened to make the theme work.
 */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <ThemeScript />
      <MeteorField />
      {/* The content sits above the field. The field never sits above the work. */}
      <div className="relative z-10">
        <Nav />
        {children}
        <Footer />
      </div>
    </>
  );
}
