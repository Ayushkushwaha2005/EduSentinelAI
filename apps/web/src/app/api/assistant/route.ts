import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/guard";
import { retrieve, suggestionsFor } from "@/lib/assistant";
import type { AssistantReply } from "@/app/app/sentinel-action";

/*
 * Sentinel Mini's transport — a route handler, not a server action.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS MOVED, AND WHAT DID NOT MOVE WITH IT.
 *
 * A server action does not just run the action: it re-renders the WHOLE current
 * route and streams the new RSC payload back with the result. Sentinel Mini is
 * mounted in the workspace top bar, so "the current route" is whatever page the
 * asker happens to be standing on — on /app that is the Leadership dashboard,
 * eleven database queries and the entire component tree.
 *
 * Measured on a warm dev server against the local database:
 *
 *     retrieve()                              0.2 ms   <- the actual answer
 *     GET  /app  (page render)              ~100 ms
 *     POST /app  (action + SAME re-render)  ~150 ms
 *
 * The answer was never the cost. The page was. Every question paid for a full
 * re-render of a dashboard the answer does not depend on and does not change —
 * and on a cold dev server, or a Founder's dashboard carrying the 3D agent and
 * the meteor field, that is the ten-to-fifteen seconds people actually felt.
 *
 * A route handler returns the answer and nothing else, so the cost of asking is
 * now the cost of the lookup, independent of the page.
 *
 * WHAT IS UNCHANGED — deliberately, because this is a transport change only:
 *
 *   - The SERVER still re-derives the viewer and their capabilities on every
 *     question (`requireViewer`). The browser still never says who is asking,
 *     so the answers still match the asker's permissions. This is the same
 *     guard the server action called, not a parallel auth path.
 *   - `lib/assistant.ts` is untouched, so the capability filter still runs
 *     BEFORE ranking and the retrieval is byte-for-byte the same.
 *   - It still touches no database beyond the guard: this module imports only
 *     the guard and the static knowledge base, so there is no query for a
 *     crafted question to reach.
 *   - The reply shape (`AssistantReply`) is unchanged, so the component renders
 *     exactly what it rendered before.
 *
 * Same-origin only, and `connect-src 'self'` in the workspace CSP already
 * permits precisely this and nothing else.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export async function POST(req: Request): Promise<Response> {
  // Deny by default, exactly as the server action did. `requireViewer` redirects
  // a signed-out caller, which a route handler answers as a non-200 — the client
  // shows no answer rather than an unprivileged one.
  const viewer = await requireViewer();
  const caps = viewer.caps as Set<string>;

  const form = await req.formData();
  const question = String(form.get("question") ?? "").slice(0, 300).trim();
  const pathname = String(form.get("pathname") ?? "/app").slice(0, 200);

  let reply: AssistantReply;
  if (!question) {
    const s = suggestionsFor(caps, pathname);
    reply = {
      question: "",
      answers: s.map((a) => ({
        title: a.title,
        summary: a.summary,
        passages: a.body.slice(0, 1),
        links: a.links ?? [],
      })),
      empty: s.length === 0,
    };
  } else {
    const hits = retrieve(question, caps, pathname, 3);
    reply = {
      question,
      answers: hits.map((h) => ({
        title: h.article.title,
        summary: h.article.summary,
        passages: h.passages,
        links: h.article.links ?? [],
      })),
      empty: hits.length === 0,
    };
  }

  // An answer is shaped by who asked, so it is never a shared-cache entry.
  return NextResponse.json(reply, {
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
