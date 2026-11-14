> **Update 2026-11-14:** This original write-time record is preserved. Its pending
> validation, caption, playback, and workflow-completion statements are superseded
> by [the dated closeout retrospective](retrospective-closeout.md) and the refreshed
> [verification report](verify.md).

# Retrospective: add-home-introduction-video

Updated 2026-11-13 for the user-approved summary and video metadata extension.

## Evidence

- Current committed base: `7f8d6780c0ef6a4edef64687aaa61c44a0b3383f`.
- Worktree: `.worktrees/publish-source-data-annotations`.
- Product files: `src/pages/index.astro` and one approved local JPEG thumbnail.
- Existing change artifacts were extended to record the new approval; the
  original embed-only scope was not rewritten as prior consent to extra work.
- Rendered JSON-LD, thumbnail, visible links/text, desktop/mobile layout, shared
  headings, and no-inline-CSS checks passed. Final aggregate is pending.
- No dependencies, CSS, database changes, new route, or AI/crawl files were added.

## Wins

One page-local object keeps the iframe identity, visible summary, and metadata
consistent. Existing shared layout and structured-data conventions were enough.
Public YouTube metadata supplied the exact publication timestamp, while the
source file supplied precise duration. The approved thumbnail remains unchanged.

## Misses and Corrections

A symlink in the temporary home-only render source prevented Astro from linking
its generated stylesheets. Copying the exact page into the temporary source
fixed that verification setup; committed source/configuration was unaffected.
Visual inspection also caught Astro stripping spaces at inline link boundaries.
A rendered-text assertion reproduced the issue before explicit whitespace fixed it.

Temporary rendering configuration and servers must be stopped before aggregate
browser testing, preserving the lesson from the original embed verification.

## Workflow and Release

The coordinating agent handles independent review, final commit validation,
push/CI, and separate approval gates for merge and release. Captions and Search
Console monitoring are account work, not repo implementation. After deployment,
inspect home and thumbnail URLs and the Search Console Videos report. Existing
report counts predate the new video and do not establish its indexing status.
No recurring automation was requested or added.
