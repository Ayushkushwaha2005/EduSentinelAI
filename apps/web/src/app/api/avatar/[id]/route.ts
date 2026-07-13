import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const AVATAR_DIR = path.join(process.cwd(), "storage", "avatars");

/*
 * Serves a person's avatar (Phase 6.2).
 *
 * Avatars are staff likenesses, so this route requires a SESSION — they are not
 * public assets and they do not sit in /public. The files live in storage/ under
 * generated names, outside the web root, so there is no path a client can
 * construct to reach one directly; the only way in is this handler.
 *
 * The stored name is read from the database and never from the URL, so the `id`
 * is a lookup key, not a path segment — path traversal has nowhere to land.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized.", { status: 401 });

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { avatarName: true, avatarMime: true },
  });
  if (!user?.avatarName || !user.avatarMime) {
    return new Response("No avatar.", { status: 404 });
  }

  let data: Buffer;
  try {
    data = await readFile(path.join(AVATAR_DIR, user.avatarName));
  } catch {
    return new Response("No avatar.", { status: 404 });
  }

  return new Response(new Uint8Array(data), {
    headers: {
      // The bytes were magic-byte validated and metadata-stripped on upload, and
      // only PNG/JPEG can be stored — but nosniff stays, because the day that
      // stops being true this header is the difference between a broken image and
      // a stored XSS.
      "Content-Type": user.avatarMime,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      // Private: an avatar must not be cached by a shared proxy and handed to
      // someone who never signed in. The URL carries an upload-time cache buster.
      "Cache-Control": "private, max-age=300",
    },
  });
}
