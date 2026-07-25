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
      {/* Task 13: first tabbable element on the page. Without it, reaching the
          content by keyboard means tabbing past eight nav links every time. */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {/* The content sits above the field. The field never sits above the work. */}
      <div className="relative z-10">
        <Nav />
        {/* tabIndex={-1} so the skip link can actually move focus here — a plain
            anchor jump scrolls without moving the keyboard's position. */}
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <Footer />
      </div>
    </>
  );
}
