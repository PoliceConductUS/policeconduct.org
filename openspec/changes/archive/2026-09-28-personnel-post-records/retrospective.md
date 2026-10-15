# Retrospective: personnel-post-records

Written 2026-09-28 after verification passed.

## 0. Evidence

Eight source/test files changed for this request: licensing loader, education loader, schema contract, personnel page, two components and two test files. Seven tasks complete. No commits, new dependencies, database writes or deployment. One implementer completed data and UI sequentially; controller supplied independent review. Aggregate: 114 browser passes/7 existing skips and 10 redirect passes; seven focused new tests; 33 schema tables.

## 1. Wins

The direct personnel relationship removes assignment-dependent visibility and duplicate discipline rows. Per-person education loading avoids preloading 1.77 million course records. Native detail disclosure and ten-course paging keep imported facts accessible without expanding the whole collection on arrival.

## 2. Misses

A second agent and reviewer allocation hit the harness thread limit. The implementer handled both tasks and the controller reviewed the result. A first zero-credit assertion also matched the fixture course name; review changed it to assert the exact credit value.

## 3. Plan deviations

No product scope changes. Agent allocation changed from independent task agents to sequential implementation plus controller review. No data corrections were made for anomalous dates.

## 4. Workflow

The direct user request approved this bounded extension. Existing worktree reuse, OpenSpec plan/spec, Impeccable design rules, test-first implementation, review and verification-before-completion were used. Plan artifacts remained within the OpenSpec change. Work remains uncommitted; no additional integration approval was sought because merge/push/deploy were outside the request.

### Adapted steps

Fresh reviewer dispatch was unavailable due to explicit harness errors; controller review was used instead. Commit-based bridge verification was not used because this existing worktree includes prior untracked work; scoped source review and executed checks provide the implementation evidence. Future similar work should preserve dirty changes and distinguish UI completion from branch integration.

## 5. Surprises

Education contained 1,769,990 records for 10,553 people, up to 795 courses per person. All education subjects already had agency assignments, so existing profile routes were sufficient. All 76 discipline records now have source documents, compared with none at the earlier authority critique.

## 6. Follow-up observations

Stored date anomalies remain an intake concern. No memory updates, schema changes or unrelated cleanup were made.
