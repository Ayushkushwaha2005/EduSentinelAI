import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How EduSentinel AI collects, uses, and protects data.",
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>
        <em>Draft v0.1 — last updated 11 July 2026. This policy will be
        finalized with legal review before public launch.</em>
      </p>
      <p>
        EduSentinel AI is privacy-first by design. This page describes, in
        plain language, what we collect and what we will never do.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Nothing automatically.</strong> This website uses no
          third-party trackers, no advertising pixels, and no fingerprinting.
        </li>
        <li>
          <strong>What you send us.</strong> If you email us, we receive your
          email address and message, used only to respond.
        </li>
        <li>
          <strong>Server logs.</strong> Our hosting provider records standard
          access logs (IP address, user agent) for security and abuse
          prevention, retained for a limited period.
        </li>
      </ul>
      <h2>If you work at EduSentinel</h2>
      <p>
        Staff accounts hold workforce records — attendance, leave requests and
        leave balances. These are personal data, and we treat them as such.
      </p>
      <ul>
        <li>
          <strong>Your attendance and leave are not company-wide reading.</strong>{" "}
          They are visible to you, to whoever approves your leave, and to the people
          explicitly granted HR permissions. Not to your colleagues, and not to
          anyone who simply happens to be senior.
        </li>
        <li>
          <strong>The reason you give for leave is read only by you and whoever
          decides the request.</strong> It is the field most likely to contain a
          medical fact, so it goes no further: it does not appear on the team
          calendar, in any export, in a notification, or in our audit log. The
          shared calendar shows that you are away — never why, and never which kind
          of leave it was.
        </li>
        <li>
          <strong>Past records are corrected, not rewritten.</strong> A change to an
          attendance record is requested, approved, and recorded with who asked and
          who agreed.
        </li>
        <li>
          <strong>Retention.</strong> Attendance and leave records are kept for 24
          months after the period they describe, then deleted.
        </li>
      </ul>

      <h2>What we will never do</h2>
      <ul>
        <li>Sell or rent personal data to anyone.</li>
        <li>Add third-party advertising or cross-site tracking.</li>
        <li>Use your private content to train AI models without explicit opt-in consent.</li>
      </ul>
      <h2>Future products</h2>
      <p>
        When products with user accounts launch, this policy will be updated
        before their release to state exactly what each product stores, for
        how long, and how to delete it. Changes will be announced on this
        page with a changelog.
      </p>
      <h2>Contact</h2>
      <p>
        Privacy questions: <a href="mailto:hello@edusentinel.ai" className="text-brand-teal underline underline-offset-4">hello@edusentinel.ai</a>
      </p>
    </>
  );
}
