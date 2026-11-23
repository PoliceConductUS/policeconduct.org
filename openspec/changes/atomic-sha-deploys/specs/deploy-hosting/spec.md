## ADDED Requirements

### Requirement: Each commit has one build folder per bucket

The system SHALL store each uploaded build, preview or release, in one folder per bucket named by its release ID, the full 40-character commit. A build SHALL write only the build-owned prefixes `<commit>/build/` in the site bucket and `builds/<commit>/build/` in the release data bucket. A rebuild of the same commit SHALL leave those two prefixes equal to the latest build. The build SHALL NOT upload the data it read. Each build SHALL record the data version it read.

#### Scenario: Folder layout

- **WHEN** a release uploads
- **THEN** site files go to `<commit>/build/` and build artifacts for the daily job go to `builds/<commit>/build/`
- **AND** redirect objects go to `<commit>/build/` after the site files
- **AND** `builds/<commit>/build/release.json`, holding `commit`, `branch`, `pr` and `dataVersion`, is uploaded last as the completion marker

#### Scenario: The build uploads no data

- **WHEN** a release uploads
- **THEN** no page data, roster or alias file is uploaded to any bucket

#### Scenario: Unclean tree or other branch

- **WHEN** the working tree has uncommitted or untracked changes, or a `prod` deploy runs from a branch other than `main`
- **THEN** the deploy stops before building

#### Scenario: Release ID is the commit

- **WHEN** a commit is deployed
- **THEN** its release ID is the full 40-character commit

#### Scenario: Redeploying a commit against newer data

- **WHEN** a commit that already has a release folder is deployed again
- **THEN** the new build uploads into the same `<commit>/build/` and `builds/<commit>/build/` prefixes
- **AND** files the new build changed are replaced
- **AND** files the new build no longer produces are removed from those two prefixes only
- **AND** `release.json` is uploaded last

#### Scenario: PR builds stay in the preview buckets

- **WHEN** a deploy runs for any environment other than `prod`
- **THEN** it uploads only to the preview site bucket and the preview release data bucket

#### Scenario: Only a main build selects `current:main`

- **WHEN** a deploy that is not a `prod` deploy from `main` runs
- **THEN** it does not write `current:main`
- **AND** this scenario is replaced when `openspec/changes/release-hosts/` removes the `current:main` mirror

#### Scenario: Data version recorded

- **WHEN** a release builds
- **THEN** the build reads the data version once: the `version` of the newest row in `public.data_mutation_applied`, which is the one row that no row names as `previous_version`
- **AND** every built page renders it as `data-data-version` on `<html>`, next to `data-release-id`
- **AND** `.release/source.json` and `builds/<commit>/build/release.json` record the same value as `dataVersion`

#### Scenario: Data version cannot be read

- **WHEN** `public.data_mutation_applied` is missing, has no row that no other row names as `previous_version`, or has more than one such row
- **THEN** the build stops with an error and no page is built with a fallback value

#### Scenario: Resuming an interrupted upload

- **WHEN** `npm run deploy -- <environment> --skip-build` reruns with the same build
- **THEN** the upload sends only files that differ and ends with the folder equal to that build

### Requirement: A rebuild never touches daily output

A build or rebuild SHALL NOT write, delete or read `<commit>/override/` in the site bucket or `builds/<commit>/data/` in the release data bucket. Those prefixes belong to the daily job.

#### Scenario: A rebuild leaves daily output alone

- **WHEN** a commit whose `<commit>/override/` and `builds/<commit>/data/` hold daily job output is deployed again
- **THEN** every object under those two prefixes is unchanged
- **AND** no deploy command writes, deletes or reads them

#### Scenario: Rebuild of a release that has overrides

- **WHEN** a commit whose release has overrides is rebuilt into its folder
- **THEN** its `<commit>/override/` objects and `o:<commit>:` keys are unchanged
- **AND** each overridden page keeps the `data-data-version` of the build it was rendered from

### Requirement: Promotion moves a pointer

Promoting a release SHALL check that the release is complete, copy its `404.html` to the bucket root, move the host's pointer with the KVS ETag guard, and invalidate `/*`. Promotion SHALL NOT write redirect keys. Every `npm run deploy -- prod` SHALL promote the release it uploads, with no approval step. Every preview deploy SHALL point `current:pr-<N>` at its build with the same steps: completeness check, `404.html` copy, ETag-guarded pointer move and `/*` invalidation.

#### Scenario: Promoting a release

- **WHEN** a complete release is promoted
- **THEN** the pointer for that host names the release
- **AND** the release's `404.html` is copied to the bucket root
- **AND** CloudFront is invalidated for `/*`

#### Scenario: Promoting an earlier release

- **WHEN** an earlier complete release is promoted again with `npm run deploy:promote -- <release-id>`
- **THEN** that release serves after the KVS change reaches the edge locations and the invalidation completes
- **AND** its own `404.html` is restored at the bucket root

#### Scenario: Incomplete release

- **WHEN** a release has never completed an upload, so `builds/<release-id>/build/release.json` or `<release-id>/build/index.html` is missing
- **THEN** promotion stops before any pointer change

#### Scenario: Release folder from before the storage split

- **WHEN** a release folder was uploaded before this change and has no `builds/<release-id>/build/release.json`
- **THEN** it cannot be promoted and gets no release host
- **AND** no tool writes a `release.json` for it

#### Scenario: Production deploy mirrors to bare preview

- **WHEN** `npm run deploy -- prod` runs
- **THEN** it uploads the same build to the preview site and preview release data buckets and points `current:main` at it before promoting `current`
- **AND** this scenario is replaced by `openspec/changes/release-hosts/` ("Production deploys write only production resources")

### Requirement: Previews are PR builds only

A deploy to any environment other than `prod` SHALL require `PR_NUMBER` matching `^[1-9][0-9]*$` and SHALL use the label `pr-<PR_NUMBER>`.

#### Scenario: Preview deploy without a PR number

- **WHEN** `npm run deploy -- preview` runs without `PR_NUMBER`, with or without `PREVIEW_NAME`, and with or without `--skip-build`
- **THEN** the deploy stops before building or uploading

#### Scenario: Invalid PR number

- **WHEN** `PR_NUMBER` is `0` or not a positive integer
- **THEN** the deploy stops before building or uploading

### Requirement: The router serves the promoted release per host

The shared CloudFront router SHALL pick the release for each request from a KVS pointer for that host and SHALL keep the release folder out of the viewer URL. Redirects SHALL follow `shared-redirects` semantics, served from the release's own redirect files. The router SHALL NOT read `r:` keys.

#### Scenario: Canonical host

- **WHEN** a request arrives for the canonical host
- **THEN** the router serves `/<current>/build/<path>`, or `/<current>/override/<path>` when `o:<current>:<path>` exists

#### Scenario: Apex host

- **WHEN** a request arrives for the apex and the apex is not the canonical host
- **THEN** the router returns a 301 to the canonical host with the same path and query string

#### Scenario: Preview host

- **WHEN** a request arrives for `pr-<N>.preview.<domain>`
- **THEN** the router uses the `current:pr-<N>` pointer
- **AND** returns 404 when that pointer does not exist

#### Scenario: Bare preview host

- **WHEN** a request arrives for `preview.<domain>`
- **THEN** the router uses the `current:main` pointer
- **AND** returns 404 when that pointer does not exist
- **AND** this scenario is replaced by `openspec/changes/release-hosts/` (bare `preview.` redirects to `www`)

#### Scenario: Unknown host or unsafe path

- **WHEN** the host matches no rule, the preview label is not `pr-<N>`, or the decoded path is reserved (`/builds`, `/data`, `/evidence`, `/news-discovery`, `/com/serpapi/landing-page-search`, or `/<segment>/build` or `/<segment>/override`, each followed by `/` or the end of the path) or contains `.` or `..` segments, `\` or `%`
- **THEN** the router returns 404

#### Scenario: Retired prefix

- **WHEN** the decoded path matches a pattern in `functions/redirect-prefixes.json`
- **THEN** the router rewrites the request to `/<current>/build/<matched prefix>index.html`

#### Scenario: Redirect object

- **WHEN** the object the router requests carries `x-amz-meta-redirect-location`
- **THEN** the viewer-response function returns a 301 to that target with the query string kept
- **AND** the response does not carry `x-amz-meta-redirect-location`

### Requirement: Overrides stay with their release

An override SHALL serve only while its release is the one a pointer names. Promotion SHALL NOT copy overrides between releases.

#### Scenario: New release promoted

- **WHEN** a new release is promoted
- **THEN** pages serve from its `build/` folder until the release API publishes overrides for it
- **AND** the previous release's overrides no longer serve

#### Scenario: Earlier release promoted again

- **WHEN** an earlier release is promoted again
- **THEN** its own overrides serve again

### Requirement: Non-production hosts are not indexed

The system SHALL send `X-Robots-Tag: noindex, nofollow` on every preview distribution response and SHALL answer `/robots.txt` with deny-all on every host except the apex and the canonical host.

#### Scenario: Preview distribution response

- **WHEN** any response is served by the preview distribution, a redirect included
- **THEN** it carries `X-Robots-Tag: noindex, nofollow`

#### Scenario: robots.txt on a non-production host

- **WHEN** `/robots.txt` is requested on a host other than the apex or canonical host
- **THEN** the router returns a deny-all `robots.txt`

#### Scenario: Production host

- **WHEN** a response is served for the canonical host
- **THEN** it carries no `noindex` directive

### Requirement: Releases are kept and previews end with their PR

Release folders in the production site bucket and their production release data SHALL never be deleted. When a PR closes, the system SHALL delete its `current:pr-<N>` pointer and then every folder in the preview site bucket and every `builds/<release-id>/` in the preview release data bucket whose release ID no remaining `current*` pointer in the preview store names. KVS keys for a removed preview SHALL be removed by hand.

#### Scenario: PR closes

- **WHEN** a PR closes
- **THEN** `current:pr-<N>` is deleted
- **AND** every preview site folder and preview `builds/<release-id>/` that no remaining `current*` pointer names is deleted, including the folders of the PR's earlier pushes
- **AND** its `o:` keys stay until removed with `npm run deploy:delete -- <release-id>`

#### Scenario: Shared preview folder

- **WHEN** a PR closes and another preview pointer names the same release ID
- **THEN** that folder and its preview release data are kept

#### Scenario: Interrupted cleanup

- **WHEN** a folder delete fails and the cleanup is run again
- **THEN** the second run deletes every folder that no pointer names

#### Scenario: Removing keys of a named release

- **WHEN** `npm run deploy:delete -- <release-id>` runs and a preview pointer names that release
- **THEN** it stops without deleting any key

#### Scenario: Deleting a production release

- **WHEN** an operator tries to delete a production release folder with the release tools
- **THEN** no tool offers that operation
