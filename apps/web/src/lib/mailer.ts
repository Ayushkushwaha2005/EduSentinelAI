/*
 * `sendMail` USED TO LIVE HERE, AND IS DELETED ON PURPOSE.
 *
 * It was the Phase 2.1 sender: with no RESEND_API_KEY it console.logged and
 * returned normally, and on a provider rejection it console.errored and returned
 * normally. Nothing was ever recorded, so a message that did not leave the
 * building was indistinguishable from one that did — including the R7b founder
 * security alerts, which were its last remaining caller.
 *
 * Every message the platform sends now goes through `lib/mail.ts`, which writes
 * a MailLog row for every attempt, fails loudly in production when no provider
 * is configured, and surfaces failures in Access Control. This file is left with
 * `appUrl` alone so nothing can reach for the quiet path again.
 */

export function appUrl(path: string) {
  return `${process.env.APP_URL ?? "http://localhost:3000"}${path}`;
}
