## MODIFIED Requirements

### Requirement: Redirect semantics are shared across environments

Production and preview SHALL use the same redirect routing implementation and the same redirect files, with environment-specific storage selection only. Each release SHALL hold its own redirect files in `<release-id>/build/`, one per entry of the committed `redirects.json` of its commit. A redirect file SHALL sit at the exact object key the router requests for its old path and SHALL carry its target in the S3 metadata header `x-amz-meta-redirect-location`. A viewer-response CloudFront Function SHALL turn a response that carries that header into a 301. Redirects SHALL NOT be stored as KVS keys, and there SHALL be no wildcard redirects.

#### Scenario: A mapped legacy URL is requested

- **WHEN** a request path has a redirect file in the served release
- **THEN** the response is HTTP 301 to the stored target on that environment's host, preserving query parameters
- **AND** the response does not carry `x-amz-meta-redirect-location`

#### Scenario: A path under an old wildcard is requested

- **WHEN** a request path matched a `/*` entry of the old redirect map (for example under `/videos/`) and is not a key in `redirects.json`
- **THEN** the response is the normal 404

#### Scenario: A current page is requested

- **WHEN** no redirect file matches
- **THEN** the request resolves to its current environment's file layout

#### Scenario: An older release host is requested

- **WHEN** a release host serves an earlier release
- **THEN** that release's own redirect files answer its redirects

### Requirement: Local publication loads redirects safely

A separate build step after the full site build (`scripts/write-redirect-files.mjs`, run by `scripts/build-release.mjs` after `npm run build:site`) SHALL write the redirect files from the committed `redirects.json` only. The release build SHALL NOT read `www`. Upload SHALL put every redirect file with its own metadata into the build-owned `<release-id>/build/` prefix before `release.json`.

#### Scenario: A map is malformed

- **WHEN** `redirects.json` is missing or malformed, a path is invalid, a target is not a route in the build or is itself an old path, a redirect file would replace a built file, two old paths share one object key, or a path holds a character outside printable ASCII
- **THEN** the build stops before writing any redirect file

#### Scenario: The build does not read www

- **WHEN** the release build runs, with `www` reachable or not
- **THEN** it makes no request to `www`
- **AND** its redirect files equal the entries of the committed `redirects.json`

#### Scenario: A redirect upload fails

- **WHEN** a redirect file still fails to upload after its retries
- **THEN** the deploy stops before `release.json` is uploaded and before promotion

#### Scenario: Preview redirects are verified

- **WHEN** a preview is deployed
- **THEN** representative legacy production paths return the expected HTTP redirect and resolve to available preview destinations

## REMOVED Requirements

### Requirement: Approved duplicate agency URLs retain navigation

**Reason**: The redirect generator and its merge of the intake workspace `redirects.json` are deleted. Redirects live in the committed `redirects.json`, updated by `npm run redirects:update`.

**Migration**: The first run of `npm run redirects:update` carries every exact entry of the live `/_redirect-map.json`, including these mappings, into `redirects.json`. Nothing reads the workspace file afterwards.

### Requirement: Legacy agency collections reach existing civic indexes

**Reason**: The redirect generator that derived these redirects from database counts is deleted, and wildcard patterns go away (owner decision, 2026-11-22).

**Migration**: The first run of `npm run redirects:update` carries the exact collection and pagination entries of the live `/_redirect-map.json` into `redirects.json`, re-pointed to current paths. The pagination wildcards are dropped; old page numbers that no sitemap listed return 404.

## ADDED Requirements

### Requirement: The redirect list is updated by a command and committed

The website SHALL keep its redirects in the committed repository-root `redirects.json`, one entry per line from old path to current path. `npm run redirects:update` SHALL update it and `route-absences.json` against a local build of the current commit. It SHALL read only the sitemap and old pages of `www` (the current production build), and SHALL map each missing `www` sitemap path to the build's page for the record the old page names. It SHALL NOT read the database or the intake workspace.

#### Scenario: A page moved

- **WHEN** a `www` sitemap path is not in the local build and its old page names a record whose page is in the build
- **THEN** `redirects.json` gets an entry from that path to the record's page

#### Scenario: No target

- **WHEN** the record has no page in the build, the old page returns 404 on `www`, or the path is an old video page
- **THEN** no redirect is added
- **AND** `route-absences.json` gets an entry for the path with a reason naming the cause, so the path returns 404

#### Scenario: Old pagination page

- **WHEN** a missing `www` path is `<list>page/<n>/`
- **THEN** its target is the page of `<list>` in the build that lists the old page's first listed record, or no target when none lists it

#### Scenario: Existing entry re-pointed

- **WHEN** an entry's target is no longer a route in the build
- **THEN** the entry points to that target's record's page in the build, so no chain remains
- **AND** the entry is deleted when that record has no page, or when the entry's old path is itself a route in the build

#### Scenario: www unreachable

- **WHEN** a request to `www` fails after its retries
- **THEN** the command reports that `www` is unreachable, changes no file, and exits non-zero

#### Scenario: A redirect is removed

- **WHEN** a commit deletes an entry's line from `redirects.json`
- **THEN** releases built from that commit on return 404 for that old path
- **AND** a later run does not add it back unless that path is again a `www` sitemap path missing from the build

#### Scenario: First run from the live site

- **WHEN** `redirects.json` does not exist, or an old page names no record
- **THEN** the command starts from the exact entries of `www`'s `/_redirect-map.json` and drops its `/*` entries
- **AND** derives an old page's record from its URL, slug, other ld+json and content when exactly one record in the build matches
- **AND** skips each page it cannot resolve, writes it to `.release/redirects-unresolved.json`, then opens it in the owner's default browser and records the owner's answer for that run as an entry or an absence entry

### Requirement: Pages name their record

Each page rendered from an intake page view SHALL name its record, by the kind and id the page view gives, in an ld+json `identifier`. Each page of a paginated list SHALL name its listed records, in page order, in an ld+json `ItemList`.

#### Scenario: Record page

- **WHEN** an agency, personnel or report page is built
- **THEN** its ld+json has exactly one `identifier` with the page view's kind and id

#### Scenario: Page without a page view

- **WHEN** a page is not rendered from a page view (for example the FAQ)
- **THEN** its ld+json has no `identifier`

### Requirement: Every prior URL has an explicit disposition

The coverage check SHALL read the committed `redirects.json` and resolve each path as the router does. It SHALL require every prior sitemap URL to be a route in the current build (in the current sitemap or a generated HTML route), redirect directly to a terminal current route, or have an exact path and nonempty reason in `route-absences.json`.

#### Scenario: Personnel not populated by intake

- **WHEN** a missing prior personnel URL has an explicit absence entry
- **THEN** the coverage check passes for that URL and counts it as absent (404)
- **AND** no return date or permanent-removal status is inferred

#### Scenario: Absence entries create nothing

- **WHEN** a prior URL is covered only by its `route-absences.json` entry
- **THEN** it keeps the existing 404 response
- **AND** no redirect, page or 410 response is created for it
- **AND** missing intake data is not treated as permanent removal

#### Scenario: Unaccounted gap

- **WHEN** a prior URL is missing without a redirect or exact absence entry
- **THEN** the coverage check fails, naming `npm run redirects:update`
- **AND** an entry for a parent or another personnel URL does not cover the gap

#### Scenario: Profile returns

- **WHEN** a previously absent URL is a route in the current build
- **THEN** it counts as a current route even if its absence entry remains

#### Scenario: Invalid redirect or absence list

- **WHEN** a redirect has a missing or nonterminal destination, or the absence list is missing, malformed, or contains an invalid entry
- **THEN** the coverage check fails

#### Scenario: Deployment coverage gate

- **WHEN** `npm run deploy -- <environment>` runs, with or without `--skip-build` or `--dry-run`
- **THEN** `npm run validate:redirects` runs after the build (when the build runs) and before `scripts/upload-release.sh`
- **AND** a failed check stops the deploy before the output check, any S3 write, any redirect load, any pointer change, and any CloudFront invalidation

#### Scenario: First deploy bypass

- **WHEN** `PRIOR_SITEMAP=skip` is set
- **THEN** the coverage check logs the bypass and passes without reading a prior sitemap
