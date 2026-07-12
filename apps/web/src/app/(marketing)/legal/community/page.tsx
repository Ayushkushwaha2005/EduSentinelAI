import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description:
    "What we expect from collaborators and contributors in the EduSentinel AI community — and what you can expect from us.",
};

export default function CommunityGuidelinesPage() {
  return (
    <>
      <h1>Community Guidelines</h1>
      <p>
        <em>Version 1.0 — last updated 12 July 2026.</em>
      </p>
      <p>
        These guidelines cover everyone who takes part in the EduSentinel AI
        community: collaborators, contributors, researchers, and anyone who
        contacts us. They are short on purpose. If you can only remember one
        line, remember this: <strong>act in good faith, and do not put other
        people at risk.</strong>
      </p>

      <h2>What we expect</h2>
      <ul>
        <li>
          <strong>Be honest.</strong> Do not misrepresent who you are, who you
          work for, or what your software does.
        </li>
        <li>
          <strong>Respect privacy.</strong> Do not share other people&apos;s
          personal data with us or through us. If you find such data exposed,
          report it — do not collect it.
        </li>
        <li>
          <strong>Do no harm.</strong> Do not use our platform, products, or
          name to attack, harass, deceive, or surveil anyone.
        </li>
        <li>
          <strong>Publish responsibly.</strong> Software you submit must be
          yours to submit, licensed clearly, and free of malicious behaviour —
          including anything that tracks users without their knowledge.
        </li>
        <li>
          <strong>Disclose security issues properly.</strong> Use our{" "}
          <Link href="/legal/security">responsible disclosure process</Link>,
          not a public post, and give us the chance to fix it.
        </li>
      </ul>

      <h2>What is not allowed</h2>
      <ul>
        <li>Malware, spyware, stalkerware, or covert data collection of any kind.</li>
        <li>Harassment, hate speech, threats, or targeting of individuals.</li>
        <li>Spam, mass unsolicited outreach, or automated submissions.</li>
        <li>Impersonating EduSentinel AI, our team, or our products.</li>
        <li>Illegal content, or content that facilitates harm to others.</li>
      </ul>

      <h2>What you can expect from us</h2>
      <ul>
        <li>A person reads every collaboration request and every abuse report.</li>
        <li>
          We tell you what happened. If we reject a submission or remove
          content, we say why.
        </li>
        <li>
          We publish our own failures. If a release we shipped turns out to be
          unsafe, we revoke it and post a public notice.
        </li>
        <li>
          Good-faith security research is welcome and will never be treated as
          a violation of these guidelines.
        </li>
      </ul>

      <h2>Enforcement</h2>
      <p>
        Submissions that breach these guidelines are rejected or marked as
        spam. Published content that breaches them is removed, and releases are
        revoked with a public notice. Serious or repeated breaches end
        collaboration with us. Every moderation action is recorded in our audit
        trail.
      </p>

      <h2>Reporting</h2>
      <p>
        Seen something wrong? Use the{" "}
        <Link href="/collaborate#report">abuse report form</Link>, or email{" "}
        <a href="mailto:hello@edusentinel.ai">hello@edusentinel.ai</a>. For
        security vulnerabilities, use{" "}
        <a href="mailto:security@edusentinel.ai">security@edusentinel.ai</a>{" "}
        and see our{" "}
        <Link href="/legal/security">Security &amp; Disclosure policy</Link>.
      </p>
    </>
  );
}
