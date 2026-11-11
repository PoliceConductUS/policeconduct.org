# Analytics follow-up implementation plan

> **For agentic workers:** Use the existing Superpowers subagent-driven workflow for the remaining tasks.

**Goal:** Fix the approved analytics audit findings within the existing annotations worktree and branch.

**Architecture:** A shared browser analytics module owns safe initialization and URL handling. Existing UI callers emit bounded, privacy-preserving events. Analytics administration owns reporting dimensions, automatic-measurement settings, traffic filters, and retention.

**Tech stack:** Astro, JavaScript/TypeScript, Node 24, Playwright, Google Analytics 4; no new dependencies.

**Spec:** `design.md` and `specs/analytics-measurement/spec.md` in this change.

## Global constraints

- Preserve existing annotations and unrelated working-tree changes. Reuse the current worktree and branch.
- No sensitive values, real reports, credentials, personal data, or absolute machine paths in committed artifacts.
- No merge into main, deployment, personnel publication, or shared database reset. Preserve the user-approved feature-branch stack when synchronizing it.
- Write failing behavioral tests before implementation; intercept Google and forms requests in tests.
- Full final-head `mise exec -- npm run validate` is required; account for every diagnostic and skip.

## Task 1: Safe collection and behavioral instrumentation

- [x] Add failing browser/unit coverage for production-host isolation, asynchronous loading, safe page/referrer/link payloads, private search inputs, current header clicks, search response/selection events, donation amount/frequency, and submission receipt/email failure distinctions.
- [x] Implement the smallest shared analytics module and update `GoogleAnalytics.astro`, `site.js`, `forms.ts`, and `find-records/index.astro` callers. No visual or source-data changes.
- [x] Run targeted tests; verify failures first and then clean passes. Add the meaningful client tests to the aggregate chain if needed.
- [x] Review Task 1 independently for privacy bypasses, duplicate events, and matching event parameters.

## Task 2: Analytics administration

- [x] Inspect existing internal-traffic definitions before activating exclusions; use production-host exclusions to prevent preview/local contamination where supported. No IP rules exist; the user chose to keep team production visits included, so the internal filter stays in testing.
- [x] Enable URL query redaction for sensitive/search parameters; disable automatic search, history, outbound-link, and download measurement in favor of the explicit safe events.
- [x] Register event-scoped `form_name`, `failure_stage`, `response_status`, and `verification_email_status` dimensions. Keep donation dimensions and key events intact.
- [x] Set event retention to fourteen months, leave user-retention semantics unchanged, and save evidence of the final settings without exposing private network information.

## Task 3: Delivery and final evidence

- [x] Verify Node/npm and every installed package against its lockfile; run required gates, task-specific browser checks, built Pagefind checks and no-inline-CSS checks.
- [x] Resolve diagnostics, inspect the final diff, and obtain an independent review. Record evidence and any real blockers in `verify.md`.
- [ ] Commit with a Conventional Commit message and push the existing feature branch. Inspect actual CI for the final head and update the existing PR description to match the scope and evidence.

## Review focus

- Tokens in verification URLs and referrers must never reach a queued event or Google request.
- Production host restriction must apply to both initialization and later events, including HTTPS previews.
- Search keyboard and mouse selection must emit one event without a raw query or record label.
- A successful receipt with a failed email remains a receipt while also reporting the failure.
- Existing donation amount/frequency and all annotation behavior remain intact.

## Approved final-review fix wave

- Apply the existing personnel-publication switch to explicitly typed personnel exclusions at the common collection boundary.
- Keep fallback findings in authority listings and CSV, without appending a second unpaginated notes block on an index page.
- Preserve supplied warning and error evidence in record-page notes.
- Track search outcomes only after successful dataset loading, and classify existing listing/topic destinations accurately.
- Add failing regression coverage before each correction, then verify the complete affected suites and request one scoped re-review.

## Explicit record-page composition

- [x] Remove all annotation imports, loading, filtering, and rendering from `PageShell`.
- [x] Compose dedicated record notes on the canonical record routes for the collector's seven owner kinds; generic civic wrappers only forward slots.
- [x] Preserve evidence, exact canonical-path matching, publication exclusions, and paginated index behavior; verify shared chrome does not import the annotation loader.
- [x] Review the correction and repeat final rendering and complete validation before the GitHub update.

## Task 4: Versioned Analytics configuration and commands

**Files:** Create `config/analytics.json`, `scripts/analytics-config.mjs`, and `scripts/analytics-config.test.mjs`. Modify `package.json` and the relevant README instructions. Parent owns these OpenSpec artifacts and final verification records.

**Interface:** `npm run analytics:compare` and `npm run analytics:apply` read the fixed repository configuration. Read the OAuth token only from `GOOGLE_ANALYTICS_ACCESS_TOKEN`. Use Node 24 built-ins and the documented Admin REST API; do not add dependencies or change Cloud credentials. Export the smallest testable comparison/application interface from the script and keep CLI startup separate from import.

- [x] Add failing tests for a matching property/no mutations; a managed difference/read-only comparison; explicit create/update/unmark operations followed by read-back; preservation of unlisted resources/fields; pagination and omitted protobuf defaults; absent credentials, malformed settings and API errors; and token-free diagnostics.
- [x] Implement only the existing property's dimensions, key events, event creation rules, retention, enhanced measurement and data redaction. Use current Google resource identities for updates, field masks for managed patches, and no destructive dimension/rule synchronization. Default key events remain untouched unless explicitly listed for unmarking.
- [x] Populate the configuration from the verified live settings, document the manual traffic-filter setting, and add `test:analytics-config` to the existing unit-test aggregate. Comparison exits zero for a match, one for differences and two for an error; apply exits zero only after verified success and two on error.
- [ ] Run focused RED/GREEN and formatting/lint checks, record evidence, commit conventionally, and obtain an independent task review. Parent then performs live comparison when authorized credentials are available, completes final-head validation, and propagates the final head through stack #41.
