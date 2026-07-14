import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/guard";
import { canSee } from "@/lib/support";

const SUPPORT_DIR = path.join(process.cwd(), "storage", "support");

/*
 * Serves a support attachment (Phase 9).
 *
 * The authorization is the SAME question the thread page asks — may this viewer
 * see this request? — resolved through the same helper. A file route that answers
 * a different question from the page it belongs to is how attachments end up
 * readable by people who cannot open the ticket they are attached to.
 *
 * The stored name comes from the database, never the URL: `id` is a lookup key,
 * not a path segment, so traversal has nowhere to land.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await requireViewer();
  const { id } = await params;

  const file = await db.supportAttachment.findUnique({
    where: { id },
    include: { request: { select: { requesterId: true } } },
  });
  // Not found and not permitted give the same answer, deliberately.
  if (!file || !canSee(viewer, file.request.requesterId)) {
    return new Response("Not found.", { status: 404 });
  }

  let data: Buffer;
  try {
    data = await readFile(path.join(SUPPORT_DIR, file.storageName));
  } catch {
    return new Response("Not found.", { status: 404 });
  }

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mime,
      // Downloaded, never rendered in our origin. A PDF is stored as it was sent
      // (mutating someone's evidence would be worse than the metadata it carries),
      // so it must never execute here: attachment + nosniff + a sandbox CSP.
      "Content-Disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
