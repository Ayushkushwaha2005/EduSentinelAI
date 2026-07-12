import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
import { signupAction } from "../actions";
import { issueFormToken } from "@/lib/bot-defense";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your EduSentinel AI account.",
  robots: { index: false },
};

export const dynamic = "force-dynamic"; // form tokens are per-request

export default function SignupPage() {
  return (
    <AuthForm mode="signup" action={signupAction} formToken={issueFormToken()} />
  );
}
