## Why

The archived `redesign-civic-index-to-production` cycle ported the site's
chrome and civic-index/agency/personnel/civil-case surfaces but never included
the experience-report pages, leaving visible drift: the report detail page
still renders the pre-redesign body (and per-officer ratings the design policy
forbids), and what `/report/new` collects, what the data model stores, and
what the detail page displays have never been reconciled. The owner requires
three-way field alignment in the same PR, plus a data-correctness fix: agency
personnel pages render 0 reports from a stale projection while reports exist.

## What Changes

**Report detail page port (with owner-ruled amendments)**

- From: Pre-redesign body — legacy breadcrumbs, Bootstrap-flavored headings,
  per-officer RatingBadge sections.
- To: The `report-detail-v5` mockup structure on shared components (Breadcrumb,
  fact-list, detail-layout body/aside, TableScroll where needed, tokens only),
  amended per owner rulings: no rating display; a clearly-labeled subjective
  "how it felt" section; extended fact-list; aside copy explaining the
  facts/feelings separation.
- Reason: Uniform site; the mockup is the approved design; rulings recorded
  in brainstorm.md.
- Impact: User-visible redesign of report detail pages; no route changes.

**Collection ↔ storage ↔ display parity**

- From: ~20 collected fields with undocumented display fates; "charge outcome"
  displayed but never collected; reporter identity handling implicit.
- To: Every field has one codified disposition (see brainstorm matrix):
  displayed facts render when present; feelings display labeled as subjective;
  charge outcome is explicitly editor-added post-approval; reporter
  identity/contact/consent are internal-only. Every displayed field has a
  verified storage path — genuinely missing columns get migrations + schema
  contract entries; display renders only when data is present (no silent
  fallbacks, no placeholder fabrication).
- Reason: Owner requirement — the three surfaces must agree.
- Impact: Possible additive migrations/contract entries; report detail
  displays more collected context; `/report/new` UX unchanged (its visual
  restyle is explicitly out of scope — no mockup exists).

**Live report counts on agency personnel pages**

- From: `agency-detail.ts` reads `officers_stats.review_count` (projection;
  stale/empty ⇒ renders 0 while `review_officers` rows exist).
- To: The same live `count(distinct review_id)` join `personnel.ts` already
  uses, so counts always reflect actual records.
- Reason: Data correctness is the trust model; observed live on
  `/mn/ramsey-county/saint-paul/minnesota-state-patrol-d4e5f6/personnel/`.
- Impact: Correct counts; slightly more query work at build time.

## Capabilities

### New Capabilities

- `report-pages`: Experience-report detail presentation and the
  collection-to-display parity contract (field dispositions, subjective-section
  labeling, editor-added provenance, reporter privacy).

### Modified Capabilities

- `civic-index-pages`: Add a record-count integrity requirement — displayed
  per-officer/per-agency record counts derive from live record joins (or
  demonstrably fresh projections), never rendering zero when source records
  exist.

## Impact

- **Code**: report detail template + its loader; `/report/new` only if a
  collected field lacks persistence (endpoint/storage verification);
  `agency-detail.ts` count query; possible additive `supabase/migrations` +
  `scripts/validate-schema-contract.mjs` entries.
- **Data**: additive-only schema changes where verification finds a displayed
  field without storage; no destructive migrations; repo data rules apply
  (explicit values, no silent fallbacks, missing required data fails builds).
- **Specs**: `interaction-submission-flow` requirements are NOT modified (the
  form's UX stands); display-side rules live in the new `report-pages` spec.
- **Backward compatibility**: no route/slug changes; ratings disappear from
  report detail (intentional, owner-ruled).
- **Validation**: in-session `astro check`/eslint/dev-server checks (owner's
  no-full-build rule); full gates (`validate`, `build`, `audit`) ride the PR's
  CI as release conditions.
