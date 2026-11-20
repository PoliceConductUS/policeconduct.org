## ADDED Requirements

### Requirement: Each commit has one release folder

The system SHALL store each release in one folder named by its release ID, the full 40-character commit. A rebuild of the same commit SHALL upload into the same folder and SHALL leave the folder equal to the latest build. Each build SHALL record the data version it read.

#### Scenario: Folder layout

- **WHEN** a release uploads
- **THEN** site files go to `<commit>/build/` and release data to `builds/<commit>/data/`
- **AND** `dynamic.json` is uploaded last

#### Scenario: Unclean tree or other branch

- **WHEN** the working tree has uncommitted or untracked changes, or a `prod` deploy runs from a branch other than `main`
- **THEN** the deploy stops before building

#### Scenario: Release ID is the commit

- **WHEN** a commit is deployed
- **THEN** its release ID is the full 40-character commit

#### Scenario: Redeploying a commit against newer data

- **WHEN** a commit that already has a release folder is deployed again
- **THEN** the new build uploads into the same `<commit>/build/` and `builds/<commit>/data/` folders
- **AND** files the new build changed are replaced
- **AND** files the new build no longer produces are removed
- **AND** `dynamic.json` is uploaded last

#### Scenario: Data version recorded

- **WHEN** a release builds and uploads
- **THEN** `.release/source.json` records the data version the build read
- **AND** the uploaded release record `builds/<commit>/source.json` carries the same data version

#### Scenario: Resuming an interrupted upload

- **WHEN** `npm run deploy -- <environment> --skip-build` reruns with the same build
- **THEN** the upload sends only files that differ and ends with the folder equal to that build

### Requirement: Promotion moves a pointer

Promoting a release SHALL check that the release is complete, load its redirect map into `r:<release-id>:`, copy its `404.html` to the bucket root, move the host's pointer with the KVS ETag guard, and invalidate `/*`. Every `npm run deploy -- <environment>` SHALL promote the build it uploads, with no approval step.

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

- **WHEN** `builds/<release-id>/data/dynamic.json` or `<release-id>/build/index.html` is missing
- **THEN** promotion stops before any redirect load or pointer change

### Requirement: The router serves the promoted release per host

The shared CloudFront router SHALL pick the release for each request from a KVS pointer for that host and SHALL keep the release folder out of the viewer URL. Redirect lookups SHALL follow `shared-redirects` semantics within the `r:<release-id>:` namespace.

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

#### Scenario: Unknown host or unsafe path

- **WHEN** the host matches no rule, the preview label is not `pr-<N>`, or the decoded path is reserved (`/builds/`, `/data/`, `/<id>/build/`, `/<id>/override/` and the other reserved prefixes) or contains `.` or `..` segments, `\` or `%`
- **THEN** the router returns 404

#### Scenario: Redirect

- **WHEN** `r:<release-id>:<path>` exists, or an `r:<release-id>:<prefix>/*` key exists for the longest matching prefix
- **THEN** the router returns a 301 to the stored target with the query string kept

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

The system SHALL keep search engines off every host except the apex and the canonical host.

#### Scenario: Preview distribution response

- **WHEN** any response is served by the preview distribution
- **THEN** it carries `X-Robots-Tag: noindex, nofollow`

#### Scenario: robots.txt on a non-production host

- **WHEN** `/robots.txt` is requested on a host other than the apex or canonical host
- **THEN** the router returns a deny-all `robots.txt`

#### Scenario: Production host

- **WHEN** a response is served for the canonical host
- **THEN** it carries no `noindex` directive

### Requirement: Releases are kept and previews end with their PR

Release folders and their release data SHALL never be deleted. When a PR closes, the system SHALL delete its `current:pr-<N>` pointer and, when no other preview pointer names the same release ID, its preview folder and preview release data. KVS keys for a removed preview SHALL be removed by hand.

#### Scenario: PR closes

- **WHEN** a PR closes and no other preview pointer names its release ID
- **THEN** `current:pr-<N>`, `<release-id>/` in the preview site bucket and `builds/<release-id>/` in the preview release data bucket are deleted
- **AND** its `r:` and `o:` keys stay until removed with `npm run deploy:delete -- <release-id>`

#### Scenario: Shared preview folder

- **WHEN** a PR closes and another preview pointer names the same release ID
- **THEN** only `current:pr-<N>` is deleted

#### Scenario: Removing keys of a named release

- **WHEN** `npm run deploy:delete -- <release-id>` runs and a preview pointer names that release
- **THEN** it stops without deleting any key

#### Scenario: Deleting a production release

- **WHEN** an operator tries to delete a production release folder with the release tools
- **THEN** no tool offers that operation
