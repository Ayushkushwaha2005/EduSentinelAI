import type { Metadata } from "next";
import { ProductsSection } from "@/components/products";

export const metadata: Metadata = {
  title: "Products",
  description:
    "EduSentinel AI products — browser protection, mobile security, AI planning tools, sustainability analytics, and the upcoming SentinelAI Agent.",
};

export default function ProductsPage() {
  return (
    <main className="pt-20">
      <div className="pt-16 md:pt-24">
        <ProductsSection />
      </div>
    </main>
  );
}
