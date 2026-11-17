## Context

`policeconduct.org` is currently a static Astro site that reads directly from PostgreSQL during build time and publishes to S3/CloudFront. The site already serves a large route surface and relies on database-backed slugs and categories for canonical URLs. It needs a data platform that can ingest multiple external and manual source classes without turning this repo into the operational ingestion system.

The architecture must preserve provenance and replayability, support officer/agency/state rating recomputation, and provide a stable publishing contract back to the web app. The first change should lock these decisions before any pipeline repo is created.

## Goals / Non-Goals

**Goals:**
- define the ownership boundary between the future pipeline repo and this web repo
- define source ingestion and retention expectations for heterogeneous sources
- define raw, normalized, and publish data layers
- define the Postgres schema split and S3 storage responsibilities
- define how delta publishing works without abandoning the current static site model
- define minimum lineage, backfill, idempotency, and data-quality guarantees

**Non-Goals:**
- implementing source connectors
- implementing database migrations
- implementing ECS/Fargate jobs or orchestration code
- implementing delta builds in this repo
- replacing the current site with SSR or a dynamic application

## Decisions

### 1. Repository and runtime boundaries

The data platform will live in a separate pipeline repository. That repository owns:

- source connectors for FOIA, websites, CourtListener, OpenSalary, and manual inputs
- ingestion runtime and orchestration
- raw retention and archive generation
- normalization, linking, review-queue creation, and stat recomputation
- publish manifest generation

This repository continues to own:

- Astro rendering
- public route generation
- static publishing to S3/CloudFront
- forms and public UI
- consumption of stable publish-facing read models and publish manifests

### 2. Storage model

The system uses one canonical Postgres core plus S3 raw/archive storage.

- S3 stores raw payloads, fetched artifacts, rendered archives, screenshots, and reprocessable evidence bundles.
- Postgres stores operational metadata, normalized records, canonical entities, links, lineage, job runs, and publish-facing read models.

The Postgres schemas are:

- `ops`: source registry, publisher policy, publisher quality, review queue, job runs, publish runs
- `ingest`: discovered items, fetch attempts, extraction results, archive metadata pointers
- `core`: canonical source items, source-item versions, entity links, derived provenance
- `publish`: denormalized site-facing read models, stats, and route-change manifests

### 3. ELT-first data layering

The platform uses three logical layers:

- `raw`: original payloads and archive objects preserved before business transforms
- `normalized`: canonicalized URLs, parsed documents, extracted entities, source-item versions
- `publish`: denormalized officer/agency/report/state read models and stats consumed by the site

This keeps reprocessing and auditability possible while isolating publish concerns from raw source variability.

### 4. Pipeline topology

The job sequence is:

1. source discovery
2. fetch and archive
3. normalization and canonicalization
4. entity linking and review queue generation
5. officer/agency/state stat recomputation
6. publish manifest generation

Jobs are code-first and scheduled on ECS/Fargate. Orchestration owns:

- scheduling
- dependencies
- retries
- fallback behavior
- alerts

Code and SQL own:

- extraction logic
- parsing
- canonicalization
- matching heuristics
- business rules
- transforms and publish models

### 5. Idempotency and backfills

Every ingest and transform stage must be replay-safe.

- repeated source fetches must not duplicate source items, links, or ratings
- every stage must have stable deduplication keys
- every important job must support reprocessing by source, state, entity, and date window
- schema or matching-rule changes trigger controlled backfills instead of manual repair

### 6. Lineage and quality guarantees

Minimum lineage path:

`source item -> entity link -> derived stat -> publish row`

The system must preserve enough metadata to explain:

- which source and run produced a public datum
- which transform created a derived stat
- which publish row and route were affected

Minimum data quality assertions:

- slugs are unique and non-null for required entities
- agency category is always present
- publish rows never reference missing entities
- route keys match current site URL conventions
- rating jobs emit expected counts and bounded values

### 7. Public publishing strategy

The public site stays static by default.

The pipeline emits a publish manifest that later allows this repo to perform targeted rebuilds. The system still keeps nightly full rebuilds as reconciliation for deletions, pagination churn, and broad publish reshapes.

The publish manifest shape is:

```json
{
  "runId": "string",
  "mode": "delta|full",
  "generatedAt": "ISO-8601",
  "fullRebuildRequired": true,
  "personnelSlugs": ["string"],
  "agencyRoutes": [{ "category": "string", "slug": "string" }],
  "reportRoutes": [{ "category": "string", "slug": "string" }],
  "personnelCategories": ["string"],
  "agencyCategories": ["string"],
  "reportCategories": ["string"],
  "sitemapAffected": true
}
```

SSR or hybrid rendering is deferred unless build time, route churn, or freshness needs make static publishing untenable.

## Risks / Trade-offs

- One Postgres core keeps the model simpler but requires disciplined schema ownership and publish-read-model boundaries.
- Static publishing keeps operational complexity low but requires careful manifest design and nightly reconciliation.
- ECS/Fargate increases infra setup compared with GitHub Actions or Lambda-only jobs, but it better fits long-running, heterogeneous connector work.
- Architecture-first planning delays implementation briefly, but it avoids locking the future pipeline repo into unclear boundaries or contracts.
