# Verification

- Authority allegation visibility regression failed before the component change and passed afterward.
- Officer allegation visibility regression failed before the component change and passed afterward; findings remain collapsed.
- Focused suites: 7 authority tests, 3 authority fixture tests, and 5 personnel tests passed.
- Desktop (1440px) and mobile (390px) authority review: allegations visible, details closed, no horizontal overflow; compact rows remain readable.
- `npm run validate` passed on the combined implementation: 141 browser tests passed, 1 existing skip. Earlier fixture failures asserted the superseded always-visible source behavior; updated assertions now require the source to remain collapsed and target a new tab after expansion.
- `git diff --check` passed. Stored source URLs and data are unchanged. New-tab behavior cannot override a source server's forced download response.
- Officer source follow-up: all 5 personnel tests passed; aggregate validation passed again with 141 browser tests and 1 existing skip. Tests require a hidden source before expansion and a visible new-tab link afterward.
- Final delivery validation on October 5: `npm run validate` passed (141 browser tests, 1 existing skip); synced the main specification and completed the retrospective before archiving.
