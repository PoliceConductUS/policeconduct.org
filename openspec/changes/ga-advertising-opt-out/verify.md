## Merge state (recorded 2026-11-19)

- Merged to main in d6c17a66857d6bc8c6f4605462c16f047f99b808 (PR #44, 2026-11-15); consent dialog polish in dc5b38c9e8c4536d37729d69fc0c27a9d5b5220d (PR #52, 2026-11-16).
- CI for PR #44 head (`gh pr checks 44`): every check passed (CodeQL, Analyze JavaScript/TypeScript, Scan for personal data, coverage-javascript, upload-coverage-javascript, copilot-setup-steps, cleanup).
- CI for PR #52 head (`gh pr checks 52`): every check passed (CodeQL, Analyze JavaScript/TypeScript, Scan for personal data, coverage-javascript, upload-coverage-javascript, cleanup).
- Earlier verification notes for this change were removed: they recorded Node 24.22.3 instead of the mise.toml runtime, a stale review_links schema failure, and no commit, command or exit code.

## Verification <YYYY-MM-DD>, commit <full SHA>

Fill this section from a fresh run on the final head of the follow-up PR.

- Runtime: Node 26.13.1 (mise.toml); npm ci; installed versions match package-lock.json.
- Database: before npm run validate, the local database had all migrations applied (npx supabase migration up); it was not reset.
- `npm run validate`: exit <code>; stages <each stage and outcome>; tests <counts>; skipped <count and reason each>; warnings <each and disposition>.
- Consent e2e tests in tests/e2e/analytics.spec.mjs: <test names>, <pass counts>.
- Google requests are intercepted in these tests, so they check our code, not Google's real cookies or network traffic. Deployed checks: see tasks.md.
- Follow-up PR: <link>; CI <result for final head>.
- section1983.org PR: <link>; CI <result for final head>; dependency audit <result>.
- Deployed checks (after deploy), policeconduct.org: <per-state gcs, gcd and cookies>.
- Deployed checks (after deploy), section1983.org: <per-state gcs, gcd and cookies>.
