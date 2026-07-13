import { signOut } from "@/lib/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="rounded-control px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-[--duration-fast] hover:bg-surface-overlay hover:text-text-primary"
      >
        Sign out
      </button>
    </form>
  );
}
