# Branch Protection — required setup

Phase 3 security gate (R8). CI cannot enforce this on itself: branch
protection is a repository setting, so it must be applied by the Founder
once the GitHub repository exists. Until it is applied, the two-person
review rule (SECURITY-ROADMAP §4, Founder Trust Model) is only a policy —
this turns it into a control that cannot be skipped under deadline
pressure.

## Apply (GitHub CLI)

```bash
gh api -X PUT repos/<org>/<repo>/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -F "required_status_checks[strict]=true" \
  -F "required_status_checks[contexts][]=verify" \
  -F "required_status_checks[contexts][]=audit" \
  -F "required_status_checks[contexts][]=secrets" \
  -F "required_status_checks[contexts][]=codeql" \
  -F "enforce_admins=true" \
  -F "required_pull_request_reviews[required_approving_review_count]=1" \
  -F "required_pull_request_reviews[dismiss_stale_reviews]=true" \
  -F "restrictions=null" \
  -F "allow_force_pushes=false" \
  -F "allow_deletions=false"
```

## Or via the web UI

Settings → Branches → Add rule for `main`:

- [x] Require a pull request before merging — 1 approval, dismiss stale approvals
- [x] Require status checks to pass: `verify`, `audit`, `secrets`, `codeql`
- [x] Require branches to be up to date before merging
- [x] Include administrators (**enforce_admins** — the Founder is not exempt;
      this is deliberate: the Trust Model protects the founder *account*, it
      does not exempt the founder from review)
- [ ] Allow force pushes — must stay off
- [ ] Allow deletions — must stay off

## Verify

```bash
gh api repos/<org>/<repo>/branches/main/protection | jq '{
  reviews: .required_pull_request_reviews.required_approving_review_count,
  checks: .required_status_checks.contexts,
  admins: .enforce_admins.enabled,
  force_push: .allow_force_pushes.enabled
}'
```

Expected: `reviews: 1`, all four checks listed, `admins: true`,
`force_push: false`.

## Status

- [ ] Applied to `main` — **pending: GitHub repository not yet created**
      (Phase 0 open item). Record the date here once applied.
