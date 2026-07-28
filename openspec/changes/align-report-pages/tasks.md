## 1. Storage Verification and Data Layer

- [x] 1.1 Trace the `/report/new` draft endpoint's persistence: map every collected field (matrix in brainstorm.md) to its actual column/table; record the outcome per field in the report (present / present-under-other-name / missing).
- [x] 1.2 For fields that are displayed-by-ruling but genuinely missing storage: add additive migrations + `validate-schema-contract.mjs` entries (repo data rules — explicit values, no silent fallbacks); for fields stored under other names, map explicitly in the loader.
- [x] 1.3 Extend the report-detail loader to expose the newly displayed fields (submitter relationship, incident time, interaction type, setting, complaint filed, case number, bodycam requested, feelings, charge outcome) — each nullable, rendered only when present.
- [x] 1.4 Fix agency personnel report counts: replace `officers_stats.review_count` in `src/lib/data/agency-detail.ts` with the live `count(distinct ro.review_id)` join through `agency_officers` (same shape as `src/lib/data/personnel.ts`).

## 2. Report Detail Template Port

- [x] 2.1 Port the report detail template to the `report-detail-v5.html` structure using shared components (Breadcrumb, fact-list, detail-layout, tokens only, no inline CSS/JS); keep the route and `data-pagefind-body` tagging.
- [x] 2.2 Remove per-officer rating sections/RatingBadges from report detail (personnel/agency surfaces untouched).
- [x] 2.3 Render the extended fact-list rows when-present per the parity spec, including "Submitted by" and submitter-provided "Charges" (charge outcome pending intake migration); never render reporter identity/contact fields.
- [x] 2.4 Add the labeled subjective section for stored feelings content, and rewrite the aside copy to explain the facts/feelings separation (8th-grade, non-hedging, "experience" wording).

## 3. Tests and Verification

- [x] 3.1 Update/add e2e assertions: report detail shows extended facts when present and omits absent rows; no rating badges on report detail; labeled subjective section renders only with content; agency personnel counts are non-zero for officers with linked reports (write; runs on CI).
- [x] 3.2 In-session verification: `npm run validate:types` 0 errors; eslint clean on touched files; dev-server spot-check of one report detail page and an agency personnel page showing live counts.
- [ ] 3.3 CI gates (deferred, PR conditions): `npm run validate`, `npm run build`, `npm run audit`; verify migrations/contract additions pass schema validation.
- [x] 3.4 Run `openspec validate --all`; parity table in the spec matches implemented dispositions.
