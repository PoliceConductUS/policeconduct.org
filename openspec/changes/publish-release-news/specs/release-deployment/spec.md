## ADDED Requirements

### Requirement: Name deployment folders by commit

Hosting SHALL use `<release-id>/build/` and `<release-id>/override/`, where `<release-id>` is the full current Git commit hash of a clean repository.

#### Scenario: Deploying uncommitted or stale content

- **WHEN** the repository has staged, unstaged or untracked changes, or an upload belongs to another commit
- **THEN** deployment stops before uploading any content
- **AND** new builds reject a folder override different from the current full commit hash

### Requirement: Only main builds create releases

Only builds from `main` SHALL create releases in the production site bucket or select `current:main`. PR builds SHALL upload to the preview site bucket.

#### Scenario: A branch build targets production

- **WHEN** a build from a branch other than `main` deploys to `prod`
- **THEN** the upload stops before writing

#### Scenario: A branch build uses the main preview name

- **WHEN** a branch build deploys with `PREVIEW_NAME=main`
- **THEN** the upload stops before writing

### Requirement: Promote a complete release

Promotion SHALL select only a release whose `builds/<release-id>/data/dynamic.json` and `<release-id>/build/index.html` exist, and SHALL invalidate CloudFront.

#### Scenario: A release is promoted

- **WHEN** a release is promoted
- **THEN** CloudFront receives a `/*` invalidation

### Requirement: Keep release folders

Release folders SHALL be kept. Only a PR preview folder SHALL be deleted, when its PR closes.

#### Scenario: A PR closes

- **WHEN** a PR closes
- **THEN** its preview host pointer is removed, and its preview folder is deleted unless another preview pointer still selects that folder
- **AND** no release folder in the production site bucket is deleted
