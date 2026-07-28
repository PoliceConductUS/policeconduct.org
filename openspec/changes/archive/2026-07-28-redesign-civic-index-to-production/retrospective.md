# Retrospective: redesign-civic-index-to-production

> Written: 2026-07-27 (after verify passed)
> Commit range: `5090a4d..6593b8a`
> Worktree: `.worktrees/redesign-civic-index-pages` (branch `codex/redesign-civic-index-pages`)

---

## 0. Evidence

- **Commit range**: `5090a4d..6593b8a` (17 commits: 5 feat, 4 fix, 8 openspec bookkeeping/verify)
- **Diff size**: +2678 / −889 lines across 90 files
- **Tasks done**: 26/34 (`grep -cE '^\s*- \[x\]' tasks.md` → 26; the 8 open boxes are CI-deferred gates per owner's no-full-build instruction — see verify.md §2)
- **Active hours**: ~2.5 wall-clock for the apply phase (single controller session, sequential subagents)
- **Subagent dispatches**: 20 (5 implementers, 5 task reviewers + 1 user-killed re-dispatch, 4 fixers, 4 re-reviewers, 1 final whole-branch reviewer)
- **New external dependencies**: `pagefind@^1.5.2` (MIT, devDependency, build-time indexer); `@fontsource/public-sans@^5.3.0` (font under SIL OFL 1.1, dependency — placement matches the repo's existing `bootstrap` convention)
- **Bugs encountered post-merge**: n/a (not yet merged; CI gates pending)
- **OpenSpec validate state at archive**: pass (3/3 items, re-run at verify)
- **Test coverage signal**: e2e specs updated/added (`civic-index.spec.ts` empty-state behavior test, `site-search.spec.ts` JS + no-JS paths); suites deliberately not run in-session (full-build constraint) — CI executes them

Commit chain (chronological):

```
d7ff4e4 feat(tokens): map redesign tokens onto --ipc-*, self-host fonts/icons
578f1fe chore(openspec): mark tasks 1.1-1.5 complete
ca91d88 feat(chrome): add MastheadSearch, EntityActionBar, SocialLink, Breadcrumb
1f02173 feat(chrome): group contact identity; consolidate jump-form into shared script
848a26f feat(chrome): give every page's <main> an id="main" for the skip link
b9e4c04 fix(chrome): restore quiet masthead links, token-derive shadow, dedupe/document review findings
7175222 chore(openspec): mark tasks 2.x complete
7773d7c feat(surfaces): shared stat strip, drill cell, split records, field offices
67f8ad1 fix(surfaces): migrate FatalForceIncidentsPage to Breadcrumb, label pending topics section
df3391f chore(openspec): mark tasks 3.x complete
43b820a feat(search): self-hosted Pagefind index and masthead search
a69a4d9 fix(search): close Task 4 review gaps in Pagefind indexing and search panel
5f7f01d chore(openspec): mark tasks 4.x complete
cb12323 feat(copy): rename interaction to experience site-wide
9aecefc chore(openspec): mark tasks 5.x complete
2db0aea fix(review): wire SocialLink into agency links; AA-safe empty-state text
6593b8a chore(openspec): verify artifact — PASS pending CI gates
```

---

## 1. Wins

- [evidence: d7ff4e4; task-1 review "contrast computation independently reproduced"] Token port landed exactly on spec values (`--ipc-color-ink-faint` at the mandated oklch(52%…), fixed-rem H1) and the reviewer reproduced every contrast ratio from scratch — the WCAG work done in the mockup phase transferred losslessly.
- [evidence: 848a26f; task-2 review "60/60 covered, no duplicates"] The skip-link sweep adapted the plan (pages own `<main>`, so wrapping the slot would have produced invalid nested landmarks) and the reviewer independently verified all 60 files — a plan-deviation done right: disclosed, justified, verified.
- [evidence: 7773d7c; dev-server spot checks in task-3 report] The largest task (24 files, +1104/−661) shipped with live-rendered verification of five page types despite the no-build constraint — dev-server spot-checks proved the drill cell, split sections, and empty-state pattern on real pages.
- [evidence: review trail 578f1fe→2db0aea] The two-tier review structure earned its cost: per-task reviews caught 8 Important findings, and the final whole-branch review caught 2 more that were *invisible per-task* (dead `SocialLink` component, `#8d9bb4` empty-state contrast) — exactly the cross-task class of defect the final gate exists for.
- [evidence: cb12323; task-5 review "scope discipline is real"] The rename respected data contracts precisely: display strings renamed with grammar fixes, `interactionType` form field and slugs untouched — zero route/contract drift, confirmed by the reviewer's identifier scan.
- [evidence: 43b820a scratch-run in task-4 report] The implementer validated Pagefind's real export surface and output shape (no `.html` emitted → `validate:no-inline-css` ordering safe) via a scratch run instead of assuming — de-risking the CI-deferred build step.

## 2. Misses

- 🟡 [painful | evidence: task-4 review finding #1] The Task 4 implementer's report claimed federal coverage was handled "via CivicIndexPage" — but federal *entity* pages use `CivicAgencyHierarchyPage`, which was unindexed. The task reviewer caught the misclaim by checking the actual template. Lesson: coverage claims that enumerate templates need the enumeration verified, not narrated.
- 🟡 [painful | evidence: b9e4c04, 2db0aea] Token discipline leaked twice (raw `oklch()` shadow literal; legacy `#8d9bb4` untouched by Task 1's sweep despite task 1.3's completion mark). The Task 1 sweep migrated the `:root` palette but not all *consumers* of legacy hexes — a "define tokens" vs "migrate usages" scope seam that cost two fix rounds.
- 🟡 [painful | evidence: task-2/task-3 carry-forwards; final review Important #1] Components built in one task but wired in a later one (`SocialLink`, `EntityActionBar`) repeatedly drifted toward dead code — `SocialLink` reached the final review with zero callers because its consumer data wasn't platform-typed. Building a component and its first consumer in the same task would have surfaced the data-model gap immediately.
- 📌 [nit | evidence: final-review-fixes.md controller correction] Two subagent reports contained arithmetic slips (19 vs 21 remaining rename hits; "3" vs 5 extra migrated selectors). Neither affected code correctness; both were caught by reviewers. Counts in reports need the same verification as claims.
- 📌 [nit | evidence: ledger "Task 2 rev killed"] One reviewer dispatch was killed by the user mid-run and re-dispatched verbatim after confirmation — a pause-signal ambiguity; no work lost.

## 3. Plan deviations

| Plan task | What changed | Why |
|-----------|--------------|-----|
| 1 (fonts) | `@fontsource/public-sans` npm package instead of hand-subsetted WOFF2 in `public/fonts/` | Avoids raw file downloads; per-weight files approximate subsetting; approved substitute in dispatch |
| 2 (skip link) | `id="main"` added to 60 page-owned `<main>`s instead of layout wrapping `<slot/>` | Pages already own `<main>`; literal plan would produce invalid nested landmarks |
| 2 (script path) | `src/lib/client/site.js` (existing shared script) instead of plan's `src/scripts/site.ts` example | Repo convention wins over plan example |
| 2 (masthead) | News/About/Donate retained as quiet links (mockup omitted them) | Owner decision (option B) during implementation |
| 3 (field offices) | Render only when real `FederalAgencyBranch` rows exist; no seed of mockup placeholder values | Owner decision: no fabricated data, no silent fallbacks |
| 4 (measurement) | Build-time/index-size measurement deferred to CI with documented commands | Owner's no-full-build instruction (>1hr) |
| all (verification) | `npm run build`/full e2e replaced by `astro check` + eslint + dev-server spot-checks + source greps | Owner's explicit instruction; full gates ride the PR as CI conditions |

## 4. Skill / workflow compliance

| Skill                                            | Used |
|--------------------------------------------------|------|
| superpowers:brainstorming                        | ✅ (brainstorm.md; exploration pre-completed in mockup phase, one open question — search architecture — resolved with user) |
| superpowers:writing-plans                        | ✅ (plan.md in repo's established plan style) |
| superpowers:using-git-worktrees                  | ✅ (pre-existing repo-convention worktree `.worktrees/redesign-civic-index-pages`; no nested worktree created) |
| superpowers:subagent-driven-development          | ✅ (20 dispatches; briefs/reports/diffs as files; ledger at `.git/worktrees/…/sdd/progress.md`) |
| (transitive) superpowers:test-driven-development | ⚠️ partial — e2e specs written/updated with behavior assertions, but red-green cycles were not executable in-session (no-build constraint); verification substituted per owner instruction |
| (transitive) superpowers:requesting-code-review  | ✅ (5 task reviews + 4 re-reviews + final whole-branch review on the most capable model) |
| superpowers:finishing-a-development-branch       | pending (runs after archive, per apply sequence) |

## 5. Follow-ups (triaged, non-blocking)

Tracked in the SDD ledger; the notable ones: migrate ~40 secondary templates from legacy
`Breadcrumbs` to `Breadcrumb`; `data-pagefind-ignore` on `EntityPageHeader` action slot;
remove dead `initHeaderScroll()`; decide `$--` vs `--` for currency empties; owner
sign-offs recorded for report-detail search-index exclusion and the renamed news-article
body (slug kept).
