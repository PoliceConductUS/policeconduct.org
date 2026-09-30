# Route coverage adjustment verification

Scope: the approved route coverage rule change only. This does not verify or
complete the remaining atomic deployment work.

- Ten executable fixture tests pass, exercising the actual checker with local
  sitemaps and redirect maps. Before implementation, the accounted intake-gap
  test failed because the checker rejected the missing profile.
- Covered: exact absence accounting, unaccounted gaps, child/other-path gaps,
  returning profiles, valid redirects, invalid destinations, redirect chains,
  invalid entries, missing lists, and malformed JSON.
- Changed JavaScript files pass ESLint; OpenSpec validation passes all seven
  items; `git diff --check` passes.
- The follow-up fixes all 14 reported ESLint errors: browser globals for mockup
  scripts, documented CloudFront handler entry points, and unused bindings.
  The full `npm run lint` command now passes both JavaScript and SQL lint.
- Aggregate validation passes formatting, lint, type checking, shell validation,
  schema validation (32 tables), OpenSpec checks, and all ten route tests. Browser
  tests expose existing failures, including hardcoded old profile/report URLs
  and page assertions. The run was stopped after those failures; full validation
  is not established.
- `npm run doctor` reports missing Homebrew dependencies and local setup needs.
- The redirect checker now reads the actual generated inventory object
  (`{ redirects: [...] }`). Tests reproduce the previously ignored redirects
  using that format and pass after the fix.
- Production sitemaps were captured and compared to current database-backed
  personnel routes. `route-absences.json` contains 105 currently unmatched profiles;
  all are unique, published paths absent from the current route set. Ten
  replacement identities remain unresolved, and 129,924 exact-ID records have
  changed slugs. See `docs/route-reconciliation-2026-09-20.md`.
- The full rebuild was stopped pending the bulk slug decision. The resulting
  partial `dist/` is not release-ready and must not be deployed. Whole-site
  sitemap coverage and live 404/redirect behavior remain unverified.
- No deployment or live HTTP verification was performed.

Follow-up identity review removed Spenser Stockwell from the absence list after
finding a same-agency Spencer Stockwell candidate. The prior exact-name comparison
was incomplete; remaining absences are preliminary unmatched records, not proof
that the people are absent under every possible name variant.
