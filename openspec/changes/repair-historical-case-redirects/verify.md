# Verification

## Scope and evidence

- The generator previously emitted zero redirects for all six historical slugs; new regression tests failed for missing aliases and missing-HTML enforcement before the implementation.
- Generator integration tests: 12/12 pass, including all 12 historical route variants, current database slug changes, nonmatching canonical IDs, and a missing built destination.
- Real isolated inventory: 25,634 redirects; all 12 configured historical variants resolve in one 301 hop to the six existing parent-build HTML files. File digests and exact mappings are retained in `artifacts/ins110-redirects/inventory-check.json`.
- HTML is reused from parent build `41d80cb060f5950cc50b77bcc04cacb3ea3fffbc`; this change regenerates the inventory, not the full site. Parent HTML and its redirect inventory are not edited.
- Format, ESLint, SQLFluff, Astro types, shell syntax, schema contract, OpenSpec, personal-data scan and all non-browser tests passed. Browser validation initially stopped on missing local environment settings; after supplying the local forms target and retained intake workspace, all 153 browser tests passed. The aggregate stages were completed across the initial run and this corrected browser rerun; no tests were skipped. The redirect suite passed 122/122 tests.
- Direct diff review checked ID-based lookup, exact path scope, database-backed destination slugs and preservation of unrelated mappings. No schema, cache, source identity, title or slug edits.

## Existing release holds

Good/Pretti target warnings remain unchanged and outside this assignment. Full prior-sitemap coverage/release is not claimed. No inferred historical watch aliases, merge, deployment or public mutation.
