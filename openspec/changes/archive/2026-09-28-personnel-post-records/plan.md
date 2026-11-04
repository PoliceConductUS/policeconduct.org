# Personnel POST Records Implementation Plan

Use subagent-driven-development in the existing redesign-civic-index-pages worktree. No commits or database mutations; preserve existing dirty work. Spec: specs/personnel-post-records/spec.md. User's direct request approves the scoped implementation.

## Task 1: Data layer

Own src/lib/data/licensing.ts (discipline), new src/lib/data/personnel-education.ts, scripts/validate-schema-contract.mjs and tests/e2e/personnel-post-data.spec.ts. Test before implementation; real queries preferred, fixture DB adapter allowed when needed to prove absent/multiple assignment shapes without DB writes. DisciplineRecord fields: id/action/effectiveDate/expirationDate/caseNumber/documentUrl/allegation/violation/finding/chiefAction/sanction; authority {name,abbreviation,href}; agencies {id,name}[]. EducationRecord fields: id/name/completionDate/credits/sponsorName/sponsorInstructor, nullable where schema allows; credits string|null from pg numeric. Export loadEducationForPersonnel(personnelId). Keep current license/history functions intact. Dates select ::text. Direct discipline ownership, distinct agencies. Avoid preloading1.77mcourse rows; cacheperson-IDset if consistent. No index migration or missing-schema fallback. Run focused tests and types. Report RED/GREEN.

## Task 2: UI

Own src/pages/personnel/[slug]/index.astro, new PersonnelDiscipline.astro and PersonnelEducation.astro components, focused tests/e2e/personnel-post-ui.spec.ts and optional fixture file. Import agreed loader/types. Existing page wraps components in existing personnel-panel sections when nonempty; shared headings and responsive compact content. Discipline action summary plus authority/source/case/dates/linked agencies; details separate narrative fields and enddate. Education all fields, newestdatefirst, ten visible records, full-list search, counts, reset, no-match, native keyboard controls/noJS access. No speculative generic framework or unrelated authority edits. Add only needed scoped CSS, external at build. Browser tests verify allstoredrecords and source/details plus noeducation emptycase. Native browser tool unavailable/stalls; use local Playwright render checks. Testbeforecode, no DBwrites or skip changes. Report RED/GREEN.

## Task 3: Verification

Independent scoped review, aggregate npm run validate, desktop/mobile screenshots and scoped axe, no-inline source check. Fix concrete defects only. Record evidence and archive. Leave worktree uncommitted.
