# Reset database visitor coverage implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development for implementation and review.

**Goal:** Useful records from almost every public table appear on generated visitor pages, with a verified current PR preview.
**Architecture:** Extend existing canonical entity routes, loaders, and shared components. No generic database dump or new routing system.
**Tech Stack:** Astro, TypeScript, PostgreSQL, Playwright.
**Spec:** specs/public-record-coverage/spec.md

## Global Constraints

Reuse current worktree and branch; preserve unrelated dirty work. No DB/schema writes, dependencies, generated entity IDs, speculative abstractions, fallback missing required fields, inline CSS, or form disabling. Read DESIGN.md and .impeccable.md. User has authorized necessary changes and preview publication; no production deploy. Tests must run against the reset schema. Coordinator owns commits and release to keep reviewable combined changes.

## Task 1: Personnel arrest profiles and source attribution

- [x] Read /tmp/pc-records-audit.md and /tmp/pc-arrest-profile-sample.json. Add focused failing tests for live arrest-profile rendering, all seven dimensions and their rows/shares, correct association to personnel and agency, omission for absent records, and optional death-source link.
- [x] Create src/lib/data/arrest-profiles.ts and src/components/PersonnelArrestProfiles.astro; integrate in src/pages/personnel/[slug]/index.astro. Add required arrest_profile columns to scripts/validate-schema-contract.mjs. Minimize queries: preload the set/map of 320 profile-bearing personnel once per build rather than one DB call for each of 140,552 pages.
- [x] Show recorded total, covered months, source label, linked agency, and every by_year, by_month, by_iso_week, by_day_of_week, by_offense, by_charge_level, by_district value. Pair counts with percentage of that profile total; preserve source labels, temporal ordering, and unknown buckets. Use accessible tables and details for long lists. Label district codes as source codes without interpreting locations. State counts are recorded arrests associated with this assignment, not safety or misconduct measures; no unique agency totals or unsupported peer rank. Do not fabricate source URLs.
- [x] Surface deceased_source as an optional source link beside the existing deceased notice. Include stored prefix/middle name/suffix in the personnel full name using existing shared name formatting if available. Label the header agency as current only when hasCurrentAssignment is true; otherwise use Most recent agency. Link assignment history to the actual associated license when license_id supplies that relationship, reusing the license section/card rather than inventing a new route.
- [x] Run targeted tests and type/lint checks; record exact red/green evidence. No commit or subagents from implementer.

## Task 2: All agencies and omitted report/case facts

- [x] Read /tmp/pc-civic-audit.md. Add focused failing tests showing every agency has a projection, the previously excluded agency page resolves, how_felt and desired_outcome display, and date_terminated appears.
- [x] Remove linked-record eligibility filtering from scripts/refresh-build-projections.mjs, preserving authoritative place path joins and strict identity. Make each agency available through existing location navigation; refresh projections after edits.
- [x] Use actual report columns and display present desired_outcome, how_felt, what_happened, what_else, purpose where meaningful without replacing authored description. Keep labeled subjective/context fields whenever present even when their words also occur in the description. Only omit an additional what_happened paragraph when its entire normalized text equals the entire existing description. Preserve the approved report-pages requirement suppressing per-person ratings and reporter identity; these are intentional exceptions, not coverage gaps. Add Closed date and separately labeled incident geography to civil-case page; use actual display_name/path joins. Display known Updated dates on case/report pages. Preserve source attribution and report author voice. For any source sample with empty values, regression uses rollback-only data or pure model/component checks rather than weakening assertions or persisting fake rows.
- [x] Ensure existing coverage-link records have a reader-facing display on their linked personnel/agency page when present, retaining publication dates and notes; no fabricated report/case relationships.
- [x] Update tests/e2e/report-pages.spec.ts to current tables/columns and remove missing-schema skips: fixtures must fail loudly when unexpectedly unavailable. Preserve the no-rating/no-reporter-identity assertions. Run targeted tests/typechecks and report exact evidence; no commit or subagents from implementer.

## Task 3: Integration coverage and release

- [x] Complete coverage.md with every current public table, count, consumer and visitor use, or clear internal-only purpose; distinguish empty data from missing implementation.
- [x] Review both tasks and existing schema-adaptation diff. Resolve material findings with focused fixes and re-review.
- [x] Format, aggregate validate, full build, generated-HTML coverage checks and batched desktop/mobile inspection. No partial build can be deployed.
- [ ] Record evidence/retrospective, archive completed OpenSpec changes, commit, sync current branch without creating worktrees/branches, and publish the exact final build to PR 3 preview. Verify remote paths/assets/search and build identity; report URL and limitations.
