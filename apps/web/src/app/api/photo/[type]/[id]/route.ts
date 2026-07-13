import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const BRAND_DIR = path.join(process.cwd(), "storage", "brand");

/*
 * Serves organization photos and the company logo (Phase 6.5).
 *
 * Unlike /api/avatar, this route is PUBLIC — and deliberately so: these images
 * appear on the marketing site, where there is no session. That makes the
 * visibility rule load-bearing rather than cosmetic: a member photo is served
 * only when the member is PUBLIC. An INTERNAL or HIDDEN member's photo is a 404
 * to the world, even with the exact id.
 *
 * The stored filename comes from the database, never from the URL, so `id` is a
 * lookup key and not a path segment — traversal has nowhere to land. The bytes
 * were magic-byte validated and metadata-stripped on upload (lib/images.ts), and
 * only PNG/JPEG can be stored.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await params;

  let file: { name: string; mime: string } | null = null;
  // Only genuinely public images may be cached by a shared proxy. An internal
  // member's photo is served to a signed-in viewer and must not be handed on to
  // the next person through a CDN.
  let shareable = false;

  if (type === "logo") {
    const company = await db.companyProfile.findUnique({ where: { id: "company" } });
    if (company?.logoName && company.logoMime) {
      file = { name: company.logoName, mime: company.logoMime };
      shareable = true;
    }
  } else if (type === "member") {
    const member = await db.orgMember.findUnique({
      where: { id },
      select: { photoName: true, photoMime: true, visibility: true },
    });
    if (member?.photoName && member.photoMime) {
      // The visibility gate. A photo is not "public because it is an image": an
      // INTERNAL or HIDDEN member is served only to someone with a session, so
      // the org chart still renders inside the workspace while the world gets a
      // 404 — with the exact id in hand.
      shareable = member.visibility === "PUBLIC";
      const allowed = shareable || !!(await auth())?.user?.id;
      if (allowed) file = { name: member.photoName, mime: member.photoMime };
    }
  }

  if (!file) return new Response("Not found.", { status: 404 });

  let data: Buffer;
  try {
    data = await readFile(path.join(BRAND_DIR, file.name));
  } catch {
    return new Response("Not found.", { status: 404 });
  }

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mime,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      // The URL carries an upload-time cache buster, so a replaced photo is never
      // served from a stale cache.
      "Cache-Control": shareable ? "public, max-age=600" : "private, max-age=300",
    },
  });
}
