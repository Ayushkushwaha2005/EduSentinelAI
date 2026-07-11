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
        Privacy questions: <a href="mailto:hello@edusentinel.ai" className="text-brand-glow">hello@edusentinel.ai</a>
      </p>
    </>
  );
}
