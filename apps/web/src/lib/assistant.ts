import { ARTICLES, type Article } from "./knowledge";

/*
 * THE PORTAL ASSISTANT — retrieval core.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS IS, AND WHY IT IS BUILT THIS WAY FIRST.
 *
 * It answers questions about the portal from the Knowledge Center, filtered by
 * what the asker is actually allowed to do, and weighted by the page they are
 * standing on. It is not a support bot and not a general chatbot: it will not
 * answer "what is our revenue", because it has no access to anything except
 * static prose.
 *
 * THREE PROPERTIES THAT COME FROM DOING RETRIEVAL RATHER THAN GENERATION:
 *
 *   1. It cannot hallucinate. Every answer is a passage that exists in
 *      lib/knowledge.ts, returned with a link to the real page.
 *   2. It cannot leak. It has no database access — not by policy, but because
 *      this module imports nothing that can reach one.
 *   3. It cannot mislead about permissions. Articles are filtered by the
 *      viewer's effective capabilities before ranking, so it will never explain
 *      how to do something the authorization layer would refuse them.
 *
 * ON ADDING AN LLM LATER. This module is deliberately the substrate for that:
 * `retrieve()` returns exactly the grounded context a model would need. Adding
 * generation means passing these passages to a model — the role filtering, the
 * page awareness and the citation links are already done and would not change.
 * Whatever model is chosen, the rule is the same: it may see these passages and
 * the viewer's capability names, and never a database row.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Words too common to carry meaning in a portal question. */
const STOP = new Set([
  "the","a","an","is","are","was","were","do","does","did","how","what","why","when",
  "where","who","which","can","could","should","would","i","you","we","my","me","to",
  "of","in","on","for","and","or","it","this","that","with","at","be","as","from",
  "if","not","but","get","got","have","has","there","here","about","please","tell",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/**
 * Which article a route belongs to. Standing on /app/leave and asking "how does
 * this work" should not require naming the feature.
 */
const ROUTE_HINTS: { prefix: string; slugs: string[] }[] = [
  { prefix: "/app/leave", slugs: ["attendance-and-leave", "the-calendar"] },
  { prefix: "/app/attendance", slugs: ["attendance-and-leave"] },
  { prefix: "/app/calendar", slugs: ["the-calendar", "attendance-and-leave"] },
  { prefix: "/app/people", slugs: ["directory", "inviting-people", "roles-and-permissions"] },
  { prefix: "/app/access", slugs: ["roles-and-permissions", "inviting-people"] },
  { prefix: "/app/products", slugs: ["catalogue", "release-pipeline"] },
  { prefix: "/app/admin/releases", slugs: ["release-pipeline", "catalogue"] },
  { prefix: "/app/support", slugs: ["support-and-messages", "getting-help"] },
  { prefix: "/app/messages", slugs: ["support-and-messages"] },
  { prefix: "/app/profile", slugs: ["profile-and-settings", "two-factor"] },
  { prefix: "/app/settings", slugs: ["profile-and-settings", "two-factor", "privacy-promises"] },
  { prefix: "/app/security", slugs: ["two-factor", "profile-and-settings"] },
  { prefix: "/app/tasks", slugs: ["tasks-and-teams"] },
  { prefix: "/app/teams", slugs: ["tasks-and-teams"] },
  { prefix: "/app/analytics", slugs: ["privacy-promises"] },
  { prefix: "/app", slugs: ["what-this-portal-is", "finding-your-way"] },
];

function routeSlugs(pathname: string): string[] {
  // Longest prefix wins, so /app/admin/releases beats /app.
  const hit = [...ROUTE_HINTS]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((h) => pathname.startsWith(h.prefix));
  return hit?.slugs ?? [];
}

export type Answer = {
  article: Article;
  score: number;
  /** The sentences that actually matched — what gets shown, not the whole page. */
  passages: string[];
};

/**
 * Rank the articles this viewer may read against their question.
 *
 * Scoring is deliberately simple and explainable: title matches count most,
 * then summary, then body; the page you are on gives a bounded nudge. A model
 * you cannot explain is a bad fit for a tool whose job is telling people how
 * their permissions work.
 */
export function retrieve(
  question: string,
  caps: Set<string>,
  pathname = "/app",
  take = 3,
): Answer[] {
  const terms = tokenize(question);
  const hinted = new Set(routeSlugs(pathname));

  // Capability filter FIRST — an article the viewer may not read is not ranked,
  // not down-weighted. It never enters the candidate set.
  const candidates = ARTICLES.filter((a) => !a.requires || caps.has(a.requires));

  /*
   * How telling is each term?
   *
   * Without this, every word weighed the same, and words that appear in most of
   * the guide — "workspace", "portal", "permission" — dominated the words that
   * actually pick an article out. "Where do I change my password" returned "What
   * this workspace is", because the one article that answers it says "password"
   * only in its body (worth 1) while the generic one matched several common
   * words. A term found in one article is evidence; a term found in ten is not.
   *
   * Computed over the CANDIDATE set, not all articles, so an article the viewer
   * may not read cannot influence the ranking of the ones they can.
   */
  const rarity = new Map();
  for (const t of terms) {
    const inHowMany = candidates.filter((a) =>
      (a.title + " " + a.summary + " " + a.body.join(" ") + " " + a.slug)
        .toLowerCase()
        .includes(t),
    ).length;
    // 1.0 for a term unique to one article, falling towards ~0.3 for one that is
    // everywhere. Never zero: a common word is weak evidence, not none.
    rarity.set(t, inHowMany === 0 ? 1 : Math.max(0.3, 1 / Math.sqrt(inHowMany)));
  }

  const scored = candidates.map((article) => {
    const title = article.title.toLowerCase();
    const summary = article.summary.toLowerCase();
    const body = article.body.join(" ").toLowerCase();

    let score = 0;
    for (const t of terms) {
      const w = rarity.get(t) ?? 1;
      if (title.includes(t)) score += 6 * w;
      if (summary.includes(t)) score += 3 * w;
      if (body.includes(t)) score += 1 * w;
      if (article.slug.includes(t)) score += 4 * w;
    }

    /*
     * The page you are standing on refines the ranking of relevant articles. It
     * does not manufacture relevance.
     *
     * This was a flat `+5`, with a comment promising it was "worth about one
     * title hit, so an explicit question still wins". It was not: a body match
     * is worth about 0.7, so +5 was several title hits, and asking "where do I
     * change my password" from /app returned "What this workspace is" — an
     * article that matched none of the words — above the one that answers it.
     *
     * So the hint is now proportional: it multiplies an article that already
     * earned a score, and gives one that earned nothing only a small floor, so a
     * vague question asked on a specific page still surfaces that page's guide
     * without ever outranking a real match.
     */
    if (hinted.has(article.slug)) {
      if (terms.length === 0) score += 10;
      else if (score > 0) score *= 1.25;
      else score = 0.5;
    }

    // The sentences that actually earned the score.
    const passages =
      terms.length === 0
        ? article.body.slice(0, 1)
        : article.body
            .flatMap((p) => p.split(/(?<=\.)\s+/))
            .filter((sentence) => {
              const s = sentence.toLowerCase();
              return terms.some((t) => s.includes(t));
            })
            .slice(0, 2);

    return {
      article,
      // Rounded: the weights are fractional now, and a score is a rank hint, not
      // a measurement anyone should read decimals into.
      score: Math.round(score * 10) / 10,
      passages: passages.length > 0 ? passages : article.body.slice(0, 1),
    };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, take);
}

/**
 * What to offer when there is no question yet — the assistant opening on a page
 * and saying something useful about that page rather than "How can I help?".
 */
export function suggestionsFor(caps: Set<string>, pathname = "/app"): Article[] {
  const slugs = routeSlugs(pathname);
  const allowed = ARTICLES.filter((a) => !a.requires || caps.has(a.requires));
  const onTopic = slugs
    .map((s) => allowed.find((a) => a.slug === s))
    .filter((a): a is Article => !!a);

  // Top up with the universal getting-started material so it is never empty.
  const fallback = allowed.filter((a) => a.section === "Getting started");
  return [...new Set([...onTopic, ...fallback])].slice(0, 3);
}
