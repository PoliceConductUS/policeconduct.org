## Verified locally

- Node 24.21.0; fresh `npm ci`; `npm ls --depth=0` succeeds.
- New behavioral tests failed against the original component, then passed with the change.
- `npm run test:client`: 5 passed, 0 failed, 0 skipped.
- `npm run validate:openspec`: 27 passed.
- Prettier and ESLint pass for the changed code; SQL lint passed in aggregate validation.
- An isolated Astro page renders the actual shared component successfully. Chromium confirms all three advertising consent values are denied before the external script executes, both configuration flags are false, and no page errors occur. The Google script is stubbed in this check; this is not evidence of downstream Google processing.

## Outstanding requirements

- `npm run validate` stops at `validate:types`: this worktree lacks DATABASE_URL. Later aggregate stages did not run. No complete validation or merge-readiness claim.
- `npm ci` warns that the existing @alibaba-group/open-code-review postinstall is not covered by allowScripts. No exception or script approval was granted.
- GA Admin Google signals, ads-personalization values and Google Ads links are unverified; an access-provider question is pending on INS-121.
- No merge or deployment performed. Production still has the original configuration. Full release/build/sitemap checks and deployed HTML/network verification remain required.
- Five stale inventory passages were sent to the Executive Director after revision-safe writes returned 409. The Executive Director reports incorporating the corrections in INS-16.

## Scope of inventory evidence

The inspected personnel page HTML includes one third-party script, GA4 via gtag.js, not a GTM container. Absence of separate DoubleClick/Disqus/Facebook script tags on that page does not establish absence of downstream network requests or tags on every route. Correction: the earlier Disqus source finding came from the stale ins34 checkout at fa6ca6f. Main and this branch already include ba94ac9c72f6f88d053f3f93fbf56e1dfdee9ef1 (2026-08-30), which removed the component and its report-detail invocation. On 2026-11-04 all three dated report-detail URLs in the five deployed sitemaps returned HTTP 200 with GA4 and no Disqus markers in their HTML. The evidence is limited to those pages and does not assert downstream network behavior. Historical processing cannot be inferred from the new defaults.
