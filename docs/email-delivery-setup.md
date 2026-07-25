# Email delivery — operational setup

**Status: the code is complete and deployed-ready. This document covers the steps
that happen OUTSIDE the repository.** Nothing here blocks a deploy; until it is
done, mail fails visibly rather than silently (see "What happens if you skip
this" below).

Everything described uses the provider this project already depends on
(**Resend**, present since Phase 7). No new service, no paid tier required —
Resend's free allowance covers transactional volume at this stage.

---

## Why this is needed

The Google Workspace aliases (`hello@`, `security@`, …) **receive** mail. They do
not authorise anything to **send** as `@edusentinel.ai`. Sending requires the
domain to be verified with the sending provider and the matching DNS records to
be published — otherwise receiving servers will reject or spam-folder our mail
under SPF/DKIM/DMARC.

---

## Steps

### 1. Add the sending domain in Resend

Resend dashboard → **Domains** → **Add Domain** → `edusentinel.ai`.

Resend then shows a set of DNS records to publish.

### 2. Publish the DNS records

On whichever DNS provider hosts `edusentinel.ai`, add the records Resend gave
you. They will look like this — **use the exact values from your dashboard, not
these**:

| Type | Name | Purpose |
|------|------|---------|
| `TXT` | `resend._domainkey` | DKIM — cryptographically signs outbound mail |
| `TXT` | `send` (or apex) | SPF — authorises Resend to send for the domain |
| `MX` | `send` | Bounce/complaint handling |

If an SPF record already exists on the apex, **merge** rather than adding a
second one — a domain may publish only one SPF record, and two will fail both.

Optionally add a DMARC policy:

```
Type: TXT   Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:security@edusentinel.ai
```

Start at `p=none` (monitor only) and tighten to `quarantine` once the reports
look clean.

### 3. Wait for verification

Propagation is usually minutes, occasionally up to an hour. Resend marks the
domain **Verified** when it can see the records.

### 4. Set the environment variables in Vercel

Project → **Settings** → **Environment Variables**, for **Production** and
**Preview**:

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | `re_…` from Resend → API Keys (sending permission is enough) |
| `MAIL_FROM` | `EduSentinel AI <no-reply@edusentinel.ai>` |

`MAIL_FROM` **must** be on the verified domain. It is the envelope sender only —
recipients reply to the address in `Reply-To`, which the application sets to the
person who submitted the form.

### 5. Redeploy

Environment variables are read at runtime, but a redeploy is the cleanest way to
be sure every function picks them up.

---

## Verifying it works

1. Submit the contact form at `/contact`. It should report success rather than
   the "we could not deliver your message" error.
2. Check `hello@edusentinel.ai` for the message, and confirm **Reply-To** is the
   address you typed into the form.
3. Sign in as the Founder → **Access Control**. The failed-mail panel reads from
   `MailLog`; it should show no new `FAILED` rows.
4. Send a real invitation. The recipient should receive it; the row in `MailLog`
   should read `SENT` rather than `FAILED` or `DEV_OUTBOX`.

---

## What happens if you skip this

Deliberate, and a change from previous behaviour (Phase 10, Task 11):

- **Before:** with no API key, `lib/mail.ts` wrote the message to
  `storage/outbox` and returned `{ ok: true }` — in production that is an
  ephemeral serverless filesystem nobody reads. The Founder was told an
  invitation had been sent when nothing had left the building.
- **Now:** in production, a missing `RESEND_API_KEY` is a hard, recorded failure.
  `MailLog` gets a `FAILED` row and the failure surfaces in Access Control.

Concretely, until this setup is done:

| Flow | Behaviour |
|------|-----------|
| Employee invitation | Invitation row **is still created**; the Founder sees "Invitation created, but the email could not be sent… Use Resend below." |
| Contact form | Shows an error and asks the visitor to email `hello@` directly. The message is *not* retained (no DB row — the schema is frozen). |
| Security report | Same, pointing at `security@`. The form warns the reporter explicitly so a disclosure is never silently lost. |
| Collaboration / abuse report | Row **is** written to the database as before; only the notification email fails. Nothing is lost. |

The dev outbox (`storage/outbox`) is unaffected and still works for local work.

---

## Related

- Addresses live in **one** place: `apps/web/src/lib/org-email.ts`.
  `npm run check:emails` fails the build if a literal `@edusentinel.ai` address
  reappears anywhere in `src/`.
- **Alias confirmation is still outstanding.** `hello@` and `security@` are
  confirmed live. The rest (`founder@`, `contact@`, `support@`, `careers@`,
  `billing@`, `admin@`, `team@`, `press@`, `legal@`, `info@`, `notifications@`)
  use conventional local-parts and are marked `ASSUMED` in that file. An alias
  that does not exist in Workspace fails at the recipient's end without an
  obvious bounce — worth confirming each one, especially `security@`.
- Mail is plain text only, with no tracking pixels, no click-redirects and no
  remote images. That is a standing platform rule, not an implementation detail —
  see the note at the top of `apps/web/src/lib/mail.ts`.
