## ADDED Requirements

### Requirement: Immutable per-build folders with pointer promotion

The system SHALL publish each build to an immutable folder and select the live
production build via a pointer, without mutating previously published builds.

#### Scenario: Publishing a production build

- **WHEN** a merge commit to main is built
- **THEN** its output is written to an immutable `builds/<sha>/` prefix
- **AND** previously published `builds/<sha>/` folders are left unchanged

#### Scenario: Promoting a build

- **WHEN** a build is promoted
- **THEN** a single pointer update makes the apex domain serve that build
- **AND** no CloudFront invalidation is required for the change to take effect

#### Scenario: Rolling back

- **WHEN** a previously promoted build id is promoted again
- **THEN** the apex domain serves that earlier build immediately

### Requirement: Per-request folder routing for prod and previews

A single CloudFront Function SHALL resolve which folder serves a request — the
production pointer for the apex domain and the PR label for preview hosts — from
one distribution and bucket.

#### Scenario: Apex request

- **WHEN** a request arrives for the apex domain
- **THEN** the router serves the folder named by the production pointer
- **AND** the viewer-facing URL is unchanged (no folder prefix is exposed)

#### Scenario: Build request by id

- **WHEN** a request arrives for `<id>.builds.<domain>` (`<id>` = `pr-<n>` or a sha)
- **THEN** the router serves that build's `builds/<id>/` folder
- **AND** the router rejects a host label that is not `^[a-z0-9-]+$`

#### Scenario: Per-build redirect on any host

- **WHEN** a request path matches that build's redirect map
- **THEN** the router returns a 301 to the mapped path
- **AND** this holds on the apex and on every `<id>.builds.<domain>` host, so no
  host returns 404 for a legacy URL

### Requirement: Non-canonical hosts are not indexed

The system SHALL suppress search-engine indexing of non-canonical build hosts at
the CDN response layer, not in the built HTML, because a build is served
unchanged on both the canonical apex and the build hosts.

#### Scenario: Response on a build subdomain

- **WHEN** a response is served for a `<id>.builds.<domain>` host
- **THEN** it carries `X-Robots-Tag: noindex, nofollow`

#### Scenario: Response on the apex

- **WHEN** a response is served for the apex domain
- **THEN** it does not carry a `noindex` robots directive

### Requirement: Incremental rendering against the previous build

The build SHALL re-render only pages whose content changed since the previously
promoted build, reusing unchanged pages from that build.

#### Scenario: Small data change

- **WHEN** a build runs after a change affecting a subset of pages
- **THEN** only pages whose `content_hash` differs from the previous build's
  manifest are re-rendered
- **AND** unchanged pages are carried forward from the previous build folder
- **AND** the published build is identical to a full build of the same commit

#### Scenario: No previous build

- **WHEN** no previous build manifest is available
- **THEN** a full build is performed
