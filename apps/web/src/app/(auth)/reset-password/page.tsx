import type { Metadata } from "next";
import { ResetForm } from "./form";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetForm token={token ?? ""} />;
}
