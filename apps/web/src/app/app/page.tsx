import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AppOverview() {
  const session = await auth();
  const user = session?.user;
  const account = user
    ? await db.user.findUnique({ where: { id: user.id } })
    : null;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-medium tracking-[-0.02em]">
        Welcome, {user?.name?.split(" ")[0]}
      </h1>
      <p className="mt-2 text-text-secondary">
        Your EduSentinel AI account — one identity for the whole ecosystem.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="rounded-card border border-border-subtle bg-surface-raised p-7">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
            Account
          </h2>
          <dl className="mt-4 space-y-2 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Email</dt>
              <dd className="truncate font-medium">{user?.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Role</dt>
              <dd className="font-medium">{user?.role}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Member since</dt>
              <dd className="font-medium">
                {account?.createdAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Two-factor auth</dt>
              <dd className="font-medium">
                {account?.mfaEnabled ? "Enabled" : "Coming soon"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-card border border-border-subtle bg-surface-raised p-7">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
            What’s next
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
            The product registry and signed download center arrive in Phase 3.
            Your account will give you access to every EduSentinel product as
            it launches — no separate sign-ups.
          </p>
        </div>
      </div>
    </div>
  );
}
