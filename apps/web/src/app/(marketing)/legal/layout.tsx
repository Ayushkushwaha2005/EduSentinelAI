export default function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-36 md:pt-44">
      <div className="[&_h1]:text-4xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-text-secondary [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:text-text-secondary">
        {children}
      </div>
    </main>
  );
}
