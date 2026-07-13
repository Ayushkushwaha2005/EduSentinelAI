import { db } from "@/lib/db";
import { requireCapability } from "@/lib/guard";
import { CollaborationControls, AbuseControls } from "./moderation-forms";

const tone: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning",
  APPROVED: "bg-success/10 text-success",
  REJECTED: "bg-surface-overlay text-text-secondary",
  SPAM: "bg-danger/10 text-danger",
  OPEN: "bg-warning/10 text-warning",
  ACTIONED: "bg-success/10 text-success",
  DISMISSED: "bg-surface-overlay text-text-secondary",
};

export default async function CollaborationInbox() {
  // MFA for privileged roles is enforced inside requireCapability.
  await requireCapability("collab.moderate");

  const [requests, reports] = await Promise.all([
    db.collaborationRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.abuseReport.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const pending = requests.filter((r) => r.status === "PENDING");
  const openReports = reports.filter((r) => r.status === "OPEN");

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-medium tracking-[-0.02em]">Collaboration inbox</h1>
      <p className="mt-2 text-text-secondary">
        Public submissions and abuse reports. All submitted text is stored
        sanitized and rendered as plain text.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          Requests{" "}
          <span className="text-text-muted">
            ({pending.length} pending / {requests.length} total)
          </span>
        </h2>
        <div className="mt-4 space-y-4">
          {requests.length === 0 && (
            <p className="text-[15px] text-text-muted">No requests yet.</p>
          )}
          {requests.map((r) => (
            <div key={r.id} className="rounded-card border border-border-subtle bg-surface-raised p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">{r.name}</span>
                <span className="text-sm text-text-secondary">{r.email}</span>
                {r.org && <span className="text-sm text-text-muted">· {r.org}</span>}
                <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-xs font-medium">
                  {r.kind}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone[r.status]}`}>
                  {r.status}
                </span>
                <span className="ml-auto text-xs text-text-muted">
                  {r.createdAt.toLocaleString("en-GB")}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-text-secondary">
                {r.message}
              </p>
              {r.reviewNote && (
                <p className="mt-2 text-xs text-text-muted">Note: {r.reviewNote}</p>
              )}
              {r.status === "PENDING" && (
                <div className="mt-4">
                  <CollaborationControls id={r.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">
          Abuse reports{" "}
          <span className="text-text-muted">
            ({openReports.length} open / {reports.length} total)
          </span>
        </h2>
        <div className="mt-4 space-y-4">
          {reports.length === 0 && (
            <p className="text-[15px] text-text-muted">No reports.</p>
          )}
          {reports.map((r) => (
            <div key={r.id} className="rounded-card border border-border-subtle bg-surface-raised p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-xs font-medium">
                  {r.targetType}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone[r.status]}`}>
                  {r.status}
                </span>
                {r.targetRef && (
                  <span className="text-sm text-text-muted">{r.targetRef}</span>
                )}
                <span className="ml-auto text-xs text-text-muted">
                  {r.createdAt.toLocaleString("en-GB")}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-text-secondary">
                {r.reason}
              </p>
              {r.reporter && (
                <p className="mt-2 text-xs text-text-muted">Reporter: {r.reporter}</p>
              )}
              {r.status === "OPEN" && (
                <div className="mt-4">
                  <AbuseControls id={r.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
