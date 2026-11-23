## Implementation

- [x] Validate the generated contract and source-aware date display.
- [x] Collect stored annotations with exact record owners and explicit provider attribution.
- [x] Add central and authority static routes, filters, pagination, and complete CSV exports.
- [x] Render findings beside affected records and show reported dates without calculated tenure.

## Verification

- [x] Test JSON validation, provider isolation, pagination, CSV round trips and complete exports.
- [x] Run required site validation against the final head and inspect a generated local preview.
- [x] Obtain release approval before any publication. Inferred by the owner from the production release of `2c594ba`, which contains `d82dd1e`; see `verify.md` section 8.

## Approved analytics follow-up

- [x] Protect analytics payloads, restrict production collection, and load the tag asynchronously with regression coverage.
- [x] Restore masthead tracking and add privacy-preserving search outcome/selection tracking with regression coverage.
- [x] Distinguish verification-email failures and retain accurate submission-receipt events with regression coverage.
- [x] Configure URL redaction, deliberate search/history measurement, traffic exclusions, form dimensions, and fourteen-month event retention; record saved settings. The user chose to include team production visits, so the existing internal filter remains in testing without IP rules.
- [x] Run full final-head validation, review the diff, commit and push to the existing GitHub branch, and record CI status. PR35 final head `8ca37de`: `npm run validate` exit 0; six hosted checks pass; see `verify.md` section 8.

## Approved review corrections

- [x] Preserve the personnel-publication switch for authority-owned personnel exclusions, paginate authority findings once, and retain warning/error evidence in record notes.
- [x] Exclude failed dataset loads from search-outcome counts and classify existing search destinations accurately.
- [x] Remove annotation knowledge from `PageShell`; compose record notes explicitly on the owning record routes and verify retained evidence and index pagination.
- [x] Update every repository GitHub Action that used Node 20 to a verified Node 24 action runtime, preserving workflow permissions and commands.

## Approved versioned Analytics configuration

- [x] Add the managed Analytics configuration and npm comparison/application commands, preserving unrelated resources and external credentials.
- [x] Cover the commands with mocked API tests, verify available live settings, and complete final-head validation and stack synchronization. Mocked tests in `scripts/analytics-config.test.mjs`; live settings checked in the Analytics UI only (section 6); PR35 final-head validation and merge in section 8.

## Delivery evidence boundary

This checklist records the implementation snapshot verified in `verify.md`. Final documentation-head validation, stack synchronization and hosted checks are recorded in the PR descriptions after this snapshot; they remain unchecked here until that delivery evidence exists. Release approval remains separate.

## INS-121 Analytics synchronization

- [ ] Extend the existing Analytics CLI with atomic remote-to-local pull and explicit local-to-remote push tasks on both sites. Moved to `fix-licensing-authority-annotations`: only the policeconduct.org property's CLI is in this repository and was checked; section1983.org's is in its own repository and was not.
- [x] Manage Google signals state and record unsupported regional settings as dated manual evidence.
- [x] Verify pagination, failed-pull preservation, readback, idempotency and signals update masks with API transport tests.
- [ ] Complete aggregate validation and authorized release verification. Moved to `fix-licensing-authority-annotations`: PR44 (`d6c17a6`) never had a full `npm run validate` on its own head. Its hosted checks pass and it is live in production release `2c594ba` (see `verify.md` section 8).
