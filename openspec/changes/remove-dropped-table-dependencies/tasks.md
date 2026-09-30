## 1. Remove retired consumers

- [x] 1.1 Remove report/civil-case dropped-table loaders, fields, and rendering.
- [x] 1.2 Remove agency-links consumers; preserve agency phones and forms.
- [x] 1.4 Use agency.parent_federal_agency_id in federal/agency loaders, projections, redirects, and schema validation.
- [x] 1.3 Remove location-report projections and display contracts; update schema checks and redirects.

## 2. Verify

- [x] 2.1 Review scoped diffs and scan for remaining dropped-table references.
- [x] 2.2 Run schema validation, projection refresh, relevant page checks, and aggregate validation.
- [x] 2.3 Record verification results and retrospective, including the resolved discipline fixture blocker.

## 3. Release verification

- [x] 3.1 Resolve the missing discipline fixture without weakening assertions; rerun aggregate validation.
- [x] 3.2 Configure bounded parallel static rendering as requested.
- [ ] 3.3 Complete the full static build and record its final checks.
