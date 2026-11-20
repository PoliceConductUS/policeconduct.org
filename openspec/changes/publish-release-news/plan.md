# Publish news between website builds

**Goal** — Publish current, sourced coverage on the relevant profiles, agency pages and homepage between builds. An ordinary build must reproduce the imported result.

**Architecture** — Intake discovers and records the evidence. The daily Action updates a selected website release using its original HTML and private saved page data. A separate Intake import maps source identities to canonical database records. The website owns rendering, hosting and originating-form attribution.

**Stack** — Intake’s TypeScript sources and mutation pipeline, Search Console, SerpApi, GitHub Actions, PostgreSQL, Astro, S3, CloudFront and the existing forms Lambda.

Use the [design](design.md), [acceptance scenarios](specs/release-page-updates/spec.md) and [task checklist](tasks.md) together. File paths below are relative to the named repository. design.md "Release API and page-object contract" is the cross-repository contract. Implement Intake-owned changes in Intake. Each numbered section ends at a testable commit point in the owning repository.

## 1. Define the records and build one round-trip example

- [x] In Intake, start with the manual coverage contract, schema sources behind `src/shared/io/generated/entity-specs.ts`, and the mapping ledger in `src/cli/state/source-name-to-canonical-id/index.ts`. Record a synthetic article with a preferred original and two copies that support different officer assignments at the same agency.
- [x] Give the article and each new relationship its own source reference, for example `{"namespace":"com/serpapi/landing-page-search","sourceId":"…"}`. Give each occurrence its URL, source title, publication date, selected body and paragraph evidence. Keep the website summary distinct from publisher text and private notes. Reference existing assignments by their supplied identities.
- [x] Extend the owning database migrations, Intake records and transformations to preserve the selected occurrence per assignment, source mappings and dated homepage placements. Supply any new required values from their actual producer. Verify the example can express one agency entry, two supporting links and one preferred homepage link.

## 2. Process and import current coverage

- [x] Add shared article processing in Intake under `sources/lib/`. Use saved or corrected body selectors and normalize distinct main-body paragraphs as specified. Test overlap at two and three shared paragraphs out of ten. For a copy matching two established IDs, retain both and report the ambiguity.
- [x] Exercise a November 14 Chicago search with a November 7 original updated today, an undated result, and a November 8 original. Only the November 8 story qualifies. Check cached results the same way. Verify the article names and concerns the officer and an associated agency even when the names occur in separate paragraphs. Process all supported assignments.
- [x] Use the ordinary transform and mutation path for local results. Exercise an existing article whose preferred URL changes, plus an assignment already supported elsewhere. Assert stable identity and verify that losing the last supporting passage flags the association for manual correction.

## 3. Render the same coverage on an ordinary website build

- [x] In the website’s `src/lib/data/coverage.ts`, load the occurrence for the corresponding assignment. In `src/components/CoverageLinks.astro`, render its source fields and summary. Use the exact built profile and agency paths. Group by article ID for agency listings and use an assignment-supported copy.
- [x] In `src/pages/index.astro`, render the imported homepage placement order using preferred-source fields. Run the section 1 example through an ordinary build. Assert the two supporting URLs on the respective profiles, one entry on the agency, and the preferred URL on the homepage.
- [x] Add news targets and reusable item templates in the original markup, including pages with zero articles. Produce the private release roster at `builds/<release-id>/data/dynamic.json` and baseline page records from the underlying database rows. Check empty and populated pages, a build with personnel disabled, and preservation of original article, relationship and assignment identities.

## 4. Route complete releases and attribute form submissions

- [x] Adapt website `scripts/deploy.sh` and `scripts/promote.sh` to produce complete originals per release, including unchanged assets. Use the full commit hash as the release ID in every environment; production and preview stay separate through their own site bucket, release-data bucket, KVS and forms API.
- [x] Connect `infrastructure/bootstrap-policeconduct/functions/router.js` and the release-api `release-snapshot` operation to the same selected release. Serve the original until an override is available and refresh the canonical path after first and later publication. Extend `scripts/cloudfront-router.test.mjs` for both hosts and previously cached responses.
- [x] Set the private origin and access permissions in `infrastructure/bootstrap-policeconduct/release.tf` (release-data buckets, `release_api` Lambda, `intake_news` role) and the site bucket policy in `main.tf`. Test direct requests to the release’s saved page JSON and extracted body through both public hosts. Verify the release-api snapshot and import paths can still read their inputs.
- [x] Embed the build’s release identity in forms. Include it after ordinary or custom payload construction in `src/lib/client/forms.ts`. Validate the originating release against the environment’s known releases and retain it in `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs`. Run `npm run test:e2e` (`tests/e2e/forms-submit.spec.mjs`) and `npm run test:lambda` with an old open form after promotion and a preview at the same commit.

## 5. Search and rank from finalized traffic data

- [x] Implement the hosted Intake source under `sources/com/serpapi/landing-page-search/`. Read Search Console query/page rows through the first empty page before search. Use only exact individual profile paths from the selected release. Test that the highest-impression eligible pair on a later page is searched first.
- [x] Search Google All organic results in rank order requiring the quoted original term, a quoted roster-name alternative, and an assigned agency and state. Apply the seven-day publication-date check from section 2. Count provider requests separately from newly checked URLs. Prove a cached qualifying first hit consumes zero new URLs, ten new URLs exhaust a targeted search, and the free allowance is respected.
- [x] Persist each successful query/profile match. For the latest seven finalized reporting days, count each matched pair once. Select the newest story per profile by preferred publication date and combine profile totals when they select one article. Test 28 + 22 = 50, a shared story across two profiles, the 25-entry cutoff and a changed order without new discovery.
- [x] Record the first time coverage becomes visible on the profile. Compare each matched pair’s average position across seven complete reporting days on either side, excluding publication day. Verify that a retry preserves first visibility and missing observations leave the comparison unavailable.
- [x] Select the five highest-ranked eligible terms across daily runs. Verify selection for a term shared by profiles, empty results, the 168-hour boundary across releases, and pagination after a retry. Exercise discovery and homepage ranking with different eligible sets. Defer the full agency and officer sweep.

## 6. Publish full pages and recover from interrupted updates

- [x] In the Intake publisher, merge into the release’s complete saved page object, render every part against fresh original HTML and escape article text. Test a first insertion, an update to another part and a literal HTML title. Verify both `data-source-namespace` and `data-source-id` on the corresponding elements.
- [x] Persist the matched article identity, release, search position and all destinations before advancing. Coordinate identity creation and publication across writers. Test a fresh runner after only the profile was written, then an older writer finishing after a newer one. Assert the newest merged result is visible at every destination before the checkpoint advances.

## 7. Verify and activate in rollout order

- [x] Rehearse daily discovery and the ordinary build first. Run the scoped suites for the changed boundaries, including `node --test scripts/cloudfront-router.test.mjs` in the website, then each repository’s full `npm run validate` under its pinned runtime. Record commands, results and remaining release checks in the verification artifact.
- [x] Prepare the Intake workflow under `.github/workflows/` for 7 a.m. daily in `America/Chicago`. Verify the schedule across daylight-saving changes and exercise discovery, full-page publication and retry against a test release with the same inputs.
- [ ] After 6.4, run task 4.2's checklist, then set `NEWS_RELEASE_FUNCTION` to enable `.github/workflows/discover-news.yml` in Intake.

## 8. Publisher URL identities

- [x] Use namespaced, normalized publisher URL identities on Daily occurrences. Resolve equivalent article references across searches, publication and ranking. Preserve relationship identities.
- [x] Save confirmed duplicate-to-target URL pairs under `CoverageLink` in private `data/alias.json`.
- [x] Check destination-specific HTML source IDs after publication and an ordinary rebuild.

## 9. Deployment folders and cutover

Sections 8 and 9 follow 7 to keep the existing numbering.

- [x] 6.1: `scripts/build-release.mjs`, `scripts/release-files.mjs` and `scripts/upload-release.sh` use the full commit and reject dirty or foreign uploads. Tested by `scripts/deploy-release-guard.test.mjs`.
- [x] 6.2: `scripts/manage-release.mjs`, `scripts/promote.sh` and `scripts/cleanup-preview.mjs` give main-only site uploads, `current:main`, `/*` invalidation and live-folder protection. Tested by `scripts/manage-release.test.mjs` and `scripts/cloudfront-router.test.mjs`.
- [ ] 6.3: validate the final `ddl-openspec` head as listed in tasks.md 6.3.
- [ ] 6.4: finish the cutover in the order listed in tasks.md 6.4. The 2026-11-18 `bootstrap-policeconduct` apply from `main` already put the release-data buckets, release-api, `intake_news` role, the router that reads `current`, the `*/build/*`/`*/override/*`/`404.html` bucket policy and the `releaseId`-checking Forms API in production; `www` returned 200 through `current`.

Probe URL table (step 3 of 6.4). `<id>` is the folder `current` names.

| Host                                | Path                                   | Expected                      |
| ----------------------------------- | -------------------------------------- | ----------------------------- |
| `https://policeconduct.org`         | `/`                                    | 200, `data-release-id="<id>"` |
| `https://policeconduct.org`         | a personnel profile from the roster    | 200                           |
| `https://policeconduct.org`         | a retired path in `_redirect-map.json` | 301 to its target             |
| `https://policeconduct.org`         | `/builds/<id>/data/dynamic.json`       | 404                           |
| `https://policeconduct.org`         | `/<id>/build/index.html`               | 404                           |
| `https://policeconduct.org`         | `/<id>/override/index.html`            | 404                           |
| `https://policeconduct.org`         | `/com/serpapi/landing-page-search/`    | 404                           |
| `https://policeconduct.org`         | a path that does not exist             | 404 with the site 404 page    |
| `https://preview.policeconduct.org` | the same private paths                 | 404                           |

Legacy-prefix allow-list (step 4 of 6.4). Delete only root objects written by the old root-served layout: root-level files other than `/404.html`, and root-level folders that are not release folders (a full commit hash or the cutover placeholder folder). Record the exact list from `aws s3 ls s3://<site bucket>/` in verify.md before deleting. Never delete `/404.html`, any `*/build/` or `*/override/` prefix, or any release folder.

## 10. Work outside this change folder

- [ ] Tasks 7.1–7.9 in tasks.md: the Intake news-discovery change, the `atomic-sha-deploys` superseded note, the README key paths, Forms API mismatch handling and version field, the same-commit upload guard, the `main` preview-name check, roster-path officer links, keeping release folders, and the final-head verification record.
