import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security & Responsible Disclosure",
  description:
    "EduSentinel AI security practices and how to report vulnerabilities responsibly.",
};

export default function SecurityPage() {
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
        property or product, email{" "}
        <a href="mailto:security@edusentinel.ai" className="text-brand-teal underline underline-offset-4">
          security@edusentinel.ai
        </a>{" "}
        with a description, reproduction steps, and impact assessment.
      </p>
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
