/*
 * The organisation's official email addresses (Phase 10, Task 12).
 *
 * ONE PLACE. Before this file, `hello@edusentinel.ai` and
 * `security@edusentinel.ai` were typed by hand into eight components and three
 * MDX documents, and the mail sender's From: address was a default buried in a
 * `??` expression in two different modules. Changing where security reports go
 * meant finding eleven files and hoping.
 *
 * Everything that names an address now imports it from here. `check:emails`
 * (scripts/check-emails.mjs) fails the build if a raw @edusentinel.ai address
 * reappears anywhere in src/, so this cannot quietly stop being the only place.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ CONFIRMATION STATUS — READ BEFORE ADDING AN ALIAS
 *
 * The domain is confirmed. The individual local-parts are NOT all confirmed
 * against Google Workspace, and an alias that does not exist there does not
 * bounce visibly — it fails at the recipient's end, silently, which is the worst
 * possible failure mode for `security@`.
 *
 *   CONFIRMED (live in production before this change, on the deployed site):
 *     hello@ · security@
 *
 *   ASSUMED (conventional local-parts, pending confirmation from the Workspace
 *   admin — verify each one exists as a mailbox or alias before relying on it):
 *     founder@ · contact@ · support@ · careers@ · billing@ · admin@ · team@
 *     press@ · legal@ · info@ · notifications@ · no-reply@
 *
 * If a name below is wrong, change it HERE and nowhere else.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const ORG_DOMAIN = "edusentinel.ai";

const at = (local: string) => `${local}@${ORG_DOMAIN}`;

export const ORG_EMAIL = {
  /** Confirmed. General enquiries, partnerships, press-adjacent, media. */
  hello: at("hello"),
  /** Confirmed. Responsible disclosure. Published in the security policy. */
  security: at("security"),

  /* --- assumed; see the confirmation note above --- */
  founder: at("founder"),
  contact: at("contact"),
  support: at("support"),
  careers: at("careers"),
  billing: at("billing"),
  admin: at("admin"),
  team: at("team"),
  press: at("press"),
  legal: at("legal"),
  info: at("info"),
  /** Where automated platform mail is delivered TO, if it is delivered at all. */
  notifications: at("notifications"),
  /** The From: address on outbound transactional mail. Never receives. */
  noReply: at("no-reply"),
} as const;

export type OrgEmailKey = keyof typeof ORG_EMAIL;

/**
 * The From: header on everything the platform sends.
 *
 * MAIL_FROM overrides it, because the address you are allowed to send as is a
 * property of the deployment's verified sending domain, not of the source code —
 * a preview deployment on a different domain must be able to differ without a
 * commit.
 */
export function mailFrom(): string {
  return process.env.MAIL_FROM ?? `EduSentinel AI <${ORG_EMAIL.noReply}>`;
}

/**
 * Where a public submission of each kind should land.
 *
 * Kept as a function rather than a constant so the routing decision has one
 * obvious home: if security reports should ever go somewhere other than
 * `security@`, this is the line that changes.
 */
export function inboxFor(kind: "contact" | "security" | "collaboration" | "abuse"): string {
  switch (kind) {
    case "security":
      // Vulnerability reports. Deliberately NOT the general inbox — a disclosure
      // sitting unread in a shared mailbox is how a 90-day window gets missed.
      return ORG_EMAIL.security;
    case "abuse":
      // Abuse reports are a safety matter and go to the same people as security.
      return ORG_EMAIL.security;
    case "collaboration":
    case "contact":
    default:
      return ORG_EMAIL.hello;
  }
}
