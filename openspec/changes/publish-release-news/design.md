# Publish news between website builds

## Context

Intake is the data-import application. It already records coverage links and their officer-at-agency assignments. The website builds agency and personnel pages from those records. Each agency and personnel page renders a `data-page-part="news"` section, hidden when it has no links, and a `template[data-template="coverage-item"]`. The website also has a separate editorial news collection. This design concerns linked source articles.

The CloudFront router selects a release from a KVS pointer (`current` for production, `current:<label>` for a PR preview) and serves `<release-id>/override<path>index.html` when the `o:<release-id>:<path>index.html` marker exists, otherwise `<release-id>/build<path>index.html`. An override belongs to exactly one release and one canonical path. Today the router also maps the bare preview host to `current:main`; `release-hosts` replaces that with a redirect to `www`.

Intake owns discovery, evidence, ranking and search-position behavior. Their requirements move to an Intake change (task 7.1). This design keeps them below as context for the cross-repository contract.

## Terms

- **Preview**: a build of an open PR only, served at `pr-N.preview.policeconduct.org`. A preview is not a release.
- **Release**: a published build of a commit on `main`, stored as a commit folder in the production site bucket. Not every main commit is released.
- **Promote**: choose which release folder serves `www` and the apex through the KVS `current` pointer.
- **The daily Action** (short form "Daily"): the Intake source `sources/com/serpapi/landing-page-search`, run by `.github/workflows/discover-news.yml`.
- **Google All**: SerpApi `engine=google` organic results, not the News tab.
- **Inference**: the model call at `NEWS_INFERENCE_URL` that judges whether an article concerns the named officer.
- **Source checkpoint**: the Intake publication checkpoint record in private storage.
- **The release-api**: the `release_api` Lambda in `infrastructure/bootstrap-policeconduct/release.tf`, with operations `release-snapshot` and `publish-page`.
- **The page publisher**: Intake `publication.ts`.
- **Original page**: the page the build wrote at `<release-id>/build<path>index.html`. It is the daily Action's only source for a release.
- **`o:` keys**: KVS keys. `o:<release-id>:<path>index.html` marks a published override. (Redirects are redirect files in each release's own `redirect/<release-id>/` folder in the site bucket, written by the redirect build, not KVS keys; `atomic-sha-deploys` task 7.12 deletes the old `r:` redirect keys.)
- **Roster**: in this design, the personnel profile paths, names, agency names, states and assignments that Daily reads from the original pages. The build uploads no roster file.

## Goals and non-goals

Goals: news found between builds appears on the linked personnel, agency and home pages of the current release; an ordinary build after the Intake import shows the same coverage; every form submission is saved with the release, data version and Forms API version that produced it.

Non-goals: the full agency and officer sweep; Daily updates to PR previews; keeping Daily's news across a promotion before the manual import (owner decision Q11); civil-case joins and stale-case withdrawal; release-folder rules, which `atomic-sha-deploys` owns.

## Discovery and evidence

Schedule the daily Action for 7:00 a.m. each day in `America/Chicago`. It writes discovery evidence, structured release data and full HTML overrides. It writes its results to the selected website release. It does not depend on Intake's database-reset source imports.

The daily Action reads organic Google Search impressions, clicks and average position grouped by query and landing page. For the latest seven finalized Search Console reporting days, advance the Search Analytics request’s startRow through successive pages until a request returns no rows. Finish reading all available rows before ranking any pairs or starting article searches. Keep a pair only when its exact landing path has an original individual personnel profile page in the `current` release. Apply this filter before ordering by impressions or aggregating homepage clicks. The personnel directory (`/personnel/`), state pages such as `/tx/`, and agency pages are outside that input.

Search the eligible pairs in descending order of impressions using the quoted original reported term, at least one quoted roster-name variation, and the quoted agency name and stored state from the profile’s assignments. For multiple distinct agency/state pairs, use one grouped OR query. When the same query appears for two profiles, each pair has its own impression and click counts.

Daily uses Google All results (`engine=google`, `tbs=qdr:w`) under `com/serpapi/landing-page-search`. Walk the ranked pairs and select at most five distinct eligible Search Console terms per America/Chicago day across all runs. The first eligible pair for a term supplies its target profile. Keep its original reported term as the history key across profiles and website releases. Distinct reported spellings remain distinct terms.

Keep the term and the time of its first successful results page in private Intake state, including empty results. A new search for that term becomes eligible after 168 elapsed hours.

Before each search the Action reads the SerpApi account; it searches only on a free plan with searches left this month and below the hourly limit, and otherwise stops searching for the run. A term skipped for cooldown does not use a daily slot; a term not searched because the allowance is exhausted also uses no slot. Resume an interrupted search from its checkpoint. Further result pages use provider allowance but occupy the same daily term slot. Apply these limits only to new discovery. Refresh homepage ranking from all eligible traffic and existing matches.

Limit the daily Action to the search date and the six preceding calendar dates in `America/Chicago`. Request past-week results and check the source publication date before accepting a match, including a cached result. When a story has multiple copies, use its preferred source’s publication date to check its age. A recent update or republication of an older story does not qualify it as current news.

Skip URLs with no readable or saved article body. Read results in ranked order, reusing corrected saved article bodies when available. Count newly checked URLs separately from provider requests. Stop each targeted search at the first qualifying article or ten new URLs, subject to the SerpApi account check above. Link the first qualifying article to that landing page. A known qualifying URL ends that search even when zero new URLs were needed. Finish processing all supported matches in the article and update the URL and paragraph data before moving to the next search. For the daily Action, completion also includes publication to every affected destination as described below.

The source text must name and concern the officer on the profile and an agency where that officer has an assignment. Names can occur in different paragraphs. Daily checks only exact roster-name variations in the extracted paragraphs, case-insensitively and longest first. The search term and agency text cannot establish personnel identity. Inference evaluates the named person’s assignment in context. Keep the roster fields, variations tried, matching paragraph references and publisher evidence privately for replay. Use the whole story to identify other supported pairs. Keep only those pairs.

Each URL record keeps its selector, selected body, paragraph hashes and publication metadata. If extraction is uncertain, save the best selected body and the reason. Later matching uses a corrected selection when supplied. Evidence lives in the production release-data bucket under `com/serpapi/landing-page-search/`, shared across releases. For each normalized paragraph, `<hash>/index.json` stores the normalized text and occurrences. Associate agency and personnel evidence with the particular occurrence. This preserves context when identical text appears in different articles.

Normalize Unicode and whitespace and ignore capitalization and punctuation for hashing. Compare sets of distinct main-body hashes. Two articles are copies when the intersection count divided by the smaller set size is at least 0.30. Three shared distinct paragraphs out of ten qualify. Two out of ten are below the threshold. Keep an undated occurrence as evidence and continue searching for a dated qualifying article. It becomes eligible for discovery when a source publication date places the story within the search window. Show the source title and date, using Open Graph metadata when available. Summarize the full extracted main body. Keep source wording and evidence distinct from the site's own summary.

## One article across preferred URLs

Daily identifies each publisher occurrence with the source namespace `com/serpapi/landing-page-search` and the normalized publisher URL as its source ID. Keep the publisher's actual link for readers. Record each occurrence's source pair in private JSON. References may use any source pair belonging to that story. The displayed article carries the source pair of the displayed occurrence in HTML. Each article-to-assignment relationship retains its own persistent source identity.

Daily writes `builds/<release-id>/data/alias.json` in private release storage. The build never writes it. The outer keys are Intake record kinds. Inside `CoverageLink`, a duplicate’s normalized publisher URL maps to another normalized publisher URL for the same story within the `com/serpapi/landing-page-search` namespace. Daily preserves mappings for other kinds, and resolves article aliases within `CoverageLink`.

```json
{
  "CoverageLink": {
    "https://copy.example/story": "https://publisher.example/story"
  }
}
```

This entry groups the two URL source IDs. When a release has no `alias.json` yet, Daily starts from `{"CoverageLink":{}}`. Daily merges confirmed aliases when saving the release.

Daily follows URL aliases when updating saved articles and preserves their source identities across searches.

Intake’s existing coverage resolver uses normalized URL as canonical identity. Prefer explicit original-publisher attribution and then the free Common Crawl domain rank (`domainRank`). Update the preferred URL on the existing record.

An article links to an officer’s assignment at an agency (`AgencyPersonnel`). Build each agency’s news list from the articles linked through its personnel assignments. Include each article once per agency. If a syndicated copy supplies the link for an assignment, that link also supplies the agency entry derived from that assignment. Both the roster path and the page's officer link are `/personnel/<slug>/` from the stored `personnel.slug` (`coverage.ts`), so they are the same.

For an officer’s page, use a source occurrence that supports the officer’s association. If the preferred copy omits the supporting passage, link to the evidence-bearing occurrence and use that occurrence’s source metadata and full body for its entry. If corrected extraction removes the last support for an already published news association, flag the association for manual correction. Preserve associations independently supported elsewhere. If a copy overlaps two already established article IDs, retain both and report the ambiguity for resolution.

## Build and daily storage

Owner decision, 2026-11-22: a rebuild of a commit cannot and will not overwrite anything the daily Action generated. The build and the daily Action therefore write to separate prefixes. Neither writes the other's prefix.

A release folder is named by the full Git commit hash (`<release-id>`); "folder" and "release ID" mean the same value.

| Artifact                    | Bucket                 | Key                                                         | Writer       |
| --------------------------- | ---------------------- | ----------------------------------------------------------- | ------------ |
| Original page               | site                   | `<release-id>/build<path>index.html`                        | build        |
| Override page               | site                   | `<release-id>/override<path>index.html`                     | daily Action |
| Build artifacts for Daily   | release-data (private) | `builds/<release-id>/build/…`                               | build        |
| Release record (completion) | release-data (private) | `builds/<release-id>/build/release.json`                    | build, last  |
| Saved page data             | release-data (private) | `builds/<release-id>/data<path>index.json`                  | daily Action |
| Article aliases             | release-data (private) | `builds/<release-id>/data/alias.json`                       | daily Action |
| Discovery evidence          | release-data (prod)    | `com/serpapi/landing-page-search/…`, shared across releases | daily Action |

- The build does not upload the data it read. It uploads no page data, no roster and no aliases.
- `builds/<release-id>/build/` holds only build-specific artifacts meant for the daily Action, plus `release.json`. `release.json` is `{commit, branch, pr, dataVersion}` and is uploaded last, as the completion marker. Today it is the only file there. Templates stay in the original page (`fromOriginal`). A later change may add other build artifacts, such as templates, to this prefix.
- A rebuild of the same commit replaces `<release-id>/build/` and `builds/<release-id>/build/` only (`atomic-sha-deploys` design.md "Build and daily storage"). It never writes, deletes or reads `<release-id>/override/` or `builds/<release-id>/data/`.
- The daily Action reads `<release-id>/build/` and `builds/<release-id>/build/`. It writes only `<release-id>/override/`, `builds/<release-id>/data/` and its evidence prefix. IAM denies it writes to both build prefixes.
- The daily Action reads the roster from the original pages. The site adds no substitute file. If an original page lacks a value that Daily or the Intake import needs, that gap goes to the owner; this change adds no site-side data file to fill it.
- Release folders uploaded before this change have the old build-written `builds/<release-id>/data/dynamic.json`, page data and `alias.json`, and no `release.json`. They are left out (owner decision, 2026-11-22): they cannot be promoted and get no release host. Nothing deletes their files, and nothing writes a `release.json` for them. The build never writes `builds/<release-id>/data/` again.

## Release and page object

The original pages supply agency, personnel and path identities.

Saved records, including Daily's page data and assignment-relationship notes, and extracted article bodies are private to the services that discover, render and import coverage. Article-level notes (`coverage_links.notes`) are public and render on the page, as before this change. Production and preview serve the rendered pages with their source links and summaries, and the HTML carries the source IDs in `data-source-namespace` and `data-source-id`. Visitors cannot retrieve the underlying records or extracted bodies through either host.

The [alternatives in the concept brief](brainstorm.md) explain the choice to retain structured data and regenerate from the original. Each saved page object is keyed by page part. Each entry identifies its target, a template taken from the original page, and its rendering data. These field names and the `fromOriginal` template form are the implemented contract.

```json
{
  "news": {
    "target": "[data-page-part='news']",
    "template": { "fromOriginal": "template[data-template='coverage-item']" },
    "data": { "articles": [] }
  }
}
```

The page publisher supplies the targeting and template instructions. Article fields supply values for the template. Render source titles and summaries as text using the same escaping as the ordinary Astro view. News is the first consumer. The original build provides an insertion target and item markup even on a page with zero stories. Each target's saved news data covers all its applicable articles, including coverage already present in the original page.

The build writes no saved page object. Daily writes the first saved object for a page when it first updates that page. Until then, the baseline is the news items rendered in the original page, read through their template hooks, including `data-source-namespace` and `data-source-id`. Page destinations refer to the same stable identities. News is the only implemented part; the object shape allows other parts later.

1. Pin the release and canonical path. Load Daily's saved page object from `builds/<release-id>/data<path>index.json`. When none exists, read the baseline from the news items in the original page.
2. Merge Action-created articles and their relationship records using each record’s persisted namespace and source ID. Retain previously saved parts, including unrelated ones. Persist that object. Keep the targeted search at its current acquisition position until publication completes for every destination.
3. Read a fresh copy of this release's original HTML. Resolve each entry's target and template relative to the original. Render the complete object. Agency and personnel pages retain the existing newest-first ordering. The homepage uses the seven-day organic-click ranking.
4. Write the full HTML under `override/` and make the updated page visible at its canonical URL. On retry after a data write, render from the saved data even if the article itself is already recorded. If a write to the officer page succeeds and the agency page fails, the next acquisition resumes the same search. Retain its matched article’s namespace and source ID, release and full destination list in the existing source checkpoint. Replay all destinations from their latest saved data, including pages already written. Advance only when the full set has been rendered and made visible. A concurrent update must reread and merge the latest data before publishing; a stale HTML write must not become the final served version. When the checkpoint's pinned release is no longer `current`, `publish-page` rejects it. The daily Action then closes that checkpoint, re-pins to `current` and re-derives its destinations from the new release.

For example, if the original page contains A and two runs find B and C, the regenerated page contains all three once. A later change to another part retains that news list. Full-page regeneration reads the original HTML and all current entries each time.

News that the daily Action adds lives only in the private page data of the release it published to until an operator runs the manual `workspace:pull` and Intake import. A new release's original pages come from the database. Promoting a newer release before that import therefore drops the unimported news from `www` until the import lands and a later release is built. This loss is accepted.

## Search position after publication

Record when new coverage first appears on the individual profile. For each matched query and profile, compare the average position reported by Search Console for the seven complete reporting days immediately before and the seven complete reporting days immediately after publication. Exclude the publication day. When either period has no reported position for that pair, leave the comparison unavailable. Retain the period dates alongside the two values so the change can be interpreted. The comparison describes observed movement for that exact pair. It does not establish what caused the movement.

## Homepage ranking

Search Console records organic clicks for each (personnel landing page, search term) pair. For each eligible profile, sum the seven-day clicks from its distinct matched pairs once each. Select each profile’s newest qualifying story by comparing the publication dates of the stories’ preferred sources. Display the selected story with the preferred source’s date, title and link, including when several profiles select it. Changing the displayed story or its preferred URL leaves the measured pairs and their counts intact. If several profiles select the same story, show it once and combine those profiles’ totals for homepage ordering. Show up to 25 distinct stories.

## Forms and routing

The deployed Forms API still rejects an unknown release with a 400 before saving, and the client throws when a page has no `data-release-id`. The save-and-log behavior below takes effect when task 7.4a is deployed.

Each build embeds its commit-hash release ID in every form. The shared submission helper includes `releaseId` after invoking the ordinary or custom payload builder. The environment-specific Forms API keeps it in the stored submission. A form opened before deployment retains its original value. Preview and production use the same commit-hash release ID; their buckets, KVS pointers and Forms APIs keep them separate.

The Forms API saves every submission. When the `releaseId` is missing or names no folder with `builds/<release-id>/build/release.json` in that environment's release-data bucket, the API still saves the submission and logs the mismatch. When the release lookup itself fails (an S3 error other than not-found), the API saves the submission and logs `forms.submit.release_lookup_failed` with the error. A missing `RELEASE_DATA_BUCKET` still fails the request. The API logs a missing or unknown release as `forms.submit.release_mismatch`, with the `releaseId` or `null` when it is missing.

Every saved record carries `formsApiVersion` at its top level: the full Git commit the Lambda was deployed from (owner decision, 2026-11-22). Terraform sets the Lambda's `FORMS_API_VERSION` environment variable from the variable `forms_api_version`, which `scripts/apply.sh` supplies. A missing `FORMS_API_VERSION` fails the request before saving.

Once `atomic-sha-deploys` task 2.2 lands, each page carries the data version it was built from in `data-data-version` on `<html>` (see `atomic-sha-deploys` design.md "Data version"). The shared submission helper sends it as `dataVersion` beside `releaseId` (task 7.4b), and the Forms API stores it in `payload` beside `releaseId`, as sent. When `dataVersion` is missing, the API still saves the submission and logs `forms.submit.data_version_missing`. The API does not check the value against a list, because no list of data versions exists.

The release-api and the public router must agree on which release the production host serves. The API returns that release ID together with the location of its build artifacts. It returns no roster. For a request within a selected release, route to the full override when published for that path and otherwise use the original. Refresh the canonical page on first publication and on subsequent override changes, including when the previously cached response came from the original. Preserve separate production and preview routing. Production stays on the selected release throughout publication.

The daily Action publishes to the selected production release. Its evidence is shared across releases (see the storage table). PR previews serve their own build's original pages without Daily's updates.

## Release API and page-object contract

This section is the cross-repository contract between the website and Intake.

- **`release-snapshot`** returns `{releaseId, artifacts:{bucket, prefix:"builds/<release-id>/build/"}}` for KVS `current`. It returns no roster.
- **`publish-page {releaseId, path}`**:
  - rejects a release other than `current`;
  - requires a canonical path that starts and ends with `/` and has no `\*%?#`, whitespace or dot segments;
  - HEADs `<release-id>/override<path>index.html` and fails if it is missing;
  - only then writes `o:<release-id>:<path>index.html`;
  - invalidates `<path>`, `<path>index.html`, `/<release-id>/override<path>index.html` and `/<release-id>/build<path>index.html`, plus the path without its trailing slash when the path is not `/`;
  - returns `{invalidationId}`.
- **`release.json`** at `builds/<release-id>/build/release.json` has the shape `{commit, branch, pr, dataVersion}`. The build uploads it last. Its presence marks a complete release.
- **The `intake_news` role** trusts only the Intake `main` branch through GitHub OIDC. It has production access only. It may read `<release-id>/build/*`, `<release-id>/override/*`, `builds/*/build/*`, `builds/*/data/*` and its evidence prefix. It may write `*/override/*`, `builds/*/data/*` and its evidence prefix. It is denied writes to `builds/*/build/*` and `*/build/*`. It may call `GetInvalidation`.
- **Template hooks:**
  - `data-news-title|publisher|date|summary|notes|officers`, plus `data-source-namespace` and `data-source-id`;
  - the first insertion clears `hidden`;
  - officers render as `<a>` with the roster path, or as `<span>` when personnel pages are disabled.
- **Homepage payload:** the homepage `ranking` payload is part of this contract. The homepage shows `placement_count` stories, at most 25, set by Intake.
- **`alias.json`** is written only by Daily. When it does not exist, Daily starts from `{"CoverageLink":{}}`. The build neither seeds nor checks it.
- **Blocked prefixes:** the router returns 404 for `/builds`, `/data`, `/evidence`, `/news-discovery`, `/com/serpapi/landing-page-search` and direct `/<release-id>/build|override/` paths.

## Deployment folders

Build and deploy scripts require a clean repository and use its full current Git commit hash. Upload rejects an artifact from another commit. Promotion requires an explicit folder argument. A folder without `builds/<folder>/build/release.json`, such as the cutover placeholder folder or any folder uploaded before the storage split, cannot be promoted. Hosting uses `<release-id>/build/` and `<release-id>/override/`; existing private records stay in private release storage. Build source metadata records the branch and commit and participates in the completion inventory. Only main builds can upload to the production site bucket. PR builds upload to preview. Today a main deployment also copies the build to the preview site bucket and selects `current:main` for the bare preview host. `release-hosts` (tasks 1.2, 3.2 and 9.4) removes that copy and makes the bare preview host redirect to `www`, and `atomic-sha-deploys` task 3.1 removes `PREVIEW_NAME`.

A rebuild of the same commit goes to the same folder (owner decision Q4). It replaces `<release-id>/build/` and `builds/<release-id>/build/` and leaves `<release-id>/override/`, `builds/<release-id>/data/` and the `o:<release-id>:` keys untouched (see "Build and daily storage").

Promotion checks the release-completion marker (`builds/<release-id>/build/release.json`) and `build/index.html`, selects the existing KVS pointer and invalidates CloudFront. Promotion writes no redirect keys. Each release serves redirects from its own `redirect/<release-id>/` folder, which the redirect build writes before promotion (`atomic-sha-deploys`, "Redirect build"). Release folders are kept forever (owner decision Q7). Closing a PR removes its host pointer and its preview folder unless another preview pointer still selects that folder; `atomic-sha-deploys` tasks 4.1 and 4.2 implement this.

### Production cutover status

Production already serves through the `current` pointer. After the `bootstrap-policeconduct` apply from `main` on 2026-11-18, `www` returned 200. That apply put these in place, all on `main`:

- the release-data buckets, the release-api and the `intake_news` role (`release.tf`);
- the router that reads `current` (`functions/router.js`);
- the site bucket policy that grants only `*/build/*`, `*/override/*` and `404.html`;
- the Forms API that checks `releaseId`.

Following owner decision Q10, the bucket's previous root content was copied into the cutover placeholder folder so that it became `current` when Terraform applied; `www` returning 200 shows the router found `<folder>/build/index.html`. Task 6.4 step (1) records the folder's name and what it holds. Task 6.4 then builds and promotes a main release, probes the routes and removes the legacy root objects. The cutover placeholder folder predates the storage split and has no `release.json`, so it cannot be promoted and is no rollback target. After task 6.4 step (2), rollback is promoting the previous main release that has a `release.json`.

## Alternatives considered

- **Google All versus the News tab.** The News tab returned no links in the pilot (verify.md, "Five daily terms and the seven-day wait").
- **Five terms and 168 hours versus more terms or a shorter wait.** More terms, or repeating a term sooner, would use up the SerpApi free plan's searches sooner and would need a paid plan.
- **A 0.30 overlap versus 0.2 or 0.5.** At 0.2, two shared paragraphs out of ten (for example a shared quote and a stock closing paragraph) would merge two different stories. At 0.5, a copy that trims or rewrites half of the story would become a second article.
- **KVS markers versus Lambda@Edge, an S3 existence check or origin failover.** Lambda@Edge adds a paid function call on every request and deploys more slowly. An S3 existence check adds an origin round trip to every request. Origin failover makes every page without an override miss once at the override origin first. A KVS marker is read inside the existing router.
- **Common Crawl rank versus a paid domain-authority service.** A paid service costs money and needs an account and a key. Common Crawl rank is free.
- **A commit-hash release ID versus a versioned ID (commit plus build number).** A versioned ID would give a commit more than one folder. Owner decision Q4 rejects that: a rebuild goes to the same `<commit>` folder, and release hosts address a release by its commit.

## Risks and limits

- **False officer links.** Mitigated by exact roster-name matching plus inference. Corrections are flagged.
- **SerpApi cost.** Searches stop for the run when the free plan's searches are used up. Terms are skipped until the allowance resets, so a day can search fewer than five terms.
- **KVS capacity.** Redirects are files in each release's own `redirect/<release-id>/` folder, not KVS keys (owner decision "Redirect layer", 2026-11-22; `atomic-sha-deploys` "Redirect build"), so promotion adds no keys. Only `o:` keys accumulate, one per published override path per release, against the 5 MB store limit. Keys are not pruned (owner decision, 2026-11-22), because release hosts serve every kept release with its own overrides. If the store fills, `publish-page` writes fail.
- **ETag contention.** `promote.sh` and `publish-page` each make one conditional KVS update and fail on a conflict; neither retries. A failed promotion must be rerun; `current` is unchanged. Until `atomic-sha-deploys` task 7.5 lands, a failed promotion has already loaded the release's `r:` keys and replaced the root `404.html`. A failed `publish-page` throws, and the next daily run replays every destination from the source checkpoint.
- **IAM reach.** The `intake_news` role can write `*/override/*` in any folder, but `publish-page` marks only `current`.
- **Invalidation volume.** Each published page invalidates at most five paths. A term's article publishes to every profile and agency page it supports and to the homepage when it ranks, and at most five terms run a day.
- **Writer freshness.** Enforced by conditional writes and the workflow concurrency group.
- **Shared preview 404 page.** Promoting any preview label replaces the shared preview `404.html`.
- **Original page as the only source.** Daily can use only what the original page carries. A value the page lacks is a gap for the owner, not a new site file.
- **Unimported news.** News the daily Action adds is lost from `www` when a newer release is promoted before the manual import (see "Release and page object").
- **Rebuild under overrides.** A rebuild of the current commit leaves overrides and `o:` keys in place, so each overridden path keeps serving its override, rendered from the earlier build with the earlier data version. Daily's next publication to that path renders its saved news list against the rebuilt original, so news the rebuild added from the database does not show on that path unless Daily's saved list also has it. This follows from the storage split; no task here handles it.

## Review and rollout

Exercise daily discovery and the ordinary build. For the website, test empty and populated regions, subsequent changes to a different part, an updated preferred URL, two overlapping writes and a retry after only one of two destination pages was published. Check both destinations before advancing the checkpoint. Test an old open form, a custom form payload and a preview built from the production commit. Verify the router serves the release returned by the API and refreshes previously visited originals and overrides. Render a title containing literal HTML as text. After the release that contains the snapshot API, markup and router is promoted to production from main, start the daily Action.

## Decisions

- Forms send `dataVersion` from the page beside `releaseId`. A missing `dataVersion` is saved and logged, like a missing `releaseId`.
- An override page keeps its release's `data-data-version`. The daily job stores the data it used to render the override, and intake later acquires the same data and imports it into the database, so a later build carries it under a new data version. No separate override version is recorded (owner, 2026-11-22).
- Form release IDs are known when `builds/<release-id>/build/release.json` exists in that environment's release-data bucket. A submission with an unknown or missing release ID is still saved, and the mismatch is logged.
- Routing uses KVS `o:` markers, and `publish-page` invalidates the paths.
- Daily's page data, aliases and evidence are stored in the private release-data bucket, under prefixes only Daily writes. The build uploads no data (owner, 2026-11-22).
- The daily Action rebuilds an override from the original page as its only source, for now (owner, 2026-11-22).
- Templates use `fromOriginal`.
- Rank ties follow `release-news.ts:79-86` and `coverage.ts:142-147`.
- The inference service works with any provider, including a local one. `NEWS_INFERENCE_URL`, `NEWS_INFERENCE_MODEL` and `NEWS_INFERENCE_API_KEY` select it through configuration; no provider is hard-wired. Task 4.2 needs these values set.
