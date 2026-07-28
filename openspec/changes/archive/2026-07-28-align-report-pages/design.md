## Context

Follow-up to the archived `2026-07-28-redesign-civic-index-to-production`
cycle, on the same branch, shipping in the same PR. The shared component
library (Breadcrumb, EntityActionBar, StatCell/StatStrip, TableScroll,
`--ipc-*` tokens) already exists; `report-detail-v5.html` is the approved
design reference. Owner rulings and the field matrix are recorded in
brainstorm.md. Constraints unchanged from the prior cycle: tokens-only
styling, no inline CSS/JS, WCAG 2.1 AA, no hedging copy, "experience"
terminology, no full builds in-session, repo data rules.

## Goals / Non-Goals

**Goals:**
- Report detail page renders the mockup structure with the three owner-ruled
  amendments (no ratings; labeled subjective feelings section; extended
  fact-list with when-present rendering).
- Documented, codified disposition for every collected field; verified storage
  path for every displayed field.
- Agency personnel report counts always reflect live records.

**Non-Goals:**
- No visual restyle of `/report/new` (no mockup exists; separate change).
- No modification of `interaction-submission-flow` requirements.
- No destructive schema changes; no display of reporter identity/contact.
- No route/slug changes.

## Decisions

1. **Parity via display extension, not collection trimming** (owner ruling) —
   the fact-list grows to cover collected context; fields render only when
   present so absent data never fabricates rows.
2. **Feelings shown, labeled** — a visually and semantically distinct section
   (own heading, explicit "submitter's account of how it felt" framing)
   separates subjective content from the factual body; aside copy rewritten to
   explain the separation. Rationale: owner ruling superseding the mockup's
   facts-only aside.
3. **Charges are submitter-provided; charge outcome is future editor-added** —
   charges render as a "Charges" fact when present; a true charge-outcome
   column is pending the intake migration and renders only once editorial
   data exists.
4. **Ratings removed from report detail only** — `review_officers` data and
   personnel/agency surfaces untouched.
5. **Counts via live join** — reuse `personnel.ts`'s
   `count(distinct ro.review_id)` pattern in `agency-detail.ts`; do not
   "fix" by refreshing projections (projection freshness is a build concern;
   correctness must not depend on it).
6. **Storage verification before display wiring** — for each matrix row marked
   "verify column": trace the draft endpoint's persistence; if a column is
   missing, add an additive migration + schema-contract entry; if present
   under a different name, map explicitly in the loader.

## Risks / Trade-offs

- [A displayed field turns out to have no storage and no migration appetite]
  → the field renders nothing (when-present rule) and the gap is recorded in
  the spec's parity table — alignment preserved by documentation, not
  fabrication.
- [Live count join slows the 100k-page build] → same query shape personnel.ts
  already runs at build; measure in CI alongside the existing Pagefind timing.
- [Feelings display invites sensational content] → labeled framing +
  existing moderation flow; the spec requires the label, not just styling.
- [Aside copy rewrite drifts from DESIGN.md tone] → 8th-grade, non-hedging
  copy rules apply; reviewed in the task review.

## Migration Plan

1. Storage verification pass → additive migrations/contract entries if needed.
2. Loader: report detail data (new fields) + `agency-detail.ts` count join.
3. Template port with rulings applied.
4. Tests: e2e assertions for parity rendering + count correctness.
5. In-session checks; full gates on the PR's CI. Rollback: revert commits;
   additive migrations are inert if unused.

## Open Questions

- Exact storage state of the "verify column" fields (resolved by
  implementation's verification pass; each outcome recorded in the spec's
  parity table).
