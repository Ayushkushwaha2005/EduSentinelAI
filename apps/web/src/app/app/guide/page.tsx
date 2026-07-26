import Link from "next/link";
import { requireViewer } from "@/lib/guard";
import { articlesFor, groupBySection } from "@/lib/knowledge";
import { Breadcrumb, Panel } from "@/components/dashboard/widgets";

/*
 * The Knowledge Center — "Portal Guide".
 *
 * Gated on requireViewer, not on a capability: everyone with an account is
 * entitled to know how the thing they are using works.
 *
 * WHAT EACH PERSON SEES IS DERIVED, NOT AUTHORED PER ROLE. Articles declare the
 * capability they are about, and the list is filtered by the viewer's effective
 * set — so a Founder sees the release-signing article, an Employee does not,
 * and someone who is granted release review tomorrow sees it tomorrow with no
 * content change. See lib/knowledge.ts for why that beats role-keyed docs.
 */
export const metadata = { title: "Portal Guide" };

export default async function GuidePage() {
  const viewer = await requireViewer();
  const caps = viewer.caps as Set<string>;
  const articles = articlesFor(caps);
  const groups = groupBySection(articles);

  /* A reading measure, kept deliberately: the guide is prose, and a 1700px line
     of body text is unreadable. Widened from 4xl so the side margins read as
     breathing room rather than a void, but it stays centred and capped. */
  return (
    <div className="mx-auto flex w-full max-w-5xl grow flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Portal Guide" }]} />

      <div>
        <h1 className="font-display text-[36px] font-semibold leading-[0.98] tracking-[-0.04em] md:text-[44px]">
          Portal Guide
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-text-secondary">
          How this workspace works, what your account can do, and where things
          live. It adapts to your permissions — you are seeing{" "}
          {articles.length}{" "}
          {/* The trailing {" "} is required, not decorative: this text node spans
              several lines, and JSX trims whitespace at the edges of a multi-line
              text block — which is why it rendered as "15of the guide's". */}
          of the guide&apos;s articles because that is what applies to you.
        </p>
      </div>

      {/*
       * The assistant is NOT here any more.
       *
       * It lives in the top bar as Sentinel Mini, mounted in the workspace
       * shell, so it can be asked from any page instead of only from the one
       * page a person has to find first. This is a pointer to it, not a second
       * copy — two ask-boxes answering from the same articles would be two
       * things to keep in step and no benefit.
       */}
      <Panel className="flex flex-wrap items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ws-mint text-ws-ink">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3l1.9 5.3L19 10.2l-5.1 1.9L12 17.4l-1.9-5.3L5 10.2l5.1-1.9L12 3z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold tracking-[-0.01em]">
            Ask Sentinel Mini instead
          </span>
          <span className="block text-sm leading-relaxed text-text-secondary">
            The assistant is in the top bar, on every page. It answers from these
            same articles, filtered to what your account can do — so you can ask
            where you are rather than coming here first.
          </span>
        </span>
      </Panel>

      {groups.map((group) => (
        <Panel key={group.section} id={group.section.toLowerCase().replace(/\s+/g, "-")}>
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
            {group.section}
          </h2>

          <div className="mt-5 flex flex-col divide-y divide-border-subtle">
            {group.articles.map((a) => (
              <article key={a.slug} className="py-5 first:pt-0 last:pb-0">
                <h3 className="text-[19px] font-semibold tracking-[-0.015em]">{a.title}</h3>
                <p className="mt-1 text-sm text-text-secondary">{a.summary}</p>

                {a.body.map((p, i) => (
                  <p key={i} className="mt-3 text-[15px] leading-relaxed text-text-secondary">
                    {p}
                  </p>
                ))}

                {a.links && a.links.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {a.links.map((l) => (
                      <Link
                        key={l.href + l.label}
                        href={l.href}
                        prefetch
                        className="inline-flex h-9 items-center rounded-full border border-border-subtle px-4 text-sm font-medium transition-colors hover:bg-surface-overlay"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </Panel>
      ))}

      <p className="px-1 pb-2 text-sm text-text-muted">
        This guide explains how the portal works. It deliberately contains no
        company data, no customer information and no confidential material — it
        is written prose in the repository, reviewed like any other change.
      </p>
    </div>
  );
}
