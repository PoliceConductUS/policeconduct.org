# Agency Status Implementation Plan

> Use superpowers:subagent-driven-development for this single bounded implementation task and review.

**Goal:** Display stored agency status and status_date prominently when non-active and consistently in metadata.
**Architecture:** Existing loader and page header; one status presentation source for HTML and metadata.
**Tech Stack:** Astro, TypeScript, PostgreSQL, Playwright.
**Spec:** specs/agency-status/spec.md

## Global constraints

No database mutations, new dependencies, route changes, unrequested copy or other behavior. Follow DESIGN.md. Missing optional values are omitted; missing columns fail. No inline generated CSS. Read AGENTS.md.

## Task 1: Agency status display and metadata

- [x] Add focused tests first and demonstrate expected failure. Use existing real DB records for page coverage and isolated fixtures for optional values/date boundaries without changing the shared database.
- [x] In src/lib/data/agency-detail.ts explicitly select a.status and a.status_date::text as status_date after a.\*.
- [x] In scripts/validate-schema-contract.mjs require both columns but not NOT NULL.
- [x] In src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro show available status/date in the header, prominent for non-active. Reuse existing visual tokens/colors. Keep formatting/metadata logic small; a helper/component is appropriate only to share testable presentation logic.
- [x] Propagate status/date into descriptions and non-active status into titles via PageShell/SiteLayout and JSON-LD; preserve organization name and URLs.
- [x] Run focused coverage, Astro check, format/lint, schema checks. Record evidence, update tasks. Do not commit until instructed by parent.

Parent runs aggregate validation, visual verification, final review and workflow completion.
