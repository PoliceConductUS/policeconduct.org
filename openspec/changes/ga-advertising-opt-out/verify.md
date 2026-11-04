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
- Five stale inventory passages were prepared for correction in INS-16. Revision-safe writes returned 409 because the Executive Director owns a live checkout; corrections were sent to that issue for incorporation. No document changes claimed.

## Scope of inventory evidence

The inspected personnel page HTML includes one third-party script, GA4 via gtag.js, not a GTM container. Absence of separate DoubleClick/Disqus/Facebook script tags on that page does not establish absence of downstream network requests or tags on every route. Source still includes Disqus on report routes. Historical processing cannot be inferred from the new defaults.
