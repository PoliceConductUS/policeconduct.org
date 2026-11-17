## Why

`policeconduct.org` needs a durable data platform before adding many new sources such as FOIA responses, publisher websites, CourtListener, OpenSalary, and manual data imports. The current site already publishes a large static surface from PostgreSQL, but it does not define a separate operating model for ingestion, normalization, lineage, archive retention, rating/stat recomputation, or incremental publishing.

The next stage of the system needs an architecture that can absorb many heterogeneous sources, preserve raw evidence, support replay and backfills, and publish stable route-oriented read models back to this site without turning the web app into the ingestion runtime. This change locks that architecture before implementation starts in a separate pipeline repository.

## What Changes

This change defines the operating model for the future PoliceConduct data platform:

- a separate pipeline repository owns ingestion, normalization, linking, and rating/stat jobs
- one canonical Postgres core stores operational and publishable data
- S3 stores raw payloads and archive artifacts
- pipeline jobs are code-first, scheduled on ECS/Fargate, and use SQL-first transforms
- the public site remains primarily static and consumes a route-change manifest for targeted rebuilds
- the first rollout remains architecture-only and defers implementation into follow-on changes

## Capabilities

### New Capabilities
- `data-platform`: defines source contracts, raw retention, staged transformations, lineage, data quality assertions, and stat recomputation expectations
- `publish-contract`: defines the stable contract between the future pipeline repository and this publishing web app, including route-change manifests
- `site-publishing`: defines how this repo continues as the static publisher while adopting delta publish inputs from the pipeline

### Modified Capabilities
- None

## Impact

- Affects OpenSpec architecture artifacts in this repo only
- Defines the contract that future pipeline-repo work must implement
- Defines how this site will later adopt publish read models and delta builds
- Does not change application code, infrastructure code, or runtime behavior in this change
