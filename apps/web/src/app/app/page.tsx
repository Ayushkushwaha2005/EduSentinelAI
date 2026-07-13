import { requireViewer } from "@/lib/guard";
import LeadershipDashboard from "./dashboards/leadership";
import EmployeeDashboard from "./dashboards/employee";
import CollaboratorDashboard from "./dashboards/collaborator";
import MemberDashboard from "./dashboards/member";

/*
 * One entry point for every signed-in user. The same /login leads here; the
 * role on the session decides which dashboard renders. This dispatch is
 * exhaustive over the role ladder — a new role must be handled explicitly
 * rather than falling through to a privileged view.
 */
export default async function AppDashboard() {
  const viewer = await requireViewer();

  switch (viewer.role) {
    case "FOUNDER":
    case "CO_FOUNDER":
    case "ADMIN":
      return <LeadershipDashboard viewer={viewer} />;
    case "EMPLOYEE":
      return <EmployeeDashboard viewer={viewer} />;
    case "COLLABORATOR":
      return <CollaboratorDashboard viewer={viewer} />;
    case "USER":
      return <MemberDashboard viewer={viewer} />;
    default:
      // Unknown role = least privilege, never leadership.
      return <MemberDashboard viewer={viewer} />;
  }
}
