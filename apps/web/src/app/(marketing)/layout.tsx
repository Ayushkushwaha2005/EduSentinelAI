import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Nav />
      {children}
      <Footer />
    </>
  );
}
