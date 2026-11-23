## Why

Cases tied to a staff member's job at another agency no longer appear on the agency page. The civil-case count rule now credits an agency only with cases tied to its own staff records, so cases from a staff member's job at another agency no longer appear on the agency page. In the local data (2026-11-17), 87 agencies have no own cases but have cases from staff members' other jobs. A separately labeled view restores that information without crediting the agency with cases it was not part of.

## What Changes

**Agency page civil cases**

- From: the agency page shows only the agency's own civil cases (cases tied to this agency's `agency_personnel` rows).
- To: the agency page also shows a separate section, "Cases from staff members' other jobs", with its own count, listing distinct cases tied to another agency's assignment for people who are or were on this agency's staff.
- Reason: answer the visitor's question about the agency's staff without changing the agency's own record.
- Impact: non-breaking; the own-case tile, count and list are unchanged.

**Agency civil-cases page**

- From: lists only the agency's own cases; the page exists only when the agency has own cases.
- To: lists the agency's own cases under their own heading, then a second table for cases from staff members' other jobs; one page control serves both lists (page N shows page N of each list); the page exists when either list has rows (a page selection rule, which stays in the site until intake's `site_topic_page` view holds it).
- Reason: the civil-cases page is where the full lists are paged.
- Impact: some agencies with zero own cases gain a civil-cases page again; pages 2 and up follow the longer of the two lists.

## Capabilities

### New Capabilities

- `agency-staff-other-job-cases`: the separate agency-page and agency civil-cases-page view of cases tied to staff members' jobs at other agencies, its count, labels, ordering and page eligibility.

### Modified Capabilities

- `civil-case-content`: "Civil case counts follow personnel assignments" now limits the own-assignment rule to the agency's count, tile and own list, and allows one separate "Cases from staff members' other jobs" section that never adds to that count.

## Impact

- Code: `src/lib/data/agency-detail.ts`, `src/lib/data/agency-civil-case-rows.ts`, new `src/lib/data/agency-civil-case-rows.test.mjs`, `package.json` (`test:data`), `src/lib/sitemap-lastmod.js`, new `src/lib/data/staff-other-job-case-sql.js`, the agency `index.astro`, `civil-cases/index.astro`, `civil-cases/page/[...page].astro`, `src/components/AgencyCivilCasesPage.astro`, new `src/components/AgencyStaffOtherJobCases.astro`, `tests/e2e/civil-cases.spec.ts`, the EGM.md contracts listed in plan Task 5, and `AGENTS.md` (the civil-case Agency bullet: "These cases may appear only in the separate 'Cases from staff members' other jobs' section, with its own count, never summed.").
- Data: read-only use of `public.civil_case_personnel`, `public.agency_personnel`, `public.agency`, `public.location_path`, `public.personnel`, `public.civil_cases`, `public.build_page_payload`. No schema change. The other-jobs list follows recorded foreign keys only (owner decision, 2026-11-22: "the site follows explicit FK relationships in the database ... Chains like other-job cases may be a database view or projection"). Intake proposes the view `site_agency_staff_other_civil_case` (intake change `supply-site-display-data`); when it exists, the site reads it instead of its own SQL fragment (task 5.1).
- Public trust: labels must state that the cases are tied to the person's job at another agency, not to this agency. No section copy that claims verification, accuracy, fault, misconduct, or that this agency was a party (spec "Other-jobs labels describe the link without judgment"). Evidence: e2e checks that compare the section's rows and count with SQL, and that the own-case count is unchanged.
- Backward compatibility: no breaking changes.
