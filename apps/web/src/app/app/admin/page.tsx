import { redirect } from "next/navigation";

/*
 * The old admin console is gone. Roles and permissions are decided in one
 * place only — the Founder's Access Control surface (/app/access). Keeping a
 * second role-management path alive would be a second thing to get wrong.
 */
export default function AdminPage() {
  redirect("/app/access");
}
