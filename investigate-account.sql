-- ===========================================================================
--  READ-ONLY production investigation: aditya00497@hmail.com
--
--  Run against the PRODUCTION database. Contains SELECT statements only.
--  The transaction is opened READ ONLY so the server itself will reject any
--  write, including an accidental one pasted in alongside it.
--
--    psql "$PRODUCTION_DATABASE_URL" -f investigate-account.sql
--
--  Table names are quoted because Prisma created them with capitals.
-- ===========================================================================

BEGIN TRANSACTION READ ONLY;

\echo '=== [A] THE ACCOUNT ROW (Q1, Q6, Q13) ==============================='
-- createdAt, emailVerified, role, lockout state, presence.
-- Deliberately selects NO password hash and NO totpSecret.
SELECT id, email, name, role,
       "createdAt", "updatedAt",
       "emailVerified",                    -- NULL = never verified
       "lastSeenAt",                       -- Q5: last activity; NULL = never active
       "mfaEnabled", "failedLogins", "lockedUntil", "sessionVersion",
       "avatarName" IS NOT NULL AS has_avatar,
       title, bio, location, phone         -- a filled profile means a real person used it
FROM "User"
WHERE lower(email) = lower('aditya00497@hmail.com');

-- Widen the net in case the address differs slightly (hmail/gmail/hotmail typo).
SELECT id, email, name, role, "createdAt", "emailVerified"
FROM "User"
WHERE email ILIKE '%aditya%' OR name ILIKE '%aditya%' OR name ILIKE '%maurya%';

\echo '=== [C] HOW IT WAS CREATED (Q2, Q7) ================================'
-- A `user.signup` row here  => public self-signup.
-- No row here, but an ACCEPTED Invitation in [D] => invitation.
-- Neither => manual INSERT / SQL / import. This is the decisive negative test.
SELECT id, action, "actorEmail", "createdAt", ip, "userAgent"
FROM "AuditLog"
WHERE action IN ('user.signup', 'people.invite_accepted', 'user.signup_bot_blocked')
  AND (lower("actorEmail") = lower('aditya00497@hmail.com')
       OR "detail" ILIKE '%aditya00497@hmail.com%'
       OR "actorId" IN (SELECT id FROM "User" WHERE lower(email) = lower('aditya00497@hmail.com')))
ORDER BY "createdAt";

\echo '=== [D] INVITATION HISTORY — WHO CREATED IT (Q2, Q7) ==============='
-- invitedByEmail is a snapshot: it names the creator even if that account is gone.
SELECT id, email, role, status, "invitedByEmail", "invitedById",
       "createdAt", "expiresAt", "acceptedAt", "acceptedById", "revokedAt", capabilities
FROM "Invitation"
WHERE email ILIKE '%aditya%'
   OR "acceptedById" IN (SELECT id FROM "User" WHERE lower(email) = lower('aditya00497@hmail.com'))
ORDER BY "createdAt";

\echo '=== [E] MAIL EVER ADDRESSED TO IT (Q2 corroboration) ==============='
-- A `verify-email` row corroborates signup; an `invitation` row corroborates [D].
-- Bodies are never stored, so this is metadata only.
SELECT id, "to", subject, kind, status, error, "createdAt"
FROM "MailLog"
WHERE "to" ILIKE '%aditya%'
ORDER BY "createdAt";

\echo '=== [F] FIRST LOGIN / LAST LOGIN (Q3, Q4) =========================='
SELECT min("createdAt") FILTER (WHERE action = 'user.login')        AS first_login,
       max("createdAt") FILTER (WHERE action = 'user.login')        AS last_login,
       count(*)         FILTER (WHERE action = 'user.login')        AS successful_logins,
       count(*)         FILTER (WHERE action = 'user.login_failed') AS failed_logins,
       max("createdAt")                                            AS last_audited_activity
FROM "AuditLog"
WHERE "actorId" IN (SELECT id FROM "User" WHERE lower(email) = lower('aditya00497@hmail.com'))
   OR lower("actorEmail") = lower('aditya00497@hmail.com');

\echo '=== [G] FULL AUDIT HISTORY AS ACTOR (Q8, Q11, Q12) ================='
-- Q12: ANY action here other than user.login / user.login_failed / user.signup
--      is a WRITE. Every mutating server action in the codebase audits.
SELECT "createdAt", action, detail, ip, "userAgent"
FROM "AuditLog"
WHERE "actorId" IN (SELECT id FROM "User" WHERE lower(email) = lower('aditya00497@hmail.com'))
   OR lower("actorEmail") = lower('aditya00497@hmail.com')
ORDER BY "createdAt";

\echo '=== [H] MENTIONED BY SOMEONE ELSE (Q8) ============================='
-- Role changes, grants, offboarding, session revocations aimed AT this account.
SELECT "createdAt", action, "actorEmail" AS acted_by, detail, ip
FROM "AuditLog"
WHERE detail ILIKE '%aditya00497@hmail.com%'
   OR detail ILIKE '%aditya%'
ORDER BY "createdAt";

\echo '=== [I] PERMISSION GRANTS (Q9) ====================================='
-- Expect ZERO rows for a plain member. `grantedBy` is the Founder id, or the
-- literal string 'invitation' when attached to an invitation.
SELECT g.capability, g.allow, g."grantedBy", g.reason, g."expiresAt", g."createdAt"
FROM "PermissionGrant" g
WHERE g."userId" IN (SELECT id FROM "User" WHERE lower(email) = lower('aditya00497@hmail.com'));

\echo '=== [J] SESSIONS / IP / DEVICE (Q10, Q5, Q11) ======================'
SELECT id, sid, "createdAt", "lastSeenAt", "revokedAt", "revokedBy",
       browser, os, device, ip, location, "userAgent"
FROM "UserSession"
WHERE "userId" IN (SELECT id FROM "User" WHERE lower(email) = lower('aditya00497@hmail.com'))
ORDER BY "createdAt";

\echo '=== [K] DID IT EVER TOUCH ANYTHING? (Q11, Q12) ====================='
-- Any non-zero count here means the account did more than exist.
SELECT
  (SELECT count(*) FROM "SupportRequest"  WHERE "requesterId" = u.id) AS support_raised,
  (SELECT count(*) FROM "Message"         WHERE "authorId"    = u.id) AS messages_sent,
  (SELECT count(*) FROM "Product"         WHERE "ownerId"     = u.id) AS products_owned,
  (SELECT count(*) FROM "Release"         WHERE "createdById" = u.id) AS releases_uploaded,
  (SELECT count(*) FROM "TeamMember"      WHERE "userId"      = u.id) AS team_memberships,
  (SELECT count(*) FROM "Task"            WHERE "assigneeId"  = u.id) AS tasks_assigned,
  (SELECT count(*) FROM "Notification"    WHERE "userId"      = u.id) AS notifications,
  (SELECT count(*) FROM "AuthToken"       WHERE "userId"      = u.id) AS auth_tokens,
  (SELECT count(*) FROM "OrgMember"       WHERE "userId"      = u.id) AS org_chart_entries,
  (SELECT count(*) FROM "Collaboration"   WHERE "userId"      = u.id) AS collaborations
FROM "User" u
WHERE lower(u.email) = lower('aditya00497@hmail.com');

\echo '=== [L] NEIGHBOURS IN TIME (Q2 — import / bulk insert detection) ==='
-- Accounts created within 10 minutes either side. A cluster with no matching
-- user.signup audit rows is the signature of an import or a bulk INSERT.
SELECT u.email, u.name, u.role, u."createdAt", u."emailVerified",
       EXISTS (SELECT 1 FROM "AuditLog" a
               WHERE a."actorId" = u.id AND a.action = 'user.signup') AS has_signup_audit
FROM "User" u
WHERE u."createdAt" BETWEEN
      (SELECT "createdAt" - interval '10 minutes' FROM "User" WHERE lower(email) = lower('aditya00497@hmail.com'))
  AND (SELECT "createdAt" + interval '10 minutes' FROM "User" WHERE lower(email) = lower('aditya00497@hmail.com'))
ORDER BY u."createdAt";

\echo '=== [M] EVERY ACCOUNT, WITH ITS PROVENANCE (context) ==============='
SELECT u.email, u.role, u."createdAt", u."emailVerified" IS NOT NULL AS verified,
       EXISTS (SELECT 1 FROM "AuditLog" a WHERE a."actorId" = u.id AND a.action = 'user.signup')          AS via_signup,
       EXISTS (SELECT 1 FROM "Invitation" i WHERE i."acceptedById" = u.id)                                AS via_invitation,
       (SELECT max(a."createdAt") FROM "AuditLog" a WHERE a."actorId" = u.id AND a.action = 'user.login') AS last_login
FROM "User" u
ORDER BY u."createdAt";

COMMIT;
