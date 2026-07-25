import type { Metadata } from "next";
import { issueFormToken } from "@/lib/bot-defense";
import { ORG_EMAIL } from "@/lib/org-email";
import { SecurityReportForm } from "../../contact/forms";

export const metadata: Metadata = {
  title: "Security & Responsible Disclosure",
  description:
    "EduSentinel AI security practices and how to report vulnerabilities responsibly.",
};

/* The disclosure form carries a per-render signed timing token, so this page
   cannot be statically cached (Phase 10, Task 11). */
export const dynamic = "force-dynamic";

export default function SecurityPage() {
  const token = issueFormToken();

  return (
    <>
      <h1>Security &amp; Responsible Disclosure</h1>
      <p>
        Security is our discipline, not our marketing. This page describes
        our practices and how to report vulnerabilities.
      </p>
      <h2>Our practices</h2>
      <ul>
        <li>Every software release is signed, with SHA-256 checksums published alongside downloads.</li>
        <li>Privileged administrative actions on our platform are audit-logged.</li>
        <li>Changes to authentication or release infrastructure require two-person review.</li>
      </ul>
      <h2>Reporting a vulnerability</h2>
      <p>
        If you believe you have found a security issue in any EduSentinel AI
        property or product, use the form below. It reaches the same inbox as{" "}
        <a
          href={`mailto:${ORG_EMAIL.security}`}
          className="text-brand-teal underline underline-offset-4"
        >
          {ORG_EMAIL.security}
        </a>
        , which you are equally welcome to email directly — the form simply asks
        for the details we need to triage a report quickly.
      </p>
      <p>
        You may report anonymously. Please do not include live credentials or
        third-party personal data in your report.
      </p>

      {/*
       * Phase 10, Task 11. `not-prose` because this page renders inside the
       * legal layout's prose styles, which would otherwise restyle the form
       * controls as article typography.
       */}
      <div className="not-prose my-10 rounded-card border border-border-subtle bg-surface-raised p-8 md:p-10">
        <SecurityReportForm token={token} />
      </div>
      <h2>Our commitment to researchers</h2>
      <ul>
        <li>Acknowledgement of your report within 72 hours.</li>
        <li>A remediation target and status updates while we fix the issue.</li>
        <li>Coordinated disclosure within 90 days of report.</li>
        <li>No legal action against good-faith research that avoids privacy violations, data destruction, and service disruption.</li>
      </ul>
      <p>
        Machine-readable contact details are published at{" "}
        <a href="/.well-known/security.txt" className="text-brand-teal underline underline-offset-4">
          /.well-known/security.txt
        </a>
        .
      </p>
    </>
  );
}
