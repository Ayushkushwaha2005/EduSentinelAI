import type { Metadata } from "next";
import { RequestResetForm } from "./form";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return <RequestResetForm />;
}
