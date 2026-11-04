# State Licensing Authority Implementation Plan

Use superpowers:subagent-driven-development for bounded implementation and review, using the existing redesign-civic-index-pages worktree.

**Goal:** State authority pages plus sourced manual authority records.
**Architecture:** Existing Astro pages/loaders, direct DB state/authority relationships, existing intake manual source.
**Tech Stack:** Astro, TypeScript, PostgreSQL, Playwright; intake TypeScript and canonical IO.
**Spec:** specs/state-licensing-authority/spec.md

## Task 1: Website

- [x] Write failing focused tests for route identity, empty/present sections and state/personnel links.
- [x] Add a licensing authority loader and /[category]/licensing-authority/index.astro. Reuse existing styles/components. Exact DB paths, no props route identity, one authority match required.
- [x] Render authority identity/official website, license summaries/action summaries, directly attributed discipline with personnel/source links. Omit education and empty record sections.
- [x] Link state pages and personnel licenses to the authority page. Require consumed columns in schema contract. Do not change unrelated personnel filters or pre-existing validation changes.
- [x] Run focused tests, typecheck, lint/format; report evidence. No commits or deployment.

## Task 2: Verified manual records

- [x] Verify all 50 states and DC against official authority pages; preserve source URLs and uncertainty.
- [x] Add LicensingAuthority to intake manual source's accepted kinds with failing then passing focused test.
- [x] Acquire records through existing manual source, preserving TX/MN identities; transform/generate and inspect mutations before scoped application. Verify DB authority/state joins and durable source mappings. No reset or unrelated pending mutations.

## Task 3: Verification and review

- [x] Run aggregate validation, inspect actual desktop/mobile pages and no-inline-CSS behavior, review changes independently, record limitations without disabling tests.
- [x] Complete verify/retrospective and archive after checks pass. Leave changes uncommitted for user review.
