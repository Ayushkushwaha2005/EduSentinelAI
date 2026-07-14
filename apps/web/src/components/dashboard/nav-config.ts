import type { Capability } from "@/lib/permissions";

/*
 * The sidebar is generated from the viewer's effective capabilities: an item
 * they cannot use is never rendered. This is a UX convenience ONLY — the page
 * behind every href re-checks server-side via lib/guard.ts. Never treat this
 * file as an access-control boundary.
 */
export type NavChild = { label: string; href: string; cap?: Capability };
export type NavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  cap?: Capability; // undefined = visible to every signed-in user
  founderOnly?: boolean;
  children?: NavChild[];
};

export type NavIcon =
  | "grid"
  | "user"
  | "users"
  | "box"
  | "server"
  | "clipboard"
  | "report"
  | "shield"
  | "key"
  | "chat"
  | "calendar"
  | "bell";

export const NAV: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: "grid" },
  {
    label: "Products",
    href: "/app/products",
    icon: "box",
    cap: "products.view",
    children: [
      { label: "All Products", href: "/app/products", cap: "products.view" },
      { label: "Add Product", href: "/app/products#new", cap: "products.manage" },
    ],
  },
  {
    label: "Releases",
    href: "/app/admin/releases",
    icon: "server",
    cap: "releases.review",
    children: [
      { label: "Review Queue", href: "/app/admin/releases", cap: "releases.review" },
      // Uploading happens against a product, so it lives on the product console.
      { label: "Upload", href: "/app/products", cap: "releases.upload" },
    ],
  },
  {
    label: "Teams",
    href: "/app/teams",
    icon: "users",
    cap: "team.view",
    children: [
      { label: "Teams List", href: "/app/teams", cap: "team.view" },
      { label: "Add Team", href: "/app/teams#new", cap: "team.manage" },
    ],
  },
  {
    label: "People",
    href: "/app/people",
    icon: "user",
    cap: "users.view",
    children: [
      { label: "Directory", href: "/app/people", cap: "users.view" },
      // Assigning roles/permissions stays founder-reserved — the directory is
      // read-only, so this child simply points at the one place that can.
      { label: "Access Control", href: "/app/access", cap: "permissions.grant" },
    ],
  },
  { label: "Tasks", href: "/app/tasks", icon: "clipboard" },
  // Phase 8. No capability on the parent items: your own attendance, your own
  // leave and the company calendar belong to everyone who works here. The
  // management surfaces INSIDE them (the team's day, the approval queue, editing
  // holidays) are capability-gated in lib/hr.ts and re-checked in every action.
  { label: "Attendance", href: "/app/attendance", icon: "clipboard" },
  { label: "Leave", href: "/app/leave", icon: "calendar" },
  { label: "Calendar", href: "/app/calendar", icon: "calendar" },
  // Phase 9. Anyone who can sign in can ask for help — including a collaborator.
  // The staff queue inside is gated on `support.respond` in lib/support.ts, which
  // returns an empty list to anyone else rather than relying on the page to hide it.
  { label: "Support", href: "/app/support", icon: "chat" },
  { label: "Notifications", href: "/app/notifications", icon: "bell" },
  // Grantable on its own: the Founder can hand someone the numbers without also
  // handing them the account directory.
  { label: "Analytics", href: "/app/analytics", icon: "report", cap: "analytics.read" },
  {
    label: "Collaboration",
    href: "/app/collaborations",
    icon: "chat",
    // collab.MANAGE, not collab.view: `collab.view` is the collaborator's own
    // permission to see their own thread. It must never open the staff console.
    cap: "collab.manage",
    children: [
      { label: "Collaborations", href: "/app/collaborations", cap: "collab.manage" },
      { label: "Request inbox", href: "/app/admin/collaborations", cap: "collab.moderate" },
    ],
  },
  // The org chart and the company's identity. Both capabilities are
  // founder-reserved, so these never render for anyone else — and the pages behind
  // them refuse anyway (lib/guard.ts), because the sidebar is not the boundary.
  {
    label: "Organization",
    href: "/app/organization",
    icon: "users",
    cap: "org.manage",
    children: [
      { label: "Org chart", href: "/app/organization", cap: "org.manage" },
      { label: "Company profile", href: "/app/company", cap: "company.manage" },
    ],
  },
  { label: "Messages", href: "/app/messages", icon: "chat", cap: "messages.use" },
  { label: "Audit", href: "/app/audit", icon: "report", cap: "audit.read" },
  {
    label: "Access Control",
    href: "/app/access",
    icon: "key",
    cap: "permissions.grant",
    founderOnly: true,
    children: [
      { label: "People", href: "/app/access" },
      { label: "Permissions", href: "/app/access#permissions" },
    ],
  },
  // No capability: managing your own identity is not a privilege the Founder
  // grants, it is what having an account means. Every role sees these two.
  { label: "Profile", href: "/app/profile", icon: "user" },
  { label: "Security", href: "/app/security", icon: "shield" },
];

/** Filter the nav down to what this viewer may actually use. */
export function navFor(caps: Set<string>, role: string): NavItem[] {
  const allowed = (cap?: Capability, founderOnly?: boolean) => {
    if (founderOnly && role !== "FOUNDER") return false;
    return !cap || caps.has(cap);
  };

  return NAV.filter((item) => allowed(item.cap, item.founderOnly)).map((item) => ({
    ...item,
    children: item.children?.filter((c) => allowed(c.cap)),
  }));
}
