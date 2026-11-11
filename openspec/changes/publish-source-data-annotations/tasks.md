## Implementation

- [x] Validate the generated contract and source-aware date display.
- [x] Collect stored annotations with exact record owners and explicit provider attribution.
- [x] Add central and authority static routes, filters, pagination, and complete CSV exports.
- [x] Render findings beside affected records and show reported dates without calculated tenure.

## Verification

- [x] Test JSON validation, provider isolation, pagination, CSV round trips and complete exports.
- [ ] Run required site validation against the final head and inspect a generated local preview.
- [ ] Obtain release approval before any publication.

## Approved analytics follow-up

- [x] Protect analytics payloads, restrict production collection, and load the tag asynchronously with regression coverage.
- [x] Restore masthead tracking and add privacy-preserving search outcome/selection tracking with regression coverage.
- [x] Distinguish verification-email failures and retain accurate submission-receipt events with regression coverage.
- [ ] Configure URL redaction, deliberate search/history measurement, traffic exclusions, form dimensions, and fourteen-month event retention; record saved settings.
- [ ] Run full final-head validation, review the diff, commit and push to the existing GitHub branch, and record CI status.

## Approved review corrections

- [x] Preserve the personnel-publication switch for authority-owned personnel exclusions, paginate authority findings once, and retain warning/error evidence in record notes.
- [x] Exclude failed dataset loads from search-outcome counts and classify existing search destinations accurately.
- [x] Remove annotation knowledge from `PageShell`; compose record notes explicitly on the owning record routes and verify retained evidence and index pagination.
- [x] Update every repository GitHub Action that used Node 20 to a verified Node 24 action runtime, preserving workflow permissions and commands.
