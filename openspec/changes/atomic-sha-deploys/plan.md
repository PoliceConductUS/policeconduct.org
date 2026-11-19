# Plan

This change records the shipped deploy model and adds four deltas: versioned release IDs, PR-only previews, the release and preview lifecycle, and the route coverage requirement on `shared-redirects`. The route coverage work below is done. Tasks are in `tasks.md`.

## Remaining work

1. Versioned release IDs (tasks 2.x): `scripts/build-release.mjs` picks `<commit>-<version>`; `scripts/release-files.mjs` checks it; `scripts/upload-release.sh` claims the folder with a create-only write before any sync. Tests extend `scripts/deploy-release-guard.test.mjs` with the fake AWS command; no cloud calls.
2. PR-only previews (tasks 3.x): `scripts/deploy.sh` requires `PR_NUMBER`; `router.js` accepts only `pr-<N>` preview labels. Tests extend `scripts/cloudfront-router.test.mjs` and `scripts/deploy-release-guard.test.mjs`.
3. Lifecycle (tasks 4.x): `scripts/cleanup-preview.mjs` removes an unshared preview folder at PR close; `scripts/manage-release.mjs delete` removes only preview-store keys and never deletes a folder. New `scripts/cleanup-preview.test.mjs`; updated `scripts/manage-release.test.mjs`.
4. Documentation (tasks 5.x): `README.md` deploy section and the `noindex.js` header comment.
5. Verify (tasks 6.x), ending with `npm run validate` on the final head.

Each section ends with `npm run test:redirects`. Live checks in 6.1-6.5 need a preview deploy and a production deploy.

## Route coverage adjustment (done)

This follow-up implemented the owner's September 20, 2026 rule change (approved by the owner in conversation; no written record).

### Outcome and design

Every prior URL must exist, redirect to a terminal current route, or have an exact path and reason in the committed `route-absences.json` list. Absence permits the existing 404 response; it does not declare permanent retirement or promise a return date. The list is release metadata, not a source of personnel identity. Current routes and valid redirects take precedence when a profile returns.

The October 9, 2026 follow-up (approved by the owner in conversation; no written record) excludes empty state pages. Record only exact published state roots and legacy state collection URLs after checking that their states have no current agency assignments, reports, or civil cases. Federal roots and individual record URLs are outside this decision.

The owner approved explicit accounting rather than blanket exemptions or forced redirects. No production paths will be invented or inferred from a missing row.

### Implementation

- [x] Add executable fixture tests for accounted and unaccounted gaps, returning profiles, exact path scope, invalid entries, and redirect integrity.
- [x] Read the explicit absence list in the existing checker and report 404 allowances separately from redirects. Update unresolved generator wording.
- [x] Update the deployment specification and document list maintenance.
- [x] Run focused tests and the aggregate validation gate; record limitations.

### Deployment guard follow-up

`npm run deploy -- <environment>` (with and without `--skip-build`) runs the strict redirect coverage check after the build and before the upload script. This changes no route policy or data.

- [x] Reproduce missing deployment checks with isolated executable shell fixtures.
- [x] Gate the deploy command and include fixtures in `test:redirects`.
- [x] Verify failure blocks all cloud calls and successful coverage follows the build and precedes publication.
