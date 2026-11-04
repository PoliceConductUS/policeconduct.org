# Retrospective: align-report-pages

> Written: 2026-07-28 (after verify passed)
> Commit range: `942e9aa..0263cbe` (plus doc truth-up in the closeout commit)
> Worktree: `.worktrees/redesign-civic-index-pages` (branch `codex/redesign-civic-index-pages`)

---

## 0. Evidence

- **Commit range**: `942e9aa..0263cbe` — 8 commits (3 feat/fix data+template, 1 test, 1 fix round, 3 openspec bookkeeping)
- **Tasks done**: 11/12 (`- [x]` count; 3.3 = CI gates, owner-deferred)
- **Subagent dispatches**: 7 (3 implementers, 3 task reviewers, 1 fixer)
- **New external dependencies**: none (uses existing `pg` for test fixtures)
- **OpenSpec validate at archive**: pass (5/5)
- **Test signal**: new `tests/e2e/report-pages.spec.ts` (CI-run); dev-server evidence for both subjective-section states and live counts

Commit chain:

```
942e9aa feat(openspec): propose align-report-pages
6058ca4 fix(openspec): SHALL on first line of subjective-section requirement
044ac90 feat(report-data): expose report parity facts and fix live report counts
f129976 fix(report-data): decouple contract from intake migration; collapse uncollected fields
1cbdd9a chore(openspec): align tasks 1.x complete; drop uncollected fields from 1.3 enumeration
63f5566 feat(report-detail): port report detail page to redesign anatomy
eb424d7 chore(openspec): align tasks 2.x complete
580247a fix(report-detail): correct charges/charge-outcome provenance mismatch
0f0d1a5 test(report-pages): add e2e coverage for report detail parity and live counts
0263cbe chore(openspec): align tasks 3.x complete; truth-up stale charge-outcome prose
```

## 1. Wins

- [evidence: f129976 fix report] The self-contained-PR claim was **proven, not
  argued**: columns dropped from the live dev DB, schema validation + page
  render passed, DB restored. Deployability independent of the intake repo is
  demonstrated fact.
- [evidence: 044ac90 + reviewer re-query] The user-reported bug (0 reports for
  Minnesota State Patrol officers) was reproduced, root-caused to a stale
  projection, fixed with the live join, and verified twice independently.
- [evidence: 63f5566 T2 report] Both states of the labeled subjective section
  were verified empirically (temporary dev-DB edit, reverted) — conditional
  rendering claims backed by observation.
- [evidence: 580247a] The parity discipline caught its own spec: the
  "editor-added charge outcome" framing contradicted the column's
  submitter-entered provenance; the truth-up realigned label, spec, matrix,
  and pending-column list.
- [evidence: brainstorm.md matrix] Field-level dispositions (including two
  owner-ruled collapses and privacy-absolute reporter fields) are now codified
  where future form/model/display changes will trip over them — the drift the
  owner flagged can't silently recur.

## 2. Misses

- 🟡 [painful | evidence: T1 report "Key discovery"] The plan assumed
  `supabase/migrations/` in this repo owned the schema; the real migration
  home is the external `intake` repo. Cost: a fix round to decouple the
  contract. Lesson: verify which repo owns a schema before planning migration
  tasks.
- 🟡 [painful | evidence: T1 review Important] The first commit's contract
  entries would have hard-broken every build without the external migration —
  caught by the reviewer's focused check, resolved by the owner's
  self-contained ruling. The "additive contract entry" instinct is wrong when
  the column's provenance is another repo.
- 📌 [nit | evidence: T3 review Minor] Change-doc prose (design/plan/tasks)
  lagged the spec truth-up and needed a sweep — multi-file narrative docs
  drift when only the binding files are updated.
- 📌 [nit | evidence: T3 review Minor] Present-side parity assertions blocked
  by all-null seed data; deferred to a `buildReportFacts` unit test or richer
  seeds.

## 3. Plan deviations

| Plan task          | What changed                                                                                                             | Why                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| 1.2 migrations     | No in-repo migration; SQL documented for the intake repo; contract entries added then removed (owner: self-contained PR) | Schema ownership lives in `PoliceConductUS/intake` |
| 1.3 field set      | `purpose`/`records requested` collapsed from display set                                                                 | Owner ruling — not actually collected by the form  |
| 2.x charge outcome | "Charge outcome" → "Charges" (submitter-provided); outcome deferred to pending intake column                             | Provenance truth caught in T2 review               |
| 3.x tests          | DB-driven fixtures via `pg` instead of hardcoded slugs                                                                   | Brittleness constraint in the brief                |

## 4. Skill / workflow compliance

| Skill                                      | Used                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| superpowers:brainstorming                  | ✅ (matrix-first; three owner rulings gathered up front, two more mid-cycle)            |
| superpowers:writing-plans                  | ✅ (compact plan; repo-precedent style)                                                 |
| superpowers:using-git-worktrees            | ✅ (same repo-convention worktree, continuing branch)                                   |
| superpowers:subagent-driven-development    | ✅ (7 dispatches, ledger-tracked)                                                       |
| (transitive) test-driven-development       | ⚠️ partial — e2e written not run (owner no-build rule); dev-server evidence substituted |
| (transitive) requesting-code-review        | ✅ (3 task reviews, 1 fix re-proof)                                                     |
| superpowers:finishing-a-development-branch | pending (PR is the next action)                                                         |

## 5. Follow-ups

Unit-test `buildReportFacts` (present-side parity) or extend seed data;
confirm CI `DATABASE_URL` for Playwright; intake-repo migration (8 columns +
`charge_outcome`) with contract entries restored when it lands; `/report/new`
visual restyle (needs its own design); rating-data resurfacing is an explicit
future product decision.
