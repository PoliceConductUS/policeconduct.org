# Verification: remove-verification-claims

## Overall Decision

- [x] PASS: implementation and scenario coverage match the approved outcome; no unresolved review findings.

## Completeness, correctness and coherence

Both requirements and their scenarios are implemented. Visible pages, metadata and FAQ JSON-LD no longer promise verification or fact checking. Copy changes cover FAQ, donation, volunteer, soft-launch news, llms, submission forms, report listings, footer and legal notices. Privacy text no longer promises submission or identity verification. Useful source-detail requests and truthful negative disclaimers remain. No replacement workflow was invented.

The existing email action is labeled email confirmation throughout UI, email and API messages. Routes, tokens, HMAC checks, status identifiers, data fields and submission behavior remain intact. Confirmation success cannot replay misleading API or session wording. The coordinated release must deploy the forms API as well as static pages because other responses come from the API.

Rendered regression: 17 actual routes, 18 tests, nonempty FAQ structured answers, metadata, report/listing fixtures and generated no-inline-CSS checks. The initial regression failed on old footer/form/listing claims; the updated pages pass. Existing API and browser tests cover successful email confirmation, old API wording and reload, missing IDs, invalid/expired links, resend and cap behavior. Independent review found two additional accuracy guarantees; both were removed and added to the rendered regression.

Remaining source matches were reviewed: internal status/route/CSS identifiers, instructions to supply public details or check links independently, submitter accuracy requirements, and truthful negative disclaimers. A public-record text audit was restricted to exact slugs in the existing production sitemap: three reports and 570 civil cases. The sole matching field says allegations have not been independently verified; no affirmative claim was found. No private submission text was queried or published.

## Validation

Runtime: Node v24.21.0 and npm 11.19.0 through mise. Fresh npm ci exited 0; all 511 installed package versions match the lockfile. npm audit reports zero vulnerabilities.

Full `mise exec -- npm run validate` exited 0 on the implementation working tree based on `6db45a3a4bb3cae9fa40b3e5b803d25a1128209e`. All stages passed: repository formatting, ESLint, SQLFluff, Astro (0 errors, 0 warnings, 0 hints), shell syntax, schema contract (29 tables), OpenSpec, personal-data scan, every Node suite (338 passed, 0 failed, 0 skipped), and every browser suite (213 passed, 0 skipped), including built and served Pagefind search. The console error in the mocked submission-failure browser case is the asserted failure path, not a diagnostic finding. No assertions, rules, or fixtures were weakened.

The final committed head must run the same full command and pass CI before merge. Exact SHA and CI outcomes belong in the final PR evidence. Full production build, sitemap/canonical/redirect checks, forms API deployment and live checks are separate release steps, already authorized by the user.
