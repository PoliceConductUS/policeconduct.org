## Verification

The database verifier failed before the fix because the generated report title differed from its stored report title. After aliasing the personnel title and regenerating all build projections, all three report projections preserve both report and linked personnel titles. A browser check of the Texas reports archive confirms that visible link labels and CollectionPage item names equal stored report titles.

Projection refresh now rejects duplicate query output names before writing derived rows. Source records and canonical paths are unchanged. The regression can be rerun with `npm run verify:report-titles` against a populated local database after `npm run refresh:build-projections`.

The full validation gate is also run with the repository Node 24 runtime. Full results and environment-specific limits are recorded on INS-119. This change does not authorize merge, deployment, or publication.

The prefill fixture now resolves the same retained civil case by canonical ID instead of a historical slug. All qualifying record and prefill assertions remain. Two unused HTTP request parameters in the existing employment-verifier tests are explicitly named as unused to clear type-check hints.
