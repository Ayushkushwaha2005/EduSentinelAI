import type { Metadata } from "next";
import { AuthForm } from "../auth-form";
import { loginAction } from "../actions";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your EduSentinel AI account.",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next, reset } = await searchParams;
  return <AuthForm mode="login" action={loginAction} next={next} reset={reset === "1"} />;
}
