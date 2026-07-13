/*
 * Avatar validation and metadata stripping (Phase 6.2).
 *
 * An avatar is a file the public can hand us, so it gets the same treatment as a
 * release artifact (R5): allowlisted formats verified by MAGIC BYTES — never by
 * extension or the client-supplied MIME — a hard size cap, and a dimension cap so
 * a 40-byte file cannot ask the browser for 40 GB of pixels.
 *
 * Two rules worth stating plainly:
 *
 *   1. SVG IS SCRIPT. An <svg> can carry <script> and event handlers, and it is
 *      same-origin when served from our domain. It is not an image format for our
 *      purposes and is refused — as is GIF (animation we don't want) and anything
 *      else outside the allowlist.
 *
 *   2. A PHOTO CARRIES GPS. EXIF from a phone camera routinely holds the exact
 *      location and time the picture was taken; publishing staff avatars with it
 *      intact would leak where our people live. We therefore rebuild the file from
 *      its pixel-bearing chunks only, dropping every metadata container. This is
 *      done byte-wise rather than by re-encoding through a native image library:
 *      no new native dependency, no quality loss, and the output is a strict
 *      subset of the input — we can only ever remove.
 */

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_AVATAR_DIMENSION = 4096; // px, either axis

export type ImageKind = "image/png" | "image/jpeg";

export type ImageCheck =
  | { ok: true; mime: ImageKind; ext: "png" | "jpg"; bytes: Uint8Array }
  | { ok: false; error: string };

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

function startsWith(buf: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => buf[i] === b);
}

/** Magic-byte sniff. The claimed MIME and the filename are not consulted. */
export function detectImage(buf: Uint8Array): ImageKind | null {
  if (startsWith(buf, PNG_MAGIC)) return "image/png";
  if (startsWith(buf, JPEG_MAGIC)) return "image/jpeg";
  return null;
}

/**
 * PNG: keep only the chunks needed to render the image, drop everything else.
 *
 * Dropped: eXIf/tEXt/iTXt/zTXt (metadata, including EXIF GPS), tIME, and the APNG
 * chunks (acTL/fcTL/fdAT) — an animated avatar is not a feature we offer, and an
 * animation control block is parser surface we have no reason to carry.
 */
const PNG_KEEP = new Set([
  "IHDR",
  "PLTE",
  "IDAT",
  "IEND",
  "tRNS", // transparency — part of the pixels, not metadata
  "gAMA",
  "cHRM",
  "sRGB", // colour rendering; tiny and not identifying
]);

function stripPng(buf: Uint8Array): { bytes: Uint8Array; width: number; height: number } | null {
  const out: number[] = [...PNG_MAGIC];
  let offset = 8;
  let width = 0;
  let height = 0;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  while (offset + 8 <= buf.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...buf.slice(offset + 4, offset + 8));
    const total = 12 + length; // length + type + data + crc
    if (length > buf.length || offset + total > buf.length) return null; // truncated/hostile

    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
    }
    if (PNG_KEEP.has(type)) {
      out.push(...buf.slice(offset, offset + total));
    }
    offset += total;
    if (type === "IEND") break;
  }

  if (!width || !height) return null;
  return { bytes: Uint8Array.from(out), width, height };
}

/**
 * JPEG: copy the entropy-coded image and the tables it needs; drop every APPn
 * segment (APP1 is where EXIF lives, APP13 where IPTC does) and every comment.
 */
function stripJpeg(buf: Uint8Array): { bytes: Uint8Array; width: number; height: number } | null {
  const out: number[] = [0xff, 0xd8]; // SOI
  let offset = 2;
  let width = 0;
  let height = 0;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) return null; // not at a marker — malformed
    const marker = buf[offset + 1];

    // Start of Scan: the rest of the file is compressed image data. Copy it as-is.
    if (marker === 0xda) {
      out.push(...buf.slice(offset));
      break;
    }

    const length = view.getUint16(offset + 2);
    if (length < 2 || offset + 2 + length > buf.length) return null;

    // SOF0/1/2/9/10 carry the real dimensions.
    if ((marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      height = view.getUint16(offset + 5);
      width = view.getUint16(offset + 7);
    }

    const isMetadata = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe; // APPn, COM
    if (!isMetadata) out.push(...buf.slice(offset, offset + 2 + length));

    offset += 2 + length;
  }

  if (!width || !height) return null;
  return { bytes: Uint8Array.from(out), width, height };
}

/**
 * The one entry point. Returns the *rewritten* bytes — callers must persist what
 * comes back, never the bytes they were handed, or the strip did nothing.
 */
export function checkAvatar(input: Uint8Array): ImageCheck {
  if (input.length === 0) return { ok: false, error: "That file is empty." };
  if (input.length > MAX_AVATAR_BYTES) {
    return { ok: false, error: "Images must be 2 MB or smaller." };
  }

  const mime = detectImage(input);
  if (!mime) {
    return { ok: false, error: "Upload a PNG or JPEG image." };
  }

  const stripped = mime === "image/png" ? stripPng(input) : stripJpeg(input);
  if (!stripped) {
    return { ok: false, error: "That image could not be read." };
  }
  if (stripped.width > MAX_AVATAR_DIMENSION || stripped.height > MAX_AVATAR_DIMENSION) {
    return { ok: false, error: `Images must be ${MAX_AVATAR_DIMENSION}px or smaller on each side.` };
  }

  return {
    ok: true,
    mime,
    ext: mime === "image/png" ? "png" : "jpg",
    bytes: stripped.bytes,
  };
}
