import type { Metadata } from "next";
import Link from "next/link";
import { SplitHeading } from "@/components/section";
import { Reveal } from "@/components/motion";
import { issueFormToken } from "@/lib/bot-defense";
import { CollaborationForm, AbuseReportForm } from "./forms";

export const metadata: Metadata = {
  title: "Collaborate",
  description:
    "Partner with EduSentinel AI — partnerships, contributions, and research collaboration.",
};

export const dynamic = "force-dynamic"; // form tokens are per-request

export default function CollaboratePage() {
  const token = issueFormToken();

  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-32 pt-20 md:px-10">
      <div className="pt-16 md:pt-24">
        <SplitHeading
          title="Build with us."
          aside="Partnerships, contributions, and research collaboration. Every submission is read by a person and answered."
        />
      </div>

      <div className="mt-16 grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        <Reveal>
          <div className="rounded-card border border-border-subtle bg-surface-raised p-8 md:p-10">
            <CollaborationForm token={token} />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Before you write</h2>
              <p className="mt-3 leading-relaxed text-text-secondary">
                Please read our{" "}
                <Link href="/legal/community" className="text-brand-teal underline underline-offset-4">
                  Community Guidelines
                </Link>
                . They are short, and they describe what we expect from
                collaborators — and what you can expect from us.
              </p>
              <p className="mt-4 leading-relaxed text-text-secondary">
                Reporting a security vulnerability? Use our{" "}
                <Link href="/legal/security" className="text-brand-teal underline underline-offset-4">
                  responsible disclosure process
                </Link>{" "}
                instead — it reaches us faster.
              </p>
            </div>

            <div id="report" className="rounded-card border border-border-subtle bg-surface-raised/50 p-7">
              <h2 className="text-lg font-semibold tracking-tight">Report abuse</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
                Seen something that breaks our guidelines — spam, harassment,
                or a release that looks wrong? Tell us.
              </p>
              <div className="mt-5">
                <AbuseReportForm token={token} />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
