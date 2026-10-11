# Verification

- `node --test scripts/video.test.mjs`: 2 passed after initial missing-module failure.
- `node --test scripts/generate-redirect-map.test.mjs`: 6 passed after initial missing-watch-redirect assertion failure.
- `npm run test:redirects`: all 82 tests passed.
- `git diff --check`: passed.
- `npm run validate:types`: 0 errors, 0 warnings, 3 existing hints.
- Scoped ESLint for new routes/component/helper and redirect scripts: passed.
- `npm run doctor`: missing Brewfile dependencies and GitHub authentication; no installation performed. Sandbox cache-write warnings.
- Full build, original-ID real-data rendering, deployment and full aggregate validation are not established by these checks.

- Reviewed intake restoration 000016 restored ReviewLink cm79tz8zl00020cjr0rlhak05 and both durable ledger directions; event 000017 restored CivilCaseLink lotts8link8youtube8bwc8v1. Both local canonical watch URLs return 200 and embed the exact historically published video TKh6X74AEc0.
- Removed inferred video upload dates: report/case creation dates do not establish upload dates.
- Full local validation passed: 147 browser tests, one existing skip; fresh static build and hosted preview remain pending.
