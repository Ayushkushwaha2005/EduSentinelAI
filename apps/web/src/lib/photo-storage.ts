import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { del, put } from "@vercel/blob";

/*
 * Where an uploaded organization photo actually lives.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS.
 *
 * The upload wrote the bytes to `storage/brand` under `process.cwd()`. That is
 * correct on a laptop and impossible on Vercel: `storage/` is gitignored, so the
 * directory is not in the deployment bundle, and a serverless filesystem is
 * read-only outside /tmp. `mkdir` threw EROFS, the server action threw, and the
 * organization page rendered "Something went wrong". Even had it written to
 * /tmp, the container is discarded between requests — the photo could not have
 * survived a refresh, let alone a new sign-in.
 *
 * So the SINK changes and nothing else does. `lib/images.ts` still does the
 * magic-byte sniff, the 2 MB cap, the dimension check and the EXIF/GPS strip,
 * and still refuses SVG; this module is handed the bytes that pipeline RETURNS
 * and only decides where they go.
 *
 * WHAT IS STORED IN THE DATABASE, AND WHY IT IS STILL `photoName`.
 *
 * A blob URL is world-readable to anyone holding it. `photoName` is read by
 * /api/photo, which asks the visibility question — an INTERNAL or HIDDEN
 * member's photo is a 404 to the world, with the exact id in hand. Keeping the
 * pointer in `photoName` keeps that gate exactly as it was and keeps every
 * rendered URL same-origin, so neither the CSP (`img-src 'self'`) nor the image
 * optimizer's `remotePatterns` has to be opened up for a storage host. Putting
 * the raw blob URL in `photoPath` instead would have rendered it straight into
 * the page, published non-public members' photos to anyone with the link, and
 * required widening both. `photoPath` keeps its existing meaning: a portrait
 * that ships in public/ as a build asset.
 *
 * The column is a String either way — no schema change, no migration.
 *
 * DEV AND PRODUCTION TAKE THE SAME PATH THROUGH THE SAME CHECKS. With a blob
 * token configured the bytes go to Vercel Blob; without one they go to the
 * local disk exactly as before, so a laptop with no token still works and CI
 * still builds. Production is the case with the token.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BRAND_DIR = path.join(process.cwd(), "storage", "brand");

/** The only host a stored pointer may resolve to. */
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/** Blob storage is configured, i.e. we are running where the disk is read-only. */
function blobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** A stored pointer is either a blob URL or a local filename. Never both. */
function isBlobPointer(stored: string): boolean {
  return stored.startsWith("https://");
}

/**
 * Store validated, stripped bytes and return the pointer to persist.
 *
 * The caller has already run `checkAvatar`; passing anything else would put
 * unvalidated bytes in front of the world.
 */
export async function storePhoto(
  bytes: Uint8Array,
  mime: string,
  ext: string,
): Promise<string> {
  const name = `${randomBytes(16).toString("hex")}.${ext}`;

  if (blobConfigured()) {
    const { url } = await put(`org/${name}`, Buffer.from(bytes), {
      access: "public",
      contentType: mime,
      // Vercel appends its own random suffix on top of our 16 random bytes, so
      // the URL is not guessable from a member id or a previous upload.
      addRandomSuffix: true,
    });
    return url;
  }

  await mkdir(BRAND_DIR, { recursive: true });
  await writeFile(path.join(BRAND_DIR, name), bytes);
  return name;
}

/**
 * Read the bytes back for /api/photo to serve.
 *
 * The route proxies rather than redirects: a redirect would hand the caller the
 * blob URL and with it every future request, which is precisely the visibility
 * gate this keeps.
 */
export async function readPhoto(stored: string): Promise<Buffer | null> {
  if (isBlobPointer(stored)) {
    let url: URL;
    try {
      url = new URL(stored);
    } catch {
      return null;
    }
    // The pointer is written by this module and never by a request, but a
    // fetch() whose destination came out of a database is worth pinning to the
    // one host it is allowed to reach.
    if (url.protocol !== "https:" || !url.hostname.endsWith(BLOB_HOST_SUFFIX)) {
      return null;
    }
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  // A generated hex filename. `basename` makes that structural rather than
  // assumed, so no stored value can climb out of the directory.
  const name = path.basename(stored);
  try {
    return await readFile(path.join(BRAND_DIR, name));
  } catch {
    return null;
  }
}

/** Drop a replaced photo. Failure to delete must never fail the upload. */
export async function deletePhoto(stored: string): Promise<void> {
  if (isBlobPointer(stored)) {
    await del(stored).catch(() => null);
    return;
  }
  await unlink(path.join(BRAND_DIR, path.basename(stored))).catch(() => null);
}
