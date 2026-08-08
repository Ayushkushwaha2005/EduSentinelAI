import type { Metadata } from "next";
import { ProductsSection } from "@/components/products";

export const metadata: Metadata = {
  title: "Products",
  description:
    "The EduSentinel AI ecosystem, organised by problem space — cybersecurity first, then AI productivity, education, developer platform, events and climate. Browser protection, mobile security, AI planning tools, sustainability analytics and the upcoming SentinelAI Agent, all on one account.",
};

export default function ProductsPage() {
  return (
    <main className="pt-20" data-accent="violet">
      <div className="pt-16 md:pt-24">
        <ProductsSection />
      </div>
    </main>
  );
}
