import type { Metadata } from "next";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/button";
import { PricingHero } from "@/components/pricing-hero";
import { PricingCards } from "@/components/pricing-cards";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple pricing for the EduSentinel AI ecosystem — start free, upgrade as products launch.",
};

export default function PricingPage() {
  return (
    <main className="relative overflow-hidden pt-20">
      {/* warm radial glow behind the hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[64rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(13,148,136,0.09),transparent)]"
      />
      <div className="relative mx-auto max-w-[1360px] px-6 pb-32 pt-16 md:px-10 md:pt-24">
        <PricingHero />

        <div className="mt-16 md:mt-20">
          <PricingCards />
        </div>

        <Reveal className="mt-16 text-center">
          <p className="text-sm text-text-muted">
            Indicative early-access pricing — final plans will be announced
            with our first product launch. Enterprise questions:
            hello@edusentinel.ai
          </p>
        </Reveal>

        <Reveal className="mt-20 flex flex-col items-center gap-6 text-center">
          <p className="text-[17px] text-text-secondary">
            Need more capabilities for your college or organization?
          </p>
          <Button href="/contact">Contact us for a demo</Button>
        </Reveal>
      </div>
    </main>
  );
}
