import type { Metadata } from "next";
import { SplitHeading } from "@/components/section";
import { Stagger, Item } from "@/components/motion";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the EduSentinel AI team — partnerships, collaboration, early access, and security reports.",
};

const channels = [
  {
    title: "General & Partnerships",
    body: "Product questions, early access, collaboration proposals, and media.",
    email: "hello@edusentinel.ai",
  },
  {
    title: "Security Reports",
    body: "Found a vulnerability? Please use responsible disclosure — see our Security & Disclosure policy for scope and process.",
    email: "security@edusentinel.ai",
  },
];

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-32 pt-20 md:px-10">
      <div className="pt-16 md:pt-24">
        <SplitHeading
          title="A small team that reads everything."
          aside="Email is the fastest way to reach us — an in-platform contact form arrives with our next release."
        />
      </div>
      <Stagger className="mt-16 grid gap-5 md:grid-cols-2">
        {channels.map((c) => (
          <Item key={c.title} className="h-full">
            <div className="flex h-full flex-col rounded-card border border-border-subtle bg-surface-raised p-8 md:p-10">
              <h2 className="text-xl font-semibold tracking-tight">{c.title}</h2>
              <p className="mt-4 flex-1 leading-relaxed text-text-secondary">
                {c.body}
              </p>
              <a
                href={`mailto:${c.email}`}
                className="mt-10 inline-flex h-11 w-fit items-center rounded-control bg-ink px-5 text-sm font-medium text-surface-raised transition-colors hover:bg-ink-hover"
              >
                {c.email}
              </a>
            </div>
          </Item>
        ))}
      </Stagger>
    </main>
  );
}
