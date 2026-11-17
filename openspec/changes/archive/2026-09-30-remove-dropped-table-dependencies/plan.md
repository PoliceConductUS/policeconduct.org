# Dropped table consumer removal implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement these tasks.

**Goal:** Restore site operation against the current schema without inventing replacement data.
**Architecture:** Remove each retired relationship through query, type, and render layers. Retain surviving sources and strict errors.
**Tech Stack:** Astro, TypeScript, PostgreSQL, Playwright.
**Spec:** specs/current-schema-consumers/spec.md

## Global Constraints

Reuse the current worktree. The 2026-09-29 continuation authorizes fixture repair, full validation/build, archive, commit, push, and production deployment. The user also requested parallel profile rendering; set Astro build concurrency to 8. No database schema changes, new dependencies, or form suspensions. Read DESIGN.md and .impeccable.md before template changes. No fabricated empty arrays/counts replacing removed sources.

## Task 1: Reports and civil cases

- [x] Remove dropped report tags/attachments/witnesses and coverage relationships from report-detail.ts, coverage.ts, civil-litigation-detail.ts and their route templates.
- [x] Retain review_links, civil_case_links, personnel-linked coverage, and current forms. Remove unsupported report/case cross-links rather than infer them from shared personnel.
- [x] Validate relevant types and rendering; report changes and evidence.

## Task 2: Agencies and federal pages

- [x] Remove agency_links consumers from agency-detail.ts and its dependent page; reviewed in the previous turn.
- [x] Add a meaningful regression check for current database-backed branch counts, office URLs, and branch parent links. Capture the current failure against the retired table before changes.
- [x] Replace federal_agency_branch joins in src/lib/data/federal-agencies.ts and src/lib/data/agency-detail.ts with agency.parent_federal_agency_id = federal_agency.id.
- [x] Update scripts/refresh-build-projections.mjs branch eligibility to parent_federal_agency_id IS NOT NULL, retaining canonical paths through location_path.
- [x] Update scripts/generate-redirect-map.mjs to load linked branch agencies via the new field, keeping existing redirect paths.
- [x] Require parent_federal_agency_id's presence (nullable) in scripts/validate-schema-contract.mjs; remove the retired join-table contract.
- [x] Validate schema, projection refresh, regression check, and relevant types. Preserve existing federal UI and all unrelated changes.

## Task 3: Projections and contracts

- [x] Remove non-federal dropped-table contract entries and location report projection logic. Federal consumers migrate to the replacement FK in Task 2.
- [x] Remove locationReport payload/types/render consumers (avoid federal-agencies.ts owned by Task 2; notify it of contract change).
- [x] Run schema validator and refresh against live current schema, preserving required-data failures.
- [x] Report affected files and verification.

## Task 4: Integration review and verification

- [x] Review all task diffs for completeness and scope.
- [x] Run aggregate validation, build/affected route checks, and retired-reference scan.
- [x] Record verification and retrospective.
