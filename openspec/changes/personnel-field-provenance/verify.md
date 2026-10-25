# Verification

- `npm run test:provenance`: 32 tests passed. Covers the load-bearing assertions: a dataset with no attested retrieval date never classifies as traceable; an uncited field is absent from the projection under enforcement; an attestation cannot be cited for a field its dataset does not contain; a malformed or unregistered ledger line fails the build rather than being skipped; and each accuracy rule fires on the defect it was written for.
- `npm run validate:types` (`astro check`): passed, 0 errors, 0 warnings, 3 pre-existing hints.
- `npx eslint` over every added and changed file: clean.
- `prettier --check` over every added and changed file: clean.
- Ledger built from the source production: SHA-256 recomputed over the 16,983,932-byte workbook matches both the load manifest and the registered attestation. 129,973 personnel rows and 143,699 assignment rows, each exactly five above the manifest's recorded counts — the five hand-added `True`-surname corrections, which the parser counts separately.
- Ledger coverage measured against a local database carrying the production schema (160,602 personnel rows): 129,914 rows covered, 80.89%. The uncovered 30,688 are rows that database holds beyond the source production. The covered count lands within 15 rows of the 129,929 live profiles INS-18 traced, which is evidence that the recorded ids survived the re-import.
- Not done: rendered-HTML verification on a built page, and ledger coverage against the production database. The first needs a local database whose photo associations resolve in this workspace; the second needs read-only production credentials, which are with the board. Enforcement stays in reporting mode until the second exists.
