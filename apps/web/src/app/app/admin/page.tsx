import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";

export default async function AdminPage() {
  const session = await auth();
  if (!isAdminRole(session?.user?.role)) redirect("/app");

  const [users, events] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { actor: { select: { email: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-medium tracking-[-0.02em]">Admin</h1>
      <p className="mt-2 text-text-secondary">
        Phase 2 skeleton — user directory and audit trail. Release publishing
        and moderation arrive with Phase 3.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          Users <span className="text-text-muted">({users.length})</span>
        </h2>
        <div className="mt-4 overflow-x-auto rounded-card border border-border-subtle bg-surface-raised">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr className="border-b border-border-subtle text-sm text-text-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border-subtle/60 last:border-0">
                  <td className="px-5 py-3 font-medium">{u.name}</td>
                  <td className="px-5 py-3 text-text-secondary">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-control bg-surface-overlay px-2 py-0.5 text-xs font-medium">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {u.createdAt.toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">Audit trail</h2>
        <div className="mt-4 rounded-card border border-border-subtle bg-surface-raised">
          <ul className="divide-y divide-border-subtle/60">
            {events.length === 0 && (
              <li className="px-5 py-4 text-[15px] text-text-muted">
                No events yet.
              </li>
            )}
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 px-5 py-3 text-[15px]">
                <span>
                  <span className="font-medium">{e.action}</span>
                  {e.actor && (
                    <span className="text-text-secondary"> — {e.actor.email}</span>
                  )}
                  {e.detail && (
                    <span className="text-text-muted"> · {e.detail}</span>
                  )}
                </span>
                <time className="shrink-0 text-sm text-text-muted">
                  {e.createdAt.toLocaleString("en-GB")}
                </time>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
