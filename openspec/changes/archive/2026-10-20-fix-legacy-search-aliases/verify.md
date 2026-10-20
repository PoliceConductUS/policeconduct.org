# Verification: fix-legacy-search-aliases

## Completeness and correctness

The generator now emits exactly the two previously missing literal no-slash keys. Existing trailing-slash aliases remain unchanged. The regression executes the generator and verifies all four source paths exactly once, their canonical destinations, and status 301.

TDD red: the regression failed because /privacy-policy appeared zero times. TDD green: npm run test:redirects passed all 85 tests, including the new regression and existing loader/router coverage.

## Pipeline preservation

normalizePath appends a slash, so the new source strings intentionally bypass that helper. Serialization writes the strings unchanged. scripts/load-redirects.mjs validates source paths then constructs keys with namespace + entry.from. The CloudFront router probes keyPrefix + request.uri before wildcard matching. Neither stage appends a slash. No runtime or broad normalization change is necessary.

## Checks

- npm run test:redirects: 85 passed, 0 failed.
- Scoped ESLint and Prettier: passed.
- OpenSpec pre-archive validation: 24 passed, 0 failed.
- git diff --check: passed.
- Independent review: no findings; reviewer confirmed raw keys are preserved throughout the pipeline.

## Limits

Full validation and HTML generation were deliberately not run while the parent performs the production release, as instructed. Only source generator/test and OpenSpec artifacts changed. Parent owns regeneration/publication of the inventory and live 301 verification after the current release completes. No deployment or live-resolution result is claimed here.
