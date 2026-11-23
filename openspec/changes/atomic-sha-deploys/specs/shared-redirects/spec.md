## MODIFIED Requirements

### Requirement: Redirect semantics are shared across environments

Every host either distribution serves (the canonical host, the apex through its 301 to the canonical host, release hosts, and `pr-<N>.preview.<domain>` hosts) SHALL use the same redirect mechanism. Redirects SHALL be redirect files: empty S3 objects in the site bucket of the distribution (the production site bucket for releases, the preview site bucket for previews), in the folder `redirect/<commit>/` of the build they belong to, each at `redirect/` followed by the exact key the router requests from the release folder for the old path, each carrying its target in the S3 metadata header `x-amz-meta-redirect-location`. Each distribution SHALL serve them through an origin group whose primary origin is its site bucket and whose failover origin is the same bucket with `origin_path = "/redirect"`, failing over on 403 and 404. A viewer-response CloudFront Function SHALL turn a response that carries that header into a 301. Redirects SHALL NOT be stored as KVS keys, the router SHALL NOT look up redirects, and there SHALL be no wildcard redirects.

#### Scenario: A mapped legacy URL is requested

- **WHEN** a request path has no object in the served release folder and has a redirect file in that release's `redirect/<commit>/` folder
- **THEN** the response is HTTP 301 to the stored target on the same host, preserving query parameters
- **AND** the response does not carry `x-amz-meta-redirect-location`

#### Scenario: Missing key answers 403

- **WHEN** the primary origin answers 403 for a missing object, because the site bucket grants CloudFront no `s3:ListBucket`
- **THEN** CloudFront retries the same rewritten path on the failover origin
- **AND** returns the normal 404 page when the failover object is missing too

#### Scenario: A current page is requested

- **WHEN** the served release folder has the object the router requests
- **THEN** the primary origin serves it, even if a redirect file exists for the same path

#### Scenario: A path under an old wildcard is requested

- **WHEN** a request path matched a `/*` entry of the old redirect map (for example under `/videos/`) and has no redirect file
- **THEN** the response is the normal 404

#### Scenario: A release host is requested

- **WHEN** a release host serves release `<commit>` and the path has a redirect file in `redirect/<commit>/`
- **THEN** that release's own redirect file answers with a 301

#### Scenario: A preview host is requested

- **WHEN** a request on `pr-<N>.preview.<domain>` has no object in the build `current:pr-<N>` names and has a redirect file in `redirect/<release-id>/` of the preview site bucket
- **THEN** the response is HTTP 301 to the stored target, preserving query parameters
- **AND** it carries `X-Robots-Tag: noindex, nofollow`

#### Scenario: A preview host has no redirect file for the path

- **WHEN** a request for a path with no object and no redirect file arrives on a preview host
- **THEN** the response is the normal 404 with `X-Robots-Tag: noindex, nofollow`

## REMOVED Requirements

### Requirement: Local publication loads redirects safely

**Reason**: Publication no longer loads redirects. The release build and promotion write no redirects; the redirect build writes redirect files to their own folder (see "The redirect build writes only its own folder").

**Migration**: KVS `r:` keys are deleted once by hand after the cutover. `scripts/load-redirects.mjs` and its store-limit checks are deleted.

### Requirement: Approved duplicate agency URLs retain navigation

**Reason**: The redirect generator and its merge of the intake workspace `redirects.json` are deleted. Redirects come from the redirect build.

**Migration**: The first redirect build carries every exact entry of the live `/_redirect-map.json`, including these mappings, into the first release's `redirect/<commit>/` folder. Later redirect builds carry them forward from the folder of the release `www` serves. Nothing reads the workspace file afterwards.

### Requirement: Legacy agency collections reach existing civic indexes

**Reason**: The redirect generator that derived these redirects from database counts is deleted, and wildcard patterns go away (owner decision, 2026-11-22).

**Migration**: The first redirect build carries the exact collection and pagination entries of the live `/_redirect-map.json`, re-pointed to current paths. The pagination wildcards are dropped; old page numbers that no sitemap listed return 404.

## ADDED Requirements

### Requirement: The redirect build writes only its own folder

The redirect build SHALL write only redirect files, and only under `redirect/<commit>/` in the site bucket of its target: the production site bucket for a release, the preview site bucket for an open-PR preview. A preview run SHALL NOT write the production site bucket. It SHALL NOT write, delete or read `<commit>/build/` or `<commit>/override/` in either bucket. A rerun for the same target SHALL leave `redirect/<commit>/` equal to the latest run's set.

#### Scenario: Invalid redirect set

- **WHEN** a path is invalid or holds a character outside printable ASCII, a target is not a route in the target release or is itself an old path, or two old paths share one object key
- **THEN** the redirect build stops before writing any redirect file

#### Scenario: Rerun for the same commit

- **WHEN** the redirect build runs again for a commit
- **THEN** redirect files the new run does not produce are deleted from `redirect/<commit>/` only
- **AND** no object under `<commit>/build/` or `<commit>/override/` is written or deleted

#### Scenario: A redirect write fails

- **WHEN** a redirect file still fails to upload after its retries
- **THEN** the redirect build exits non-zero
- **AND** `npm run deploy -- prod` stops before promotion

### Requirement: A redirect build derives the redirect set

`npm run redirects:build -- [<commit>]` SHALL derive the full redirect set for a target release (default: the tip of `main`) every time, with nothing committed. It SHALL compare the `www` sitemap with the target (a local build of that commit, or else `<commit>.release.<domain>`). It SHALL map each missing `www` path to the target page of the record the old page names, SHALL carry forward the redirects of the release `www` serves, and SHALL report every old path with no target and why.

#### Scenario: A page moved

- **WHEN** a `www` sitemap path is not a route in the target and its old page names a record whose page is in the target
- **THEN** a redirect file from that path to the record's page is written
- **AND** the database and the intake workspace are not read

#### Scenario: No target

- **WHEN** the record has no page in the target, the old page returns 404 on `www`, or the path is an old video page
- **THEN** no redirect file is written, so the path returns 404
- **AND** the redirect build records the path with a reason naming the cause

#### Scenario: Carried redirects come from the served release's folder

- **WHEN** the redirect build reads production's current redirects
- **THEN** it lists the redirect files under `redirect/<www commit>/` in the production site bucket and reads each one's target
- **AND** a listing or read failure stops it before it writes

#### Scenario: Old pagination page

- **WHEN** a missing `www` path is `<list>page/<n>/`
- **THEN** its target is the page of `<list>` in the target that lists the old page's first listed record, or no target when none lists it

#### Scenario: Carried redirect re-pointed

- **WHEN** a redirect of the release `www` serves points to a path that is no longer a route in the target
- **THEN** the new redirect points to that path's own target, so no chain remains
- **AND** no file is written when that path has no target, or when the old path is itself a route in the target

#### Scenario: www unreachable

- **WHEN** a request to `www` fails after its retries
- **THEN** the redirect build reports that `www` is unreachable, writes nothing, and exits non-zero
- **AND** the existing `redirect/<commit>/` folder is unchanged

#### Scenario: Old pages without a record

- **WHEN** the release `www` serves has no `redirect/<commit>/` folder, or an old page names no record
- **THEN** the redirect build starts from the exact entries of `www`'s `/_redirect-map.json` and drops its `/*` entries
- **AND** derives an old page's record from its URL, slug, other ld+json and `<h1>` when exactly one record in the target matches
- **AND** skips each page it cannot resolve, then opens it in the owner's default browser and uses the owner's answer for that run as a redirect or as no target

#### Scenario: Promotion order

- **WHEN** `npm run deploy -- prod` runs
- **THEN** the redirect build for the uploaded release runs after the upload and before promotion
- **AND** a failed redirect build stops the deploy before promotion

### Requirement: Redirect exclusions return 404

The committed file `route-absences.json`, with entries `{ path, reason }` of exact paths, SHALL list the redirect exclusions: old URLs that may return 404. The redirect build SHALL create no redirect for, and carry forward no redirect from, a listed path. The coverage check SHALL require that no redirect starts at a listed path.

#### Scenario: Excluded path

- **WHEN** an old path, from the `www` sitemap or from a carried redirect, is listed in `route-absences.json`
- **THEN** no redirect file is written for it, so it returns 404
- **AND** the redirect build records it with that entry's reason

#### Scenario: Redirect from an excluded path

- **WHEN** the redirect set holds a redirect whose old path is listed in `route-absences.json`
- **THEN** the coverage check fails

### Requirement: A preview has its own redirect build

`npm run redirects:build:preview -- <pr-number>` SHALL run the same redirect build, with the same `www` inputs, carried redirects and exclusions, for the build `current:pr-<N>` names. It SHALL read target pages from a local build of that commit or else from `pr-<N>.preview.<domain>`, and SHALL write only under `redirect/<release-id>/` in the preview site bucket.

#### Scenario: Preview target

- **WHEN** `npm run redirects:build:preview -- <N>` runs
- **THEN** the target is the release ID in the `data-release-id` of `pr-<N>.preview.<domain>`
- **AND** redirect files are written only under `redirect/<release-id>/` in the preview site bucket, and the preview distribution is invalidated
- **AND** nothing is written to the production site bucket

### Requirement: Pages name their record

Each page rendered from an intake page view SHALL name its record, by the kind and id the page view gives, in an ld+json `identifier`. Each page of a paginated list SHALL name its listed records, in page order, in an ld+json `ItemList`.

#### Scenario: Record page

- **WHEN** an agency, personnel or report page is built
- **THEN** its ld+json has exactly one `identifier` with the page view's kind and id

#### Scenario: Page without a page view

- **WHEN** a page is not rendered from a page view (for example the FAQ)
- **THEN** its ld+json has no `identifier`

### Requirement: Every prior URL has an explicit disposition

The coverage check (`npm run validate:redirects -- <commit> [--preview]`) SHALL check the redirect build's output for one target. It SHALL require every `www` sitemap path to be a target route, to have exactly one redirect to a terminal target route, or to have no target with a nonempty recorded reason. It SHALL require the redirect files under `redirect/<commit>/` in the target's site bucket to equal the redirect set. The redirect build SHALL run it as its last step.

#### Scenario: Personnel not populated by intake

- **WHEN** a missing `www` personnel URL's record has no page in the target
- **THEN** the coverage check passes for that URL and counts it as absent (404) with its recorded reason
- **AND** no return date or permanent-removal status is inferred

#### Scenario: No target creates nothing

- **WHEN** a `www` sitemap path has no target
- **THEN** it keeps the normal 404 response
- **AND** no redirect, page or 410 response is created for it

#### Scenario: Unresolved path

- **WHEN** a `www` sitemap path is still unresolved at the end of the redirect build
- **THEN** the coverage check fails, naming the path and `npm run redirects:build -- <commit>`

#### Scenario: Incomplete upload

- **WHEN** the keys under `redirect/<commit>/` differ from the redirect set in the redirect build's output
- **THEN** the coverage check fails

#### Scenario: Invalid redirect

- **WHEN** a redirect has a target that is not a target route or is itself a redirect source, or the redirect build's output is missing or malformed
- **THEN** the coverage check fails
