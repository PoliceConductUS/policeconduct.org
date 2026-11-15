# Closeout Retrospective: add-home-introduction-video

Written 2026-11-14 after implementation verification. This corrects the incomplete
cycle state without rewriting the original retrospective's write-time account.

## 0. Evidence

- Implementation record: `8c98876`, `7f8d678`, `14298e0` (three cycle commits).
- Original cycle diff: 11 files, 427 added lines, including the JPEG asset.
- Tasks: 10 of 10 complete. Active hours were not reliably recorded.
- Recorded review participants: the implementation/review agents from the original
  cycle and one fresh independent closeout reviewer; the complete dispatch count
  is not reconstructed from Git.
- New external dependencies for this video change: none. Post-merge bugs: not
  applicable; this work remains unmerged.
- Pre-archive OpenSpec validation: 39 passed, zero failed.
- Current aggregate evidence: 566 tests passed, zero failed or skipped. The final
  archive commit receives its own full aggregate and CI record in PR #44.
- Fresh production home render and no-inline-CSS checks passed. Real embedded
  playback advanced to 0:52 of 1:42 with captions on November 14.

## 1. Wins

The page-local video object keeps visible text, player identity, and metadata
consistent. Existing shared styles and helpers supported the full requested
outcome without adding dependencies or a new route. The fresh closeout review
confirmed all four requirements.

## 2. Misses

- Blocking workflow miss, corrected in closeout: PR #44 was opened before delta
  sync and archive. Two completed tasks remained unchecked, and verification and
  retrospective evidence still described uncommitted work and pending checks.
- Playback was previously unconfirmed. The November 14 browser check resolves
  that gap, rather than counting player rendering as successful playback.
- An isolated verification config initially supplied URL objects where the
  installed Astro version requires string paths. Only that temporary config was
  corrected; production configuration and product source were unchanged.

## 3. Plan deviations

The original embed scope grew only after the user approved the summary, metadata,
and stable thumbnail. Runtime references now follow `mise.toml`, because separate
branch work updated Node after the original Node 24 verification. This closeout
changes lifecycle records and specs; it adds no product behavior.

## 4. Skill and workflow compliance

| Workflow step                 | Evidence                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Brainstorming                 | `brainstorm.md` records the outcome and approved extension.                                                     |
| Planning                      | `plan.md`, proposal, design, specs, and tasks define the scoped work.                                           |
| Workspace                     | The existing approved branch and repo-local worktree were reused.                                               |
| Subagent execution and review | Original implementation/review agents; fresh independent closeout review.                                       |
| Test-first verification       | The original generated-page assertion failed before metadata was added, then passed after implementation.       |
| Final verification            | Fresh aggregate, dependency comparison, production home render, and actual playback.                            |
| Finishing and archive         | Original sequence failed; this dated closeout restores spec sync and archive before returning the corrected PR. |

### Deliberately skipped steps

No implementation skill is claimed to have run again for this documentation-only
closeout. The original finishing sequence omitted archive before opening PR #44.
That was a workflow failure, not an approved exception. The corrective action is
the existing bridge's required sync-and-archive step, with final-head validation
and independent review before reporting the corrected PR.

## 5. Surprises

A complete-looking set of eight planning artifacts did not mean the cycle was
closed: unchecked implementation tasks, stale evidence, and a missing main spec
were still visible in the PR diff. Separate work also advanced the local branch
beyond the PR's published home-video revision; publishing that broader scope
requires an explicit integration decision.

## 6. Promote candidates

- [ ] Workflow completion: inspect the main spec and archived cycle in the PR diff.
      → **Promote to** one-off closeout evidence
  > **Why:** PR #44 omitted the existing bridge's archive step despite having a retrospective file.
  > **How to apply:** Verify the existing lifecycle requirements before returning a corrected PR; no new repository policy or memory entry is added.
