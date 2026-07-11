import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of the EduSentinel AI website and products.",
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p>
        <em>Draft v0.1 — last updated 11 July 2026. This document will be
        finalized with legal review before public launch.</em>
      </p>
      <h2>Use of this site</h2>
      <p>
        The EduSentinel AI website and its content are provided for
        information about our products and research. You may not attempt to
        disrupt the service, misrepresent affiliation with EduSentinel AI, or
        use our brand assets without permission.
      </p>
      <h2>Products and downloads</h2>
      <p>
        Software we publish is provided under the license accompanying each
        release. Unless that license states otherwise, software is provided
        “as is”, without warranty of any kind. Always verify published
        checksums and signatures before installing downloaded software.
      </p>
      <h2>Security research</h2>
      <p>
        Good-faith security research conducted under our Security &amp;
        Disclosure policy is welcome and will not be treated as a violation
        of these terms.
      </p>
      <h2>Changes</h2>
      <p>
        We may update these terms as the platform grows. Material changes
        will be dated and announced on this page.
      </p>
    </>
  );
}
