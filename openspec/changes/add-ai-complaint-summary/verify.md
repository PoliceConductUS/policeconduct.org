## Verification

### Tests

Four `node --test` tests run in `npm run test:client`:

- `scripts/ai-complaint-summary.test.mjs` "requires only rendered summary text and complaint link": a summary with only `summary` and `source.sourcePage` is accepted; extra metadata is kept; blank text and blank, missing or `javascript:` links are rejected.
- `scripts/ai-complaint-summary.test.mjs` "unavailability requires evidence and cannot contradict a completed summary".
- `scripts/ai-complaint-render.test.mjs` "renders escaped complaint narrative with a compact citation": HTML is escaped, the "Read the complaint" link uses `source.sourcePage`, and internal fields (confidence, hashes, retrieval, model, page references, procedural context) are not rendered.
- `scripts/ai-complaint-render.test.mjs` "missing-copy and processing states give honest copy and a donation link": null and all six reasons link to /donate/; only `missing_copy` says we do not have a copy; `available_unsummarized` shows its sentence and complaint link.

One Playwright test in `tests/e2e/civil-cases.spec.ts` visits every case with a stored summary and checks the heading, first paragraph and link, then visits one case with no summary and follows the Donate link. It does not visit `missing_copy` or `available_unsummarized` cases.

These tests describe the code before the open website tasks in tasks.md (labelled links, stored messages, no section for an unknown state). Update this section when those tasks are done.

### Final validation

Pending task "Final validation" in tasks.md. When it is done, record here, for both repositories (policeconduct.org and intake): repository, branch, full commit SHA, Node version from `mise.toml`, the `npm ci` lockfile check, the command (`npm run validate`), its exit code, each stage outcome, test counts, skipped tests with their reason, and the warning dispositions.

Real source content stays private in the retained intake workspace.
