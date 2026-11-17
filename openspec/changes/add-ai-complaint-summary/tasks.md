## Implementation plan

- [x] Add failing intake contract tests with synthetic data for complete and incomplete summaries.
- [x] Add schema migration and canonical summary validator; regenerate intake contracts against disposable DB.
- [x] Add failing website validation/render tests; implement loader gate and summary component.
- [x] Import private verified summary through existing intake correction and data chain commands.
- [ ] Run full repository validation, verify loopback page and redirects, and record exact combined commits.

- [x] Distinguish sourced missing-copy states from pending and failed processing; render an honest message and donation link.

## Remove unrequested provenance requirements

- [x] Require only summary text and complaint link across intake, SQL, and website.
- [x] Verify minimal summaries, retained metadata, and invalid rendered fields.
