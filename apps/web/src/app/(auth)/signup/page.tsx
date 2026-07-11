import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
import { signupAction } from "../actions";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your EduSentinel AI account.",
  robots: { index: false },
};

export default function SignupPage() {
  return <AuthForm mode="signup" action={signupAction} />;
}
