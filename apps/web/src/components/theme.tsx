"use client";

import { useEffect, useSyncExternalStore } from "react";

/*
 * Theme (Phase 9.4).
 *
 * Three states, not two: system · light · dark. "System" is the default and is a
 * real answer — a person who has told their OS they prefer dark has already told
 * us, and asking again is a worse product.
 *
 * Persisted in localStorage. NOT in the database: a theme is a property of the
 * device you are looking at, not of your account — the same person wants dark on
 * a laptop at night and light on a bright monitor, and a server-stored preference
 * would fight them on one of the two.
 */

export type Theme = "system" | "light" | "dark";
export const THEME_KEY = "edusentinel-theme";

/**
 * The no-flash script.
 *
 * This runs BEFORE first paint, sets `data-theme` on <html>, and is the entire
 * reason there is no flash of the wrong theme. It has to be inline — a fetched
 * script would already be too late.
 *
 * 🔒 It does NOT weaken the CSP. `src/middleware.ts` issues a per-request nonce
 * for every dynamic route; this script carries it. On the statically prerendered
 * marketing pages the policy is already `script-src 'self' 'unsafe-inline'`
 * (accepted risk SN-002, unchanged by this work), so it runs there with no nonce
 * and nothing was loosened to let it.
 */
export function ThemeScript({ nonce }: { nonce?: string }) {
  const js = `
(function(){
  try {
    var t = localStorage.getItem(${JSON.stringify(THEME_KEY)}) || "light";
    var dark = t === "dark" || (t === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  } catch (e) {}
})();`.trim();

  return (
    <script
      nonce={nonce}
      // The content is a constant defined three lines above — no user input, no
      // interpolation of anything a request could influence. It is inline because
      // it must run before paint, not because it is convenient.
      dangerouslySetInnerHTML={{ __html: js }}
    />
  );
}

/** Apply a theme to the document, now. */
function apply(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (dark) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
}

const ORDER: Theme[] = ["system", "light", "dark"];

const LABEL: Record<Theme, string> = {
  system: "Match system",
  light: "Light",
  dark: "Dark",
};

/*
 * The chosen theme lives in localStorage, which React does not own — so it is read
 * through useSyncExternalStore rather than copied into state by an effect. The
 * `storage` event keeps two open tabs in agreement; the custom event keeps this
 * tab honest when the toggle writes.
 */
const THEME_EVENT = "edusentinel:themechange";

function subscribeToTheme(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function readTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY) as Theme | null;
  return stored && ORDER.includes(stored) ? stored : "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    readTheme,
    () => "light" as Theme, // default on first visit; the server cannot read localStorage
  );

  // Following the OS means following it when it CHANGES — a laptop that flips to
  // dark at sunset should take the app with it, without a reload.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    localStorage.setItem(THEME_KEY, next);
    apply(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${LABEL[theme]}. Click to change.`}
      title={`Theme: ${LABEL[theme]}`}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-all duration-[--duration-base] ease-[--ease-brand] hover:bg-surface-overlay hover:text-text-primary ${className}`}
    >
      {theme === "system" ? <SystemIcon /> : theme === "dark" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

/* Icons: drawn here rather than imported, because these three are the only place
   in the product where the mark IS the state. */

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* two small stars — the mark carries the theme's own language */}
      <circle cx="17" cy="6" r="0.9" fill="currentColor" />
      <circle cx="20.4" cy="9.2" r="0.6" fill="currentColor" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="4.5"
        width="18"
        height="12.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M9 20h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* half-lit: the icon says "whatever the machine says" */}
      <path d="M12 6.5v8.5H6a1.5 1.5 0 0 1-1.5-1.5V8a1.5 1.5 0 0 1 1.5-1.5h6Z" fill="currentColor" opacity="0.35" />
    </svg>
  );
}
