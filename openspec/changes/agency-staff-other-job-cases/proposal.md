## Why

Visitors looking at an agency want to know whether anyone who works or worked there has been part of a civil case. The civil-case count rule now credits an agency only with cases tied to its own staff records, so cases from a staff member's job at another agency vanish from the agency page; 87 agencies lose every case. A separate, clearly labelled view restores that information without crediting the agency with cases it was not part of.

## What Changes

**Agency page civil cases**

- From: the agency page shows only the agency's own civil cases (cases tied to this agency's `agency_personnel` rows).
- To: the agency page also shows a separate section, "Cases from staff members' other jobs", with its own count, listing distinct cases tied to another agency's assignment for people who are or were on this agency's staff.
- Reason: answer the visitor's question about the agency's staff without changing the agency's own record.
- Impact: non-breaking; the own-case tile, count and list are unchanged.

**Agency civil-cases page**

- From: lists only the agency's own cases; the page exists only when the agency has own cases.
- To: lists the agency's own cases, then a second paginated table for cases from staff members' other jobs; the page exists when either list has rows.
- Reason: the full list belongs on the dedicated page.
- Impact: some agencies with zero own cases gain a civil-cases page again.

## Capabilities

### New Capabilities

- `agency-staff-other-job-cases`: the separate agency-page and agency civil-cases-page view of cases tied to staff members' jobs at other agencies, its count, labels, ordering and page eligibility.

### Modified Capabilities

- (none) — `civil-case-content` "Civil case counts follow personnel assignments" is unchanged; the new view is additional and never changes that count.

## Impact

- Code: `src/lib/data/agency-detail.ts` (new query and rows), `src/lib/data/agency-civil-case-rows.ts`, `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro`, `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/**`, `src/components/AgencyCivilCasesPage.astro` (or a sibling component), their EGM.md contracts, and e2e specs.
- Data: read-only use of `public.civil_case_personnel`, `public.agency_personnel`, `public.agency`, `public.location_path`, `public.personnel`, `public.civil_cases`. No schema change.
- Public trust: labels must state that the cases are tied to the person's job at another agency, not to this agency, with no conduct or verification claims. Evidence: e2e checks that compare the section's rows and count with SQL, and that the own-case count is unchanged.
- Backward compatibility: no breaking changes.
