# Align Report Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align what `/report/new` collects, what the data model stores, and what the report detail page displays post-approval; port the detail page to the approved mockup with owner rulings; fix stale agency personnel report counts — all on the existing redesign branch for the same PR.

**Architecture:** Storage-verification-first (no display without a verified column), then loader extension, then template port on the existing shared components, then tests. Counts move from the `officers_stats` projection to the live join `personnel.ts` already uses.

**Tech Stack:** Astro, TypeScript, PostgreSQL (supabase migrations + schema contract), existing `--ipc-*` token system and shared components from the archived redesign cycle.

## Global Constraints

- Tokens-only styling; no inline CSS/JS; WCAG 2.1 AA (labeled subjective section needs a real heading, not just styling); "experience" wording; no hedging strings.
- Repo data rules: entity IDs from explicit values; additive migrations only; missing required data fails builds; display rows render only when data present.
- Reporter name/email/phone/contact preference/consent NEVER render.
- `interaction-submission-flow` spec requirements unchanged; `/report/new` visual restyle out of scope.
- No `npm run build`/full e2e in-session (owner rule): verify via `astro check`, eslint, dev-server spot-checks; full gates ride the PR's CI.
- References: `mockups/civic-index-redesign/report-detail-v5.html` (do not modify mockups/), brainstorm.md parity matrix, specs in this change.

---

## Task 1: Data layer — storage verification, loader, counts (tasks.md §1)

**Files:**

- Inspect: `src/pages/report/new/index.astro` (draft endpoint), `supabase/migrations/`, `scripts/validate-schema-contract.mjs`
- Modify: report-detail loader (locate via the detail template's data import), `src/lib/data/agency-detail.ts`
- Create (only if verification finds missing columns): additive migration + contract entries

- [ ] **Step 1: Trace persistence** — follow the draft endpoint's write path; produce the per-field outcome table (present / other-name / missing) in the task report.
- [ ] **Step 2: Migrations/contract** — only for displayed-by-ruling fields that are missing; additive, contract-listed.
- [ ] **Step 3: Loader extension** — expose the matrix's displayed fields, nullable.
- [ ] **Step 4: Live counts** — port `personnel.ts`'s `count(distinct ro.review_id)` join into `agency-detail.ts`; delete the `officers_stats.review_count` read for this surface (rating passthrough may remain for pages that still use it).
- [ ] **Step 5: Verify + commit** — `npm run validate:types` 0 errors; eslint clean. Commit `feat(report-data): …`.

## Task 2: Report detail template port (tasks.md §2)

**Files:**

- Modify: `src/pages/[category]/[administrativeArea]/[place]/reports/[year]/[month]/[day]/[slug]/index.astro` (+ its stylesheet home, `civic-ledger.css` or equivalent)

- [ ] **Step 1: Structure port** — kicker/title/lede, fact-list, detail-layout body ("What happened") + aside, shared Breadcrumb, tokens only; keep `data-pagefind-body` and the terminology rules.
- [ ] **Step 2: Rulings** — remove RatingBadge/rating sections; extended when-present fact rows incl. "Submitted by" and submitter-provided "Charges" (charge outcome pending intake migration); labeled subjective section (own `h2`, framing copy) rendered only with content; aside copy rewritten (8th-grade, explains facts/feelings separation).
- [ ] **Step 3: Verify + commit** — types/eslint clean; dev-server render of a report page: structure present, no ratings, no reporter identity, absent fields produce no rows. Commit `feat(report-detail): …`.

## Task 3: Tests + closeout (tasks.md §3)

**Files:**

- Modify/create: relevant e2e spec under `tests/e2e/`

- [ ] **Step 1: e2e assertions** (written; CI-run): parity rendering, no-ratings, labeled-section conditionality, live personnel counts.
- [ ] **Step 2: Spot-checks** — dev-server: one report detail page + `/mn/ramsey-county/saint-paul/minnesota-state-patrol-d4e5f6/personnel/` non-zero counts (after `npm run refresh:build-projections` is NOT required — counts must be live).
- [ ] **Step 3: `openspec validate --all`**; mark tasks; commit `test(report-pages): …`.
