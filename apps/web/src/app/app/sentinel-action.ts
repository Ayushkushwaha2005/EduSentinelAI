"use server";

import { requireViewer } from "@/lib/guard";
import { retrieve, suggestionsFor } from "@/lib/assistant";

/*
 * Sentinel Mini's original server entry point, and the home of `AssistantReply`.
 *
 * THE TRANSPORT MOVED. Asking now goes through `app/api/assistant/route.ts`: a
 * server action re-renders the WHOLE current route and streams it back with the
 * result, so every question was paying for a full re-render of whatever
 * dashboard the asker was standing on in order to deliver a 0.2 ms lookup. The
 * route handler returns the answer and nothing else.
 *
 * Nothing about the ANSWER changed — the route calls the same guard and the same
 * `retrieve`/`suggestionsFor`, and returns this same `AssistantReply` shape. The
 * action below is kept because it is still a correct, identically-guarded entry
 * point and `AssistantReply` is declared here; everything the comment below says
 * about trust and database access is as true of the route as it was of this.
 *
 * It re-derives the viewer and their capabilities on the server for every
 * question — the browser never tells it who is asking. That is the whole reason
 * the answers can be trusted to match the asker's permissions: a client that
 * claimed a capability it did not have would still get the unprivileged set.
 *
 * It touches no database. `lib/assistant.ts` imports only `lib/knowledge.ts`,
 * which is static prose, so there is no query for a crafted question to reach.
 *
 * It lives here, at the root of /app, rather than under /app/guide: the
 * assistant is now mounted in the workspace shell and answers from every page,
 * so filing it under one page's folder would misdescribe it. The behaviour is
 * byte-for-byte what the guide page called — this was a move, not a rewrite.
 */

export type AssistantReply = {
  question: string;
  answers: {
    title: string;
    summary: string;
    passages: string[];
    links: { label: string; href: string }[];
  }[];
  empty: boolean;
};

export async function askAssistant(
  _prev: AssistantReply | null,
  form: FormData,
): Promise<AssistantReply> {
  const viewer = await requireViewer();
  const caps = viewer.caps as Set<string>;

  const question = String(form.get("question") ?? "").slice(0, 300).trim();
  const pathname = String(form.get("pathname") ?? "/app").slice(0, 200);

  if (!question) {
    const s = suggestionsFor(caps, pathname);
    return {
      question: "",
      answers: s.map((a) => ({
        title: a.title,
        summary: a.summary,
        passages: a.body.slice(0, 1),
        links: a.links ?? [],
      })),
      empty: s.length === 0,
    };
  }

  const hits = retrieve(question, caps, pathname, 3);

  return {
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
