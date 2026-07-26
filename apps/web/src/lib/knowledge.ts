import type { Capability } from "./permissions";

/*
 * THE KNOWLEDGE CENTER — the portal explaining itself.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO DECISIONS THAT MAKE THIS SAFE AND MAINTAINABLE.
 *
 * 1. ARTICLES ARE TAGGED BY CAPABILITY, NOT BY ROLE.
 *
 *    `requires: "releases.review"` rather than `roles: ["ADMIN", "FOUNDER"]`.
 *    This matters because capabilities are grantable per person: the moment the
 *    Founder delegates release review to someone, that person's guide grows to
 *    match, with no content edit and no chance of the docs claiming they can do
 *    something the authorization layer refuses. Role-keyed docs drift the day
 *    the first grant is made.
 *
 *    An article with no `requires` is for everyone with an account.
 *
 * 2. IT IS STATIC PROSE. IT HOLDS NO DATA.
 *
 *    Every article is a literal string in this file — PR-reviewed, diffable,
 *    and structurally incapable of leaking a record, because there is nothing
 *    here to interpolate one into. `npm run check:knowledge` fails the build if
 *    an article ever gains a template expression or this module imports a data
 *    layer.
 *
 *    So: no customer names, no revenue, no roadmap, no security specifics
 *    beyond what is already public in /legal/security, no founder-only
 *    information. It explains how to USE the portal.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Article = {
  slug: string;
  title: string;
  summary: string;
  /** Absent = everyone with an account. */
  requires?: Capability;
  section: "Getting started" | "Your work" | "People" | "Products" | "Policies";
  /** Plain paragraphs. Rendered as text, never as HTML or MDX. */
  body: string[];
  /** Real in-portal destinations this article talks about. */
  links?: { label: string; href: string }[];
};

export const ARTICLES: Article[] = [
  /* ---------------------------------------------------- getting started --- */
  {
    slug: "what-this-portal-is",
    title: "What this workspace is",
    summary: "One account, one sign-in, and a dashboard that adapts to what you do.",
    section: "Getting started",
    body: [
      "EduSentinel has one website and one sign-in. There is no separate admin portal — everyone lands at the same place and the workspace adapts to who they are. What you can see and do is decided by your role plus any specific permissions the Founder has granted you individually.",
      "That is why two people can open the same page and see different things. It is not a bug: the page asks the authorization layer what you may do, every time, on the server. Hiding a button is never the protection — the check behind it is.",
      "If a section is missing from your sidebar, you do not currently have the permission it needs. Ask the Founder; permissions are granted per person, so you can be given exactly one thing without being made an administrator.",
    ],
    links: [{ label: "Your dashboard", href: "/app" }],
  },
  {
    slug: "finding-your-way",
    title: "Finding your way around",
    summary: "The rail, the search box, and what the dashboard is telling you.",
    section: "Getting started",
    body: [
      "The icon rail on the left is the whole navigation. Hover any icon for its name. The dot beside an icon marks the section you are in.",
      "The search box at the top searches the workspace, and results are scoped to what you are allowed to see — it is never a global index. Searching for something you have no access to returns nothing, which is the same answer you would get if it did not exist.",
      "Every figure on the dashboard is read from the database at the moment you load it. Nothing on it is a placeholder. Where a number cannot be measured yet, the interface says so rather than showing a zero, because a zero looks like a measurement.",
    ],
    links: [
      { label: "Search", href: "/app/search" },
      { label: "Notifications", href: "/app/notifications" },
    ],
  },
  {
    slug: "profile-and-settings",
    title: "Profile and Settings",
    summary: "Who you are, versus how your account behaves.",
    section: "Getting started",
    body: [
      "Your profile holds your photo, name, contact details, designation and bio. Changing it updates you everywhere in the portal — the directory, your team's pages, the message center and the workspace header all read that one record, so there is no second copy to keep in step.",
      "Settings holds everything else: your password, two-factor authentication, notification preferences, appearance and privacy.",
      "You cannot change your own role or permissions from either page, and there is deliberately no link that would let you. Privilege is granted in Access Control by the Founder. A profile page that can also elevate you is a second, weaker path into the same decision.",
      "Photos you upload have their metadata removed before they are stored. A photo taken on a phone usually carries the coordinates of where it was taken; that does not belong in a staff directory.",
    ],
    links: [
      { label: "Your profile", href: "/app/profile" },
      { label: "Settings", href: "/app/settings" },
      { label: "Two-factor & sessions", href: "/app/security" },
    ],
  },
  {
    slug: "two-factor",
    title: "Two-factor authentication",
    summary: "Why privileged accounts are required to enrol.",
    section: "Getting started",
    body: [
      "Two-factor authentication uses an authenticator app on your phone. You scan a code once, and afterwards signing in asks for a six-digit number as well as your password.",
      "For privileged roles it is mandatory, not encouraged. If your role holds authority over other people's access or over what the company publishes, signing in takes you straight to enrolment and the rest of the workspace stays closed until it is done. That is the system working, not an error.",
      "Changing your password ends every other session you have open, everywhere. That is deliberate: if you are changing it because you think someone else has it, ending their session is the entire point.",
    ],
    links: [{ label: "Two-factor & sessions", href: "/app/security" }],
  },

  /* --------------------------------------------------------- your work --- */
  {
    slug: "attendance-and-leave",
    title: "Attendance and leave",
    summary: "How time off is requested, decided and recorded.",
    section: "Your work",
    body: [
      "You request leave; someone in your approver chain decides it. Nobody decides their own leave, and nobody applies their own attendance correction — a correction is requested and approved, never applied silently.",
      "Weekends and company holidays are not charged against your balance. Days on a pending request are held while it waits, so two overlapping requests cannot quietly overdraw you, and a balance can never go negative.",
      "The reason you give for leave is private. It reaches you and your approver chain, and nobody else — not the wider HR view, not the team calendar, and not the audit log. It is the field most likely to contain a medical fact, so it is redacted in the query layer rather than hidden in a component.",
      "Approving leave writes the attendance days automatically. Cancelling it releases them again.",
    ],
    links: [
      { label: "Leave", href: "/app/leave" },
      { label: "Attendance", href: "/app/attendance" },
    ],
  },
  {
    slug: "the-calendar",
    title: "The workspace calendar",
    summary: "What appears on it, and who can see what you add.",
    section: "Your work",
    body: [
      "The calendar brings together several things: company holidays, who is away, published releases, task deadlines, and events people create — meetings, deadlines, sessions, reminders and bookmarks.",
      "When you create an event you choose who can see it. Personal means you and anyone you invite. Team means the team you pick, and you have to be in it. Company means everyone on staff, which needs the calendar permission — an event on every colleague's calendar is not something to do casually.",
      "Leave appears on the shared calendar as 'away' and nothing more. No reason, and no leave type. Printing a leave type against someone's name on a calendar the whole company can see is a disclosure about their health.",
      "Holidays are never charged to anyone's balance.",
    ],
    links: [{ label: "Calendar", href: "/app/calendar" }],
  },
  {
    slug: "tasks-and-teams",
    title: "Tasks and teams",
    summary: "Where work is assigned and tracked.",
    section: "Your work",
    body: [
      "Tasks belong to a project, and projects belong to a team. Your dashboard shows the work assigned to you; the teams pages show how it fits together.",
      "A task with a due date appears on the calendar automatically. You do not create a second calendar entry for it — it is projected from the task itself, so it can never disagree with the task's real state.",
    ],
    links: [
      { label: "Tasks", href: "/app/tasks" },
      { label: "Teams", href: "/app/teams" },
    ],
  },
  {
    slug: "support-and-messages",
    title: "Support and messages",
    summary: "Who can see a conversation.",
    section: "Your work",
    body: [
      "Support requests are scoped to the people involved: whoever raised it, and whoever answers support. Asking for a request you are not part of returns nothing at all — the same answer as one that does not exist.",
      "Internal notes on a request are filtered out before the payload ever reaches the person who raised it. They are not hidden in the interface; they are simply not sent.",
      "Attachments are checked by their actual content rather than their filename, and are limited to images, PDFs and archives. SVG files are refused: an SVG is a script, and the person opening it is a colleague.",
    ],
    links: [
      { label: "Support", href: "/app/support" },
      { label: "Messages", href: "/app/messages" },
    ],
  },

  /* ------------------------------------------------------------ people --- */
  {
    slug: "directory",
    title: "The people directory",
    summary: "Who is listed, and what presence means.",
    section: "People",
    requires: "users.view",
    body: [
      "The directory lists accounts with their role, team and whether two-factor is enabled.",
      "The 'online' marker is measured, not decorative — it means the person has actually been seen in the last few minutes. An interface that claims your colleagues are at their desks when they have not signed in for a month is worse than one that says nothing.",
    ],
    links: [{ label: "People", href: "/app/people" }],
  },
  {
    slug: "inviting-people",
    title: "Inviting someone",
    summary: "What an invitation can and cannot do.",
    section: "People",
    requires: "people.invite",
    body: [
      "An invitation is a link in an email, so it is treated as one of the most sensitive things the platform sends. It is single-use, it expires, and the token is stored only as a hash — the original never sits in the database.",
      "You cannot invite a peer or anyone above you, and the two most senior roles cannot be invited by anybody. You also cannot attach permissions to an invitation: attaching capabilities is itself a founder-reserved action.",
      "The role and email come from the invitation record when it is accepted, never from the form the new person fills in. It is the one place an unauthenticated request results in an account above the base role, so nothing about it is taken on trust from the browser.",
      "Access can be granted temporarily. A grant with an expiry actually expires — temporary access that quietly becomes permanent is how a company stops knowing who can do what.",
    ],
    links: [{ label: "Access Control", href: "/app/access" }],
  },
  {
    slug: "roles-and-permissions",
    title: "Roles and permissions",
    summary: "Why some things cannot be delegated at all.",
    section: "People",
    body: [
      "Your role sets your starting capabilities. The Founder can then grant or revoke individual capabilities per person, so someone can be given exactly one responsibility without being made an administrator.",
      "A small set of capabilities is reserved to the Founder and cannot be delegated to anyone, by any means: signing and revoking releases, deleting a product, changing roles, granting permissions, editing the org chart and company profile, and ending someone's access. These are stripped in code on every single check, so no record in the permissions table — however it got there — can grant them.",
      "This is why a Co-Founder can exercise almost the entire portal for review and testing, but cannot take an action that permanently changes what the public sees.",
    ],
    links: [{ label: "Access Control", href: "/app/access" }],
  },

  /* ---------------------------------------------------------- products --- */
  {
    slug: "catalogue",
    title: "The product catalogue",
    summary: "Products are records, not code.",
    section: "Products",
    requires: "products.view",
    body: [
      "Products live in the database, not in the source. Adding one needs no deployment: create it, fill it in, publish it, and the public site picks it up — the same catalogue feeds the products pages, the home grid and the sitemap.",
      "The lifecycle is draft, published, archived. Only published products are ever visible publicly.",
      "Because the catalogue renders on the public site, its content is treated as untrusted: icons are chosen from a fixed set rather than uploaded, text is sanitised when it is saved, and links are restricted to internal paths or https addresses.",
    ],
    links: [{ label: "Products", href: "/app/products" }],
  },
  {
    slug: "release-pipeline",
    title: "The release pipeline",
    summary: "Upload, quarantine, scan, sign, publish.",
    section: "Products",
    requires: "releases.review",
    body: [
      "An uploaded file goes into quarantine first. It is checked by its actual content rather than its claimed type, scanned, and only then can it be considered for publication.",
      "Publishing means signing: a cryptographic signature over the file's checksum, made with the Founder's key. That is what lets anyone who downloads it verify that what they received is what we published. Signing is reserved to the Founder and cannot be delegated.",
      "A published release can be revoked. When it is, it disappears from the download centre and a public incident notice appears in its place — quietly removing it would leave people running something we no longer stand behind.",
    ],
    links: [{ label: "Releases", href: "/app/admin/releases" }],
  },

  /* ---------------------------------------------------------- policies --- */
  {
    slug: "privacy-promises",
    title: "What we promise about data",
    summary: "The commitments that are enforced by the build, not by memory.",
    section: "Policies",
    body: [
      "There are no third-party trackers anywhere: not on the public site, not in this workspace, and not in our email. A tracking pixel in an email is a tracker, so our email is plain text with no images and no click-redirects. This is checked automatically on every build.",
      "Analytics are computed from our own records. There is no analytics SDK in this application. A metric that cannot be measured is reported as unmeasured rather than as zero.",
      "Security-relevant actions are written to an audit log that is chained, so that altering an old entry is detectable rather than silent.",
      "Records are not kept indefinitely. Attendance and leave are retained for a defined period and then purged.",
    ],
    links: [
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Security & disclosure", href: "/legal/security" },
    ],
  },
  {
    slug: "getting-help",
    title: "Getting help",
    summary: "Where to take a question, a bug, or a security concern.",
    section: "Policies",
    body: [
      "For anything about your own account or work, open a support request in the workspace. It reaches the people who answer support, and nobody else.",
      "If you think you have found a security vulnerability, use the responsible-disclosure form on the public security page rather than a support request. It goes straight to the security inbox.",
      "If a page shows you something that looks wrong — a number that cannot be right, a control that does nothing — please report it. A dashboard is only useful if it is trusted, and a wrong figure is worse than a missing one.",
    ],
    links: [
      { label: "Support", href: "/app/support" },
      { label: "Report a vulnerability", href: "/legal/security" },
    ],
  },
];

/** The articles this viewer may read, in section order. */
export function articlesFor(caps: Set<string>): Article[] {
  return ARTICLES.filter((a) => !a.requires || caps.has(a.requires));
}

export const SECTION_ORDER: Article["section"][] = [
  "Getting started",
  "Your work",
  "People",
  "Products",
  "Policies",
];

export function groupBySection(articles: Article[]) {
  return SECTION_ORDER.map((section) => ({
    section,
    articles: articles.filter((a) => a.section === section),
  })).filter((g) => g.articles.length > 0);
}
