/*
 * DEMO FOUNDER MODE — the entire dataset (Task 16).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ THIS FILE, AND EVERYTHING UNDER src/lib/demo AND src/app/demo, MUST NEVER
 *   IMPORT `@/lib/db`, `@prisma/client`, OR ANY SERVER ACTION.
 *
 *   That is the whole isolation guarantee, and it is structural rather than
 *   procedural: the demo cannot write to the production database because it has
 *   no way to reach it. There is no connection to misconfigure, no session to
 *   leak, no `where` clause to get wrong. `npm run check:demo` fails the build
 *   if any import ever appears.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Everything below is invented. The names are fictional, the numbers are made
 * up, and none of it corresponds to a real EduSentinel person, customer or
 * release. It is deliberately plausible rather than obviously fake, because a
 * demo full of "Lorem Ipsum" and "User 1" teaches a visitor nothing about what
 * the product actually feels like to operate — but nothing here should ever be
 * mistaken for a production record either, which is why the shell carries a
 * permanent Demo Mode banner on every page.
 */

export type DemoPerson = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  team: string | null;
  title: string | null;
  online: boolean;
  mfaEnabled: boolean;
  joined: string;
};

export type DemoProduct = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  owner: string;
  releases: number;
  updated: string;
};

export type DemoRelease = {
  id: string;
  product: string;
  version: string;
  status: "PUBLISHED" | "QUARANTINED" | "REVOKED";
  scan: "CLEAN" | "PENDING" | "FLAGGED";
  size: string;
  published: string;
};

export type DemoInvitation = {
  id: string;
  email: string;
  roleLabel: string;
  invitedBy: string;
  sent: string;
  expires: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
};

export type DemoNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  kind: "release" | "people" | "support" | "security";
};

export type DemoAuditEntry = {
  id: string;
  action: string;
  actor: string;
  time: string;
};

/* ---------------------------------------------------------------- people --- */

export const DEMO_PEOPLE: DemoPerson[] = [
  { id: "d1", name: "Amara Osei", email: "amara.osei@demo.example", role: "FOUNDER", roleLabel: "Founder", team: "Leadership", title: "Founder", online: true, mfaEnabled: true, joined: "12 Jan 2025" },
  { id: "d2", name: "Rafael Lima", email: "rafael.lima@demo.example", role: "CO_FOUNDER", roleLabel: "Co-Founder", team: "Leadership", title: "Co-Founder & CTO", online: true, mfaEnabled: true, joined: "12 Jan 2025" },
  { id: "d3", name: "Priya Raghunathan", email: "priya.r@demo.example", role: "ADMIN", roleLabel: "Admin", team: "Platform", title: "Head of Platform", online: true, mfaEnabled: true, joined: "03 Mar 2025" },
  { id: "d4", name: "Tomas Nowak", email: "tomas.nowak@demo.example", role: "EMPLOYEE", roleLabel: "Employee", team: "Security", title: "Security Engineer", online: false, mfaEnabled: true, joined: "19 Apr 2025" },
  { id: "d5", name: "Hana Kimura", email: "hana.kimura@demo.example", role: "EMPLOYEE", roleLabel: "Employee", team: "Design", title: "Product Designer", online: true, mfaEnabled: false, joined: "02 Jun 2025" },
  { id: "d6", name: "Dele Adeyemi", email: "dele.adeyemi@demo.example", role: "EMPLOYEE", roleLabel: "Employee", team: "Platform", title: "Backend Engineer", online: false, mfaEnabled: true, joined: "14 Jul 2025" },
  { id: "d7", name: "Sofia Marchetti", email: "sofia.m@demo.example", role: "EMPLOYEE", roleLabel: "Employee", team: "Research", title: "ML Researcher", online: false, mfaEnabled: true, joined: "28 Aug 2025" },
  { id: "d8", name: "Noor Haddad", email: "noor.haddad@partner.example", role: "COLLABORATOR", roleLabel: "Collaborator", team: null, title: "External Auditor", online: false, mfaEnabled: false, joined: "05 Oct 2025" },
];

export const DEMO_TEAMS = [
  { id: "t1", name: "Platform", memberCount: 3, members: ["Priya Raghunathan", "Dele Adeyemi", "Rafael Lima"], projects: [{ id: "p1", name: "Release signing v2", progress: 78 }, { id: "p2", name: "Audit chain export", progress: 42 }] },
  { id: "t2", name: "Security", memberCount: 2, members: ["Tomas Nowak", "Amara Osei"], projects: [{ id: "p3", name: "Threat feed ingestion", progress: 61 }] },
  { id: "t3", name: "Design", memberCount: 2, members: ["Hana Kimura", "Amara Osei"], projects: [{ id: "p4", name: "Workspace refresh", progress: 90 }, { id: "p5", name: "Agent illustrations", progress: 25 }] },
];

/* -------------------------------------------------------------- products --- */

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: "pr1", name: "Sentinel Browser Guard", slug: "browser-guard", summary: "Real-time page and link verification in the browser.", status: "PUBLISHED", owner: "Priya Raghunathan", releases: 12, updated: "2 days ago" },
  { id: "pr2", name: "Sentinel Mobile Shield", slug: "mobile-shield", summary: "Scam and phishing defence for Android and iOS.", status: "PUBLISHED", owner: "Dele Adeyemi", releases: 8, updated: "6 days ago" },
  { id: "pr3", name: "Sentinel Agent", slug: "sentinel-agent", summary: "The local-first assistant that explains its reasoning.", status: "DRAFT", owner: "Sofia Marchetti", releases: 3, updated: "yesterday" },
  { id: "pr4", name: "Sentinel Study Planner", slug: "study-planner", summary: "Privacy-first AI planning for students.", status: "PUBLISHED", owner: "Hana Kimura", releases: 5, updated: "3 weeks ago" },
  { id: "pr5", name: "Sentinel Vault (legacy)", slug: "vault-legacy", summary: "Superseded by Browser Guard credential storage.", status: "ARCHIVED", owner: "Rafael Lima", releases: 21, updated: "8 months ago" },
];

export const DEMO_RELEASES: DemoRelease[] = [
  { id: "r1", product: "Sentinel Browser Guard", version: "2.4.1", status: "PUBLISHED", scan: "CLEAN", size: "4.2 MB", published: "2 days ago" },
  { id: "r2", product: "Sentinel Mobile Shield", version: "1.9.0", status: "PUBLISHED", scan: "CLEAN", size: "18.7 MB", published: "6 days ago" },
  { id: "r3", product: "Sentinel Agent", version: "0.4.0-beta", status: "QUARANTINED", scan: "PENDING", size: "31.4 MB", published: "—" },
  { id: "r4", product: "Sentinel Study Planner", version: "1.2.3", status: "PUBLISHED", scan: "CLEAN", size: "6.9 MB", published: "3 weeks ago" },
  { id: "r5", product: "Sentinel Vault (legacy)", version: "3.0.2", status: "REVOKED", scan: "FLAGGED", size: "12.1 MB", published: "8 months ago" },
];

/* ----------------------------------------------------------- invitations --- */

export const DEMO_INVITATIONS: DemoInvitation[] = [
  { id: "i1", email: "jonas.weber@demo.example", roleLabel: "Employee", invitedBy: "Amara Osei", sent: "3 days ago", expires: "in 4 days", status: "PENDING" },
  { id: "i2", email: "lena.fischer@demo.example", roleLabel: "Employee", invitedBy: "Rafael Lima", sent: "1 week ago", expires: "expired", status: "EXPIRED" },
  { id: "i3", email: "kofi.mensah@partner.example", roleLabel: "Collaborator", invitedBy: "Amara Osei", sent: "2 weeks ago", expires: "—", status: "ACCEPTED" },
];

/* --------------------------------------------------------- notifications --- */

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  { id: "n1", title: "Release awaiting signature", body: "Sentinel Agent 0.4.0-beta finished scanning and is ready to sign.", time: "09:14", unread: true, kind: "release" },
  { id: "n2", title: "New support request", body: "A collaborator opened a request about download verification.", time: "08:47", unread: true, kind: "support" },
  { id: "n3", title: "Invitation accepted", body: "Kofi Mensah accepted their collaborator invitation.", time: "Yesterday", unread: false, kind: "people" },
  { id: "n4", title: "Two-factor enrolled", body: "Dele Adeyemi completed authenticator enrolment.", time: "Yesterday", unread: false, kind: "security" },
  { id: "n5", title: "Leave request awaiting decision", body: "One request is waiting for an approver.", time: "Mon", unread: false, kind: "people" },
];

/* ---------------------------------------------------------------- audit --- */

export const DEMO_AUDIT: DemoAuditEntry[] = [
  { id: "a1", action: "release.signed", actor: "amara.osei@demo.example", time: "09:20" },
  { id: "a2", action: "permission.granted", actor: "amara.osei@demo.example", time: "09:02" },
  { id: "a3", action: "product.published", actor: "priya.r@demo.example", time: "08:31" },
  { id: "a4", action: "user.invited", actor: "rafael.lima@demo.example", time: "Yesterday" },
  { id: "a5", action: "release.revoked", actor: "amara.osei@demo.example", time: "Yesterday" },
];

/* ------------------------------------------------------------ analytics --- */

/** Thirty days of signups, shaped like a real curve rather than a straight line. */
export const DEMO_GROWTH: { label: string; value: number }[] = [
  14, 18, 17, 23, 26, 22, 19, 28, 31, 35, 33, 29, 38, 41, 44, 39, 47, 52, 49, 55,
  58, 54, 61, 66, 63, 71, 74, 69, 78, 84,
].map((value, i) => ({ label: `${i + 1}`, value }));

export const DEMO_ANALYTICS = {
  totalAccounts: 1284,
  activeThisWeek: 412,
  downloads30d: 8734,
  verifiedDownloads: 8721,
  supportOpen: 3,
  supportMedianHours: 4.2,
  breakdown: [
    { label: "Browser Guard", value: 4210, share: 48 },
    { label: "Mobile Shield", value: 2611, share: 30 },
    { label: "Study Planner", value: 1305, share: 15 },
    { label: "Agent (beta)", value: 608, share: 7 },
  ],
};

/* --------------------------------------------------------------- hr/ops --- */

export const DEMO_WORKFORCE = {
  staff: 7,
  present: 5,
  onLeave: 1,
  pendingRequests: 2,
  pendingFixes: 1,
};

/* ------------------------------------------------------------- settings --- */

export const DEMO_SETTINGS = {
  companyName: "EduSentinel AI (Demo)",
  tagline: "Privacy-First Technology Ecosystem",
  supportEmail: "support@demo.example",
  securityEmail: "security@demo.example",
  releaseSigning: true,
  requireMfaForPrivileged: true,
  auditRetentionMonths: 24,
  leaveRetentionMonths: 24,
};

/* Headline figures the overview hangs off — derived, so they can never drift
   from the tables underneath them. */
export const DEMO_STATS = {
  liveProducts: DEMO_PRODUCTS.filter((p) => p.status === "PUBLISHED").length,
  draftProducts: DEMO_PRODUCTS.filter((p) => p.status === "DRAFT").length,
  releases: DEMO_RELEASES.filter((r) => r.status === "PUBLISHED").length,
  staff: DEMO_PEOPLE.filter((p) => p.role !== "COLLABORATOR").length,
  online: DEMO_PEOPLE.filter((p) => p.online).length,
  openTasks: 6,
};

/** The identity the demo signs you in as. Fictional. */
export const DEMO_VIEWER = {
  name: "Amara Osei",
  email: "amara.osei@demo.example",
  role: "FOUNDER",
  roleLabel: "Founder",
};
