import type { Metadata } from "next";
import { CenterHeading } from "@/components/section";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/button";
import { PricingCards } from "@/components/pricing-cards";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Indicative early-access pricing for the EduSentinel AI platform.",
};

export default function PricingPage() {
  return (
    <main className="relative overflow-hidden pt-[72px]">
      {/* warm radial glow, reference treatment */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(13,148,136,0.08),transparent)]"
      />
      <div className="relative mx-auto max-w-[1360px] px-6 pb-32 pt-16 md:px-10 md:pt-24">
        <CenterHeading
          title="Pricing"
          lead={
            <>
              Indicative early-access pricing — final plans will be announced
              with our first product launch. Looking for enterprise options?
              Email hello@edusentinel.ai
            </>
          }
        />
        <Reveal className="mt-8 flex justify-center">
          <Button href="/contact">Contact sales</Button>
        </Reveal>

        <div className="mt-14">
          <PricingCards />
        </div>

        <Reveal className="mt-24 flex flex-col items-center gap-6 text-center">
          <p className="text-[17px] text-text-secondary">
            Need more capabilities for your organization?
          </p>
          <Button href="/contact">Contact us for a demo</Button>
        </Reveal>
      </div>
    </main>
  );
}
