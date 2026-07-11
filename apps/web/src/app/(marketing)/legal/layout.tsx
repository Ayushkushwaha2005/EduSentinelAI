export default function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-32 pt-36 md:pt-44">
      <div className="[&_h1]:text-balance [&_h1]:text-4xl [&_h1]:font-medium [&_h1]:leading-[1.1] [&_h1]:tracking-[-0.03em] md:[&_h1]:text-5xl [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_p]:mt-4 [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-text-secondary [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2.5 [&_ul]:pl-6 [&_ul]:text-[15px] [&_ul]:leading-relaxed [&_ul]:text-text-secondary">
        {children}
      </div>
    </main>
  );
}
