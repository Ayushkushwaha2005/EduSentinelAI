import { readFile } from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyDownloadSig } from "@/lib/artifacts";

const STORAGE = path.join(process.cwd(), "storage");

/*
 * Serves published artifacts only, and only with a valid, unexpired signed
 * URL (R5). Files live outside the web root under generated names, so
 * there is no path a client can construct directly.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const exp = req.nextUrl.searchParams.get("exp") ?? "";
  const sig = req.nextUrl.searchParams.get("sig") ?? "";

  if (!verifyDownloadSig(id, exp, sig)) {
    return new Response("Link expired or invalid.", { status: 403 });
  }

  const artifact = await db.artifact.findUnique({
    where: { id },
    include: { release: true },
  });
  if (!artifact || artifact.release.status !== "PUBLISHED") {
    return new Response("Not available.", { status: 404 });
  }

  let data: Buffer;
  try {
    data = await readFile(path.join(STORAGE, "artifacts", artifact.storageName));
  } catch {
    return new Response("Artifact missing.", { status: 404 });
  }

  await db.artifact.update({
    where: { id: artifact.id },
    data: { downloadCount: { increment: 1 } },
  });

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${artifact.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(artifact.size),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
