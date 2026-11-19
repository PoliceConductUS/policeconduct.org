# Verification

## Route coverage adjustment

Scope: the approved route coverage rule change only. This does not verify the versioned release ID, preview, or lifecycle work in `tasks.md` sections 2-6.

- Ten executable fixture tests pass, exercising the actual checker with local sitemaps and redirect maps. Before implementation, the accounted intake-gap test failed because the checker rejected the missing profile.
- Covered: exact absence accounting, unaccounted gaps, child/other-path gaps, returning profiles, valid redirects, invalid destinations, redirect chains, invalid entries, missing lists, and malformed JSON.
- Changed JavaScript files pass ESLint; OpenSpec validation passes all seven items; `git diff --check` passes.
- The follow-up fixes all 14 reported ESLint errors: browser globals for mockup scripts, documented CloudFront handler entry points, and unused bindings. The full `npm run lint` command now passes both JavaScript and SQL lint.
- Aggregate validation passes formatting, lint, type checking, shell validation, schema validation (32 tables), OpenSpec checks, and all ten route tests. Browser tests expose existing failures, including hardcoded old profile/report URLs and page assertions. The run was stopped after those failures; full validation is not established.
- `npm run doctor` reports missing Homebrew dependencies and local setup needs.
- The redirect checker now reads the actual generated inventory object (`{ redirects: [...] }`). Tests reproduce the previously ignored redirects using that format and pass after the fix.
- Production sitemaps were captured and compared to current database-backed personnel routes. `route-absences.json` contains 105 currently unmatched profiles; all are unique, published paths absent from the current route set. Ten replacement identities remain unresolved, and 129,924 exact-ID records had changed slugs. See `docs/route-reconciliation-2026-09-20.md`.
- The full rebuild was stopped pending the slug decision. The resulting partial `dist/` is not release-ready and must not be deployed. Whole-site sitemap coverage and live 404/redirect behavior remain unverified.
- The owner has since decided that published slugs never change (owner decisions, round 1, Q3). The published slugs must be kept; the changed slugs are not to be redirected.
- No deployment or live HTTP verification was performed.

Follow-up identity review removed one profile from the absence list after finding a same-agency profile with a spelling variant of the name. The prior exact-name comparison was incomplete; remaining absences are preliminary unmatched records, not proof that the people are absent under every possible name variant.

## Deployment guard follow-up

Eight isolated executable deployment fixtures failed before the guard was added and pass afterward. They exercised the preview and production deploy paths, with and without `--skip-build`, with failing and passing coverage checks. Those paths are now one command, `npm run deploy -- <environment>`. Failed checks exit before any AWS or redirect-loader call; passing checks follow the build where applicable and precede the upload script. Fixtures use fake npm, AWS, and Node commands and never contact cloud services.

Focused verification passed at the time: all 80 redirect tests (including eight deployment guard fixtures), ESLint for both changed test files, shell syntax validation, OpenSpec validation for this change, formatting, and `git diff --check`. The commit and exit codes of those runs were not recorded.

## Final verification

Not yet run. Record for the final head: commit SHA, `npm run test:redirects` and `npm run validate` with exit codes and test counts, and `npx openspec validate atomic-sha-deploys`.
