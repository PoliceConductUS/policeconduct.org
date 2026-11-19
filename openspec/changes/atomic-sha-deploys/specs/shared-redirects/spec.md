## ADDED Requirements

### Requirement: Every prior URL has an explicit disposition

The coverage check SHALL require every prior sitemap URL to exist in the current sitemap, redirect directly to a terminal current route, or have an exact path and nonempty reason in `route-absences.json`. Missing intake data SHALL NOT imply permanent removal. Recorded absences permit the existing 404 response without creating redirects, pages, or 410 responses.

#### Scenario: Personnel not populated by intake

- **WHEN** a missing prior personnel URL has an explicit absence entry
- **THEN** the coverage check passes for that URL and counts it as absent (404)
- **AND** no return date or permanent-removal status is inferred

#### Scenario: Unaccounted gap

- **WHEN** a prior URL is missing without a redirect or exact absence entry
- **THEN** the coverage check fails
- **AND** an entry for a parent or another personnel URL does not cover the gap

#### Scenario: Profile returns

- **WHEN** a previously absent URL is present in the current sitemap
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
