## MODIFIED Requirements

### Requirement: Redirect semantics are shared across environments

Production and preview SHALL use the same redirect routing implementation and the same redirect files, with environment-specific storage selection only. Each release SHALL hold its own redirect files in `<release-id>/build/`. A redirect file SHALL sit at the exact object key the router requests for its source path and SHALL carry its target in the S3 metadata header `x-amz-meta-redirect-location`. A viewer-response CloudFront Function SHALL turn a response that carries that header into a 301. Redirects SHALL NOT be stored as KVS keys.

#### Scenario: A mapped legacy URL is requested

- **WHEN** a request path has a redirect file in the served release
- **THEN** the response is HTTP 301 to the stored target on that environment's host, preserving query parameters
- **AND** the response does not carry `x-amz-meta-redirect-location`

#### Scenario: A path under a retired prefix is requested

- **WHEN** a request path matches a pattern in `infrastructure/bootstrap-policeconduct/functions/redirect-prefixes.json`
- **THEN** the router requests the redirect file of the matched prefix
- **AND** the response is a 301 to that file's target, or the normal 404 when the release has no file for that prefix

#### Scenario: A current page is requested

- **WHEN** no redirect file matches
- **THEN** the request resolves to its current environment's file layout

#### Scenario: An older release host is requested

- **WHEN** a release host serves an earlier release
- **THEN** that release's own redirect files answer its redirects

### Requirement: Local publication loads redirects safely

A separate build step after the full site build (`scripts/write-redirect-files.mjs`, run by `scripts/build-release.mjs` after `npm run build:site`) SHALL write the redirect files from `dist/_redirect-map.json`. Upload SHALL put every redirect file with its own metadata into the build-owned `<release-id>/build/` prefix before `release.json`.

#### Scenario: A map is malformed

- **WHEN** a redirect path is invalid, a status is not 301, a `/*` source matches no retired prefix pattern, two sources for one file have different targets, a redirect file would replace a built file, a built file lies under a retired prefix, or a target holds a character outside printable ASCII
- **THEN** the build stops before writing any redirect file

#### Scenario: A redirect upload fails

- **WHEN** a redirect file still fails to upload after its retries
- **THEN** the deploy stops before `release.json` is uploaded and before promotion

#### Scenario: Preview redirects are verified

- **WHEN** a preview is deployed
- **THEN** representative legacy production paths return the expected HTTP redirect and resolve to available preview destinations

## ADDED Requirements

### Requirement: Every prior URL has an explicit disposition

The coverage check SHALL read the generated redirect files (`.release/redirects.json`) and resolve each path as the router does. It SHALL require every prior sitemap URL to be a route in the current build (in the current sitemap or a generated HTML route), redirect directly to a terminal current route, or have an exact path and nonempty reason in `route-absences.json`.

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
- **THEN** the coverage check fails
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
