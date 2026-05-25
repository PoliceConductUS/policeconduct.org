# Retrospective: redesign-civic-index-pages

> Written: 2026-05-22 (after verify passed)
> Commit range: `e5d6aee..3327b5a`
> Worktree: `/Users/dalelotts/dev/PoliceConductUS/policeconduct.org/.worktrees/redesign-civic-index-pages`

---

## 0. Evidence

- **Commit range**: `e5d6aee..3327b5a` (11 commits)
- **Diff size**: `+3284 / -578` lines across 17 files
- **Tasks done**: 22/22 (`grep -cE '^\s*- \[x\]' tasks.md` -> 22)
- **Active hours**: about 2.5 hours
- **Subagent dispatches**: 23 implementation/review agents
- **New external dependencies**: none
- **Bugs encountered post-merge**: none; not merged yet
- **OpenSpec validate state at archive**: pass at verify time
- **Test coverage signal**: `npm run validate` passed, including 82 Playwright tests

Commit chain:

```text
d6bae2d fix: breadcrumbs
456b687 change: redesign index pages
de1a253 feat: define civic index data model
f317f1c feat: load civic index coverage
987b200 feat: build civic index models
0dc6cac feat: add civic index page component
260eaae feat: render civic index location routes
c751ed3 feat: complete civic index presentation
e189cd7 test: cover civic index pages
c60405c chore: complete civic index validation
3327b5a chore: verify civic index change
```

---

## 1. Wins

- The shared page pattern landed with a small route surface: the three location routes now delegate to `CivicIndexPage` and model builders instead of carrying duplicated layout code.
- Review caught two high-value correctness issues before final validation: `nextPath`/`nextLabel` would have skipped one location level, and route param helpers needed explicit path-shape assertions.
- The optional source-link count was handled conservatively. The audit recorded that `coverage_links` exists for profile contexts, but no reliable jurisdiction-scoped count exists yet, so the page omits that metric instead of fabricating coverage.
- Full validation passed after implementation: formatting, lint, Astro check, shell validation, schema contract validation, OpenSpec validation, and 82 Playwright tests.

## 2. Misses

- 🟡 **painful**: The first proposal phase stopped at `tasks.md` even though the schema required `plan.md` before apply. That caused an unnecessary apply-blocker before implementation could start.
- 🟡 **painful**: A `tasks.md` checkbox patch briefly landed in the original checkout instead of the isolated worktree. It was corrected before commit, but it shows that absolute worktree paths should be used whenever applying patches after worktree creation.
- 🟡 **painful**: The implementation did not follow strict red-first TDD. The e2e test was added after several implementation commits, though it did expose real route-helper runtime bugs before final validation.
- 📌 **nit**: Astro typecheck did not catch `getStaticPaths` helper visibility at runtime. Playwright caught it, so the test was useful, but the failure arrived later than ideal.

## 3. Plan deviations

| Plan task | What changed                                                                                                                                         | Why                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1.3 / 4.1 | Source-link counts were removed from the initial coverage metric scope.                                                                              | The audit found no reliable jurisdiction-scoped source-link aggregate in current local loaders.                  |
| 3         | Model builders were tightened beyond the first draft: immediate child paths only, state children use `places`, and missing payload arrays fail fast. | Spec/code review found the first draft could skip levels and hide malformed payloads.                            |
| 5         | Route helpers were changed from top-level helpers to closures inside `getStaticPaths`.                                                               | Playwright showed Astro runtime could not resolve the top-level helper in generated `getStaticPaths` code.       |
| 7         | E2E selectors were scoped to tables to avoid matching Leaflet tooltip `role=link` elements.                                                          | Leaflet exposes interactive map labels as links, which is correct for the map but ambiguous for broad selectors. |

## 4. Skill / workflow compliance

| Skill                                            | Used                    |
| ------------------------------------------------ | ----------------------- |
| superpowers:brainstorming                        | ✓                       |
| superpowers:writing-plans                        | ✓                       |
| superpowers:using-git-worktrees                  | ✓                       |
| superpowers:subagent-driven-development          | ✓                       |
| (transitive) superpowers:test-driven-development | △ partial               |
| (transitive) superpowers:requesting-code-review  | ✓                       |
| superpowers:finishing-a-development-branch       | pending by schema order |

### Deliberately Skipped Skills

- **`superpowers:test-driven-development` strict red-first sub-step**
  - **What was skipped**: implementation tasks were not consistently preceded by failing tests. The dedicated Playwright spec was added in commit `e189cd7`, after data/model/component/route commits.
  - **Why this cycle**: `plan.md` grouped tests as Task 7 after Tasks 1-6, and the executor followed that order. The later test run still found real runtime bugs, proving earlier red tests would have shortened the feedback loop.
  - **How to prevent recurrence**: `schema graph fix` — require generated implementation plans for behavior changes to put at least one failing user-visible/e2e or model-level test before route/component implementation, or explicitly mark why no red-first test is possible.

- **`superpowers:finishing-a-development-branch`**
  - **What was skipped**: not skipped; not reached yet.
  - **Why this cycle**: schema instructions require retrospective before archive, and finishing-a-development-branch after retrospective + archive.
  - **How to prevent recurrence**: `one-off — schema boundary case, no prevention possible` — this retrospective is written before the finishing step by design, so the row can only be pending at retro write-time.

## 5. Surprises

- Astro accepted route helper code at typecheck time, but `getStaticPaths` could not resolve top-level helper functions at runtime for the dynamic route files.
- Leaflet tooltips with `role=link` made broad Playwright link selectors ambiguous; table-link assertions need to be scoped to the table.
- The schema-source audit showed link data exists, but not in a jurisdiction-scoped aggregate shape suitable for the coverage panel.

## 6. Promote candidates -> long-term learning

- [ ] 🟡 **Plans for behavior changes should put one failing user-visible test before implementation slices** -> **Promote to schema**

  > **Why**: The Civic Index e2e test was added after implementation and caught runtime route-helper bugs that typecheck missed.
  > **How to apply**: When writing `plan.md` for an OpenSpec behavior change, include an early failing Playwright/model test before route/component implementation unless the plan records a concrete reason no red-first test is possible.

- [ ] 🟡 **After creating a worktree, patch with absolute worktree paths** -> **Promote to project AGENTS.md**

  > **Why**: A Task 6 checkbox patch briefly landed in the original checkout because `apply_patch` used the conversation cwd instead of the worktree.
  > **How to apply**: Once `.worktrees/<change>` exists, all manual `apply_patch` file paths should be absolute paths under that worktree.

- [ ] 📌 **Jurisdiction source-link counts need their own aggregate design** -> **Promote to future OpenSpec change**
  > **Why**: Current `coverage_links` references are profile-scoped, not jurisdiction-scoped for Civic Index coverage.
  > **How to apply**: Before adding source links to Civic Index coverage, define the exact local aggregate query and row-level semantics in a separate change.
