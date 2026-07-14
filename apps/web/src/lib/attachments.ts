import { detectImage } from "./images";

/*
 * Support attachments (Phase 9) — the Phase 3/6 upload discipline, applied again.
 *
 * A support attachment is a file a stranger chooses and a staff member opens. That
 * is the whole threat in one sentence. So it gets the same treatment as a release
 * artifact and an avatar:
 *
 *   - Validated by MAGIC BYTES. Never the filename, never the client's MIME — both
 *     are chosen by the same person who chose the file.
 *   - A short allowlist: PNG, JPEG, PDF, ZIP. A screenshot, a log bundle, a
 *     report. Anything else is refused rather than "probably fine".
 *   - NO SVG. It is script, and it would be served same-origin into a staff
 *     session — a stored XSS with a helpful upload button in front of it.
 *   - Size-capped, stored outside the web root under a GENERATED name, and served
 *     only through a route that re-checks who is asking (see /api/support-file).
 *
 * The bytes are NOT rewritten here, unlike avatars: a PDF or a ZIP is opened by
 * the recipient, not rendered by us, and silently mutating evidence someone
 * attached to a bug report would be worse than the metadata it carries. They are
 * stored as sent, and served with Content-Disposition: attachment and a CSP
 * sandbox so the browser never executes them in our origin.
 */

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export type AttachmentKind = "image/png" | "image/jpeg" | "application/pdf" | "application/zip";

export type AttachmentCheck =
  | { ok: true; mime: AttachmentKind; ext: string }
  | { ok: false; error: string };

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK..

function startsWith(buf: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => buf[i] === b);
}

export function checkAttachment(buf: Uint8Array): AttachmentCheck {
  if (buf.length === 0) return { ok: false, error: "That file is empty." };
  if (buf.length > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: "Attachments must be 10 MB or smaller." };
  }

  // Images reuse the avatar sniffer — one definition of "is this a PNG", not two.
  const image = detectImage(buf);
  if (image === "image/png") return { ok: true, mime: "image/png", ext: "png" };
  if (image === "image/jpeg") return { ok: true, mime: "image/jpeg", ext: "jpg" };

  if (startsWith(buf, PDF_MAGIC)) return { ok: true, mime: "application/pdf", ext: "pdf" };
  if (startsWith(buf, ZIP_MAGIC)) return { ok: true, mime: "application/zip", ext: "zip" };

  return {
    ok: false,
    error: "Attach a PNG, JPEG, PDF or ZIP. Other formats are not accepted.",
  };
}

/** Original names are display-only and never touch the filesystem. Still, clean them. */
export function displayName(name: string): string {
  return name
    .replace(/[\r\n\t]/g, "")
    .replace(/[^\w.\- ]/g, "_")
    .slice(0, 80);
}
