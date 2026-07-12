/*
 * Output sanitization for user-influenced content (Phase 4 gate).
 *
 * Policy: user-submitted text is stored and rendered as PLAIN TEXT only —
 * we never render user HTML or markdown anywhere, so there is no HTML sink
 * to sanitize into. This module is the single choke point that enforces
 * that: it strips control characters, neutralizes anything a future
 * renderer could read as markup, and caps length.
 *
 * React escapes text on render, so this is defense-in-depth: even if a
 * value later reached an HTML sink (an email body, a CSV export, a future
 * markdown renderer), it cannot carry tags or protocol handlers.
 */

// Control characters, excluding tab (9) and newline (10). Built from char
// codes so no literal control bytes appear in this source file.
const CONTROL = new RegExp(
  "[" +
    String.fromCharCode(0) + "-" + String.fromCharCode(8) +
    String.fromCharCode(11) + "-" + String.fromCharCode(31) +
    String.fromCharCode(127) +
    "]",
  "g",
);
const DANGEROUS_PROTOCOL = /\b(?:javascript|data|vbscript)\s*:/gi;

const LT = String.fromCharCode(0x2039); // ‹
const GT = String.fromCharCode(0x203a); // ›
const COLON = String.fromCharCode(0x2236); // ∶

export function sanitizeUserText(input: unknown, maxLength = 4000): string {
  if (typeof input !== "string") return "";
  return input
    .normalize("NFC")
    .replace(CONTROL, "")
    // neutralize markup delimiters (homoglyphs — text stays readable)
    .replace(/</g, LT)
    .replace(/>/g, GT)
    // neutralize dangerous URL schemes
    .replace(DANGEROUS_PROTOCOL, (m) => m.replace(":", COLON))
    .slice(0, maxLength)
    .trim();
}

/** Single-line variant (names, orgs, subjects). */
export function sanitizeLine(input: unknown, maxLength = 200): string {
  return sanitizeUserText(input, maxLength).replace(/\s*[\r\n]+\s*/g, " ");
}
