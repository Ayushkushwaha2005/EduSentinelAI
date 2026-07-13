import Link from "next/link";
import { db } from "@/lib/db";
import { requireViewer } from "@/lib/guard";
import { productsFor } from "@/lib/products";
import { listConversations } from "@/lib/messages";
import { sanitizeLine } from "@/lib/sanitize";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { Breadcrumb, Panel } from "@/components/dashboard/widgets";
import { Avatar } from "@/components/dashboard/avatar";

/*
 * Workspace search — the top bar's search box lands here.
 *
 * There is no global index. Every section below is gated on a capability and
 * scoped exactly like the page it points at: products are ownership-scoped,
 * tasks narrow to your own unless you hold `team.manage`, conversations are
 * participant-scoped, and the people directory needs `users.view`. Searching
 * can therefore never surface a record the viewer could not already open.
 *
 * SQLite has no case-insensitive `mode`, so matching is done in memory over the
 * already-scoped rows — correct, and the row counts here are small.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const viewer = await requireViewer();
  const { q } = await searchParams;
  const query = sanitizeLine(q, 80).trim();
  const needle = query.toLowerCase();
  const has = (s: string | null | undefined) => (s ?? "").toLowerCase().includes(needle);

  if (!query) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Search" }]} />
        <Panel>
          <p className="py-8 text-center text-text-muted">
            Type something in the search box to look across your workspace.
          </p>
        </Panel>
      </div>
    );
  }

  const [products, tasks, teams, people, conversations] = await Promise.all([
    viewer.can("products.view")
      ? productsFor(viewer.id, viewer.role).then((rows) =>
          rows.filter((p) => has(p.name) || has(p.slug) || has(p.description)),
        )
      : [],

    db.task
      .findMany({
        where: viewer.can("team.manage") ? {} : { assigneeId: viewer.id },
        include: { project: { select: { name: true } } },
        take: 200,
      })
      .then((rows) => rows.filter((t) => has(t.title) || has(t.project?.name))),

    viewer.can("team.view")
      ? db.team
          .findMany({ select: { id: true, name: true, description: true } })
          .then((rows) => rows.filter((t) => has(t.name) || has(t.description)))
      : [],

    viewer.can("users.view")
      ? db.user
          .findMany({ select: { id: true, name: true, email: true, role: true }, take: 200 })
          .then((rows) => rows.filter((u) => has(u.name) || has(u.email)))
      : [],

    viewer.can("messages.use")
      ? listConversations(viewer.id).then((rows) =>
          rows.filter((c) => has(c.title) || has(c.preview) || has(c.subject)),
        )
      : [],
  ]);

  const total =
    products.length + tasks.length + teams.length + people.length + conversations.length;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb trail={[{ label: "Dashboards", href: "/app" }, { label: "Search" }]} />

      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          Results for “{query}”
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          {total} {total === 1 ? "match" : "matches"} across what you have access to.
        </p>
      </div>

      {total === 0 && (
        <Panel>
          <p className="py-10 text-center text-text-muted">
            Nothing matched. Search only covers records you can already open.
          </p>
        </Panel>
      )}

      {products.length > 0 && (
        <Section title="Products" count={products.length}>
          {products.map((p) => (
            <Row
              key={p.id}
              href="/app/products"
              title={p.name}
              detail={`${p.status} · /products/${p.slug}`}
            />
          ))}
        </Section>
      )}

      {tasks.length > 0 && (
        <Section title="Tasks" count={tasks.length}>
          {tasks.map((t) => (
            <Row
              key={t.id}
              href="/app/tasks"
              title={t.title}
              detail={`${t.status}${t.project ? ` · ${t.project.name}` : ""}`}
            />
          ))}
        </Section>
      )}

      {teams.length > 0 && (
        <Section title="Teams" count={teams.length}>
          {teams.map((t) => (
            <Row
              key={t.id}
              href="/app/teams"
              title={t.name}
              detail={t.description ?? "Team"}
            />
          ))}
        </Section>
      )}

      {conversations.length > 0 && (
        <Section title="Messages" count={conversations.length}>
          {conversations.map((c) => (
            <Row
              key={c.id}
              href={`/app/messages?c=${c.id}`}
              title={c.title}
              detail={c.preview}
            />
          ))}
        </Section>
      )}

      {people.length > 0 && (
        <Section title="People" count={people.length}>
          {people.map((u) => (
            <li key={u.id}>
              <Link
                href="/app/access"
                className="flex items-center gap-3 rounded-control px-3 py-3 transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
              >
                <Avatar name={u.name} size={34} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{u.name}</span>
                  <span className="block truncate text-sm text-text-muted">
                    {u.email} · {ROLE_LABELS[u.role as Role] ?? u.role}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Panel>
      <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
        {title} <span className="text-text-muted">({count})</span>
      </h2>
      <ul className="mt-3 flex flex-col">{children}</ul>
    </Panel>
  );
}

function Row({
  href,
  title,
  detail,
}: {
  href: string;
  title: string;
  detail: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex flex-col rounded-control px-3 py-3 transition-colors duration-[--duration-fast] hover:bg-surface-overlay"
      >
        <span className="truncate text-[15px] font-medium">{title}</span>
        <span className="truncate text-sm text-text-muted">{detail}</span>
      </Link>
    </li>
  );
}
