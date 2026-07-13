# Phase 6.1 — Placeholder inventory

*Produced 2026-07-14, before any code was changed. This is the definition of done
for §6.1: every row below is resolved exactly one of three ways — **wire** it to a
real query, render an honest **empty** state, or **delete** it — and the choice is
recorded here.*

A control that cannot do anything is removed. That rule (Phase 5.6) is applied
without exception, including to controls that came from the approved reference
screenshots.

| # | Surface | What was fake | Resolution |
|---|---------|---------------|------------|
| 1 | `components/dashboard/topbar.tsx` | Notification bell: a `<button>` with no handler and a permanently-lit unread dot. It announced unread notifications that did not exist and could not be opened. | **Delete.** Notifications are Phase 9; the bell returns when it has something to show. |
| 2 | `components/dashboard/sidebar.tsx` + `app/app/layout.tsx` | "Team Online" rail rendered the first five staff by `createdAt` and hard-coded `online` on every avatar. Nobody's presence was being measured. | **Wire.** `User.lastSeenAt` is stamped by the shell (throttled to 2 min); presence = staff seen in the last 5 minutes. The rail hides entirely when nobody is online, rather than inventing company. |
| 3 | `components/dashboard/widgets.tsx` — `StatCard` | `people` was required, so every card carried an avatar stack whether or not people were relevant to it. The member and collaborator dashboards passed `[viewer.name]` — a stack of yourself. | **Wire + delete.** `people` and `href` are now optional; the stack renders only when the card is genuinely about those people, and the "More" link only when there is somewhere to go. |
| 4 | `app/app/dashboards/leadership.tsx` | All three summary cards passed the same `staffNames`, unrelated to the card's subject. | **Wire.** Products shows its owners, Releases its publishers, Team the staff. |
| 5 | `app/app/dashboards/employee.tsx` | Products card subtitle: the literal string "EduSentinel product registry". | **Wire.** Real count of products the viewer may see. |
| 6 | `app/app/dashboards/member.tsx` | Role row hard-coded to `"Member"` — wrong for any USER whose role changes. Downloads subtitle "Signed, verified releases" was decoration. | **Wire.** `ROLE_LABELS[viewer.role]`, and the real count of published releases. |
| 7 | `app/app/dashboards/collaborator.tsx` | Three cards each carrying an avatar stack of the viewer; "My Requests" linked to the page it was already on. | **Delete.** Stacks removed, dead self-link removed. |
| 8 | `app/app/dashboards/leadership.tsx` | Account Growth: one 7-day cumulative bar chart, caption hard-coded "Last 7 days", no way to ask anything else of it. | **Wire.** Replaced by the §6.3 analytics module; the dashboard card links into it. |
| 9 | `prisma/seed-workspace.mjs` | Demo people, teams, projects and tasks, runnable against any database including production. | **Wire (fence).** The seed now refuses to run unless `DATABASE_URL` is a local SQLite file and `NODE_ENV` is not `production`, and it labels itself as dev-only fixture data. |
| 10 | Profile data (`name`, title, avatar, timezone, bio) | Did not exist. Names came from signup and could never be corrected; the "title" shown in the directory was a team-membership field only an admin could set; avatars were initials with no alternative. | **Wire.** §6.2 — real profile records, self-service for every role. |

## Not placeholders (checked, left alone)

- **Initial-avatars** (`components/dashboard/avatar.tsx`) are a deliberate design
  decision, not a stand-in: no remote image fetches keeps the no-tracker invariant
  intact. They remain the fallback when a person has uploaded no photo.
- **Marketing site** — swept for invented metrics (customer counts, "99.9%",
  logo walls). There are none; the copy makes no numeric claims we cannot back.
- **Empty states** already present on the release pipeline, audit feed, tasks and
  collaboration tables are honest and say what would fill them. Kept as they are.
