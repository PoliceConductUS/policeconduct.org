## 1. Implementation

- [x] 1.1 Add the provenance contract, the attestation registry, and the suppression-rule evaluator.
- [x] 1.2 Resolve per-row provenance from loader-written columns, else from the derived ledger, else withhold.
- [x] 1.3 Extend the personnel projection to `public.personnel` and replace the remaining `select *` reads.
- [x] 1.4 Render per-field citations and distinguish roster records from submitted content.
- [x] 1.5 Derive the ledger from the hash-verified source artifact and its identity map.

## 2. Verification

- [x] 2.1 Test that an uncited field cannot reach a projection, and that no retrieval date never classifies as traceable.
- [x] 2.2 Test each accuracy rule against the defect it was written for.
- [x] 2.3 Measure ledger coverage against a database with the production schema.
- [ ] 2.4 Verify rendered HTML on a built page, and measure ledger coverage against the production database.
