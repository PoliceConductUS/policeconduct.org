# Verification

- Rendered roster tests: 3 passed, including small rosters and combined discipline, name, and status filtering.
- Type checks: zero errors and warnings.
- Changed-file ESLint: passed.
- Redirect-map unit tests: 4 passed.
- OpenSpec validation: 18 passed.
- Desktop and mobile fixture screenshots inspected. The fixture omits the shared site stylesheet, so full-site visual verification remains pending.

After the arrest import completed, projection refresh succeeded: 3,393 agencies included and 145 excluded. Database-backed agency eligibility and federal-root tests passed, verifying the current-assignment predicates against refreshed projections. Aggregate `npm run validate` passed with 147 browser tests passing and one existing test skipped. Preview delivery is verified separately.

Oregon intake investigation found 23 distinct action labels, including abbreviations. DPSST defines UR as Under Review and explicitly distinguishes it from a finding of violated standards. Maintenance-related codes still need authoritative definitions before normalization. No Oregon intake data or website labels have been changed.

The first full preview build exposed an inner page-projection join dropping historical agency identity from personnel pages. The strict missing-agency assertion caught this. Two personnel page queries now load agency identity through agency/location_path and left join projection metadata solely for link availability. A regression test failed before this fix and passed after it, verifying retained historical assignments and absence of links to excluded agency pages. All 18 focused tests and the rerun aggregate validation passed; independent read-only review found no critical or important issues.
