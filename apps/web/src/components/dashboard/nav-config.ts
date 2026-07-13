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
  | "chat";

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
  { label: "Tasks", href: "/app/tasks", icon: "clipboard" },
  {
    label: "Collaboration",
    href: "/app/admin/collaborations",
    icon: "chat",
    cap: "collab.moderate",
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
