## ADDED Requirements

### Requirement: Static Publishing Remains The Default

`policeconduct.org` MUST remain primarily static until explicit thresholds justify a serving-model change.

#### Scenario: Architecture change does not force SSR
- **WHEN** this architecture is adopted
- **THEN** the public site remains on the static publishing model rather than immediately moving to SSR or hybrid rendering

#### Scenario: Serving-model reconsideration is deferred
- **WHEN** freshness or scale pressures increase later
- **THEN** SSR or hybrid rendering is reconsidered only after a later change explicitly redefines the serving model

### Requirement: Delta Builds Consume The Publish Manifest

The site MUST support targeted rebuilds driven by the route-change manifest.

#### Scenario: Delta build uses manifest-provided routes
- **WHEN** a publish run is marked as `delta`
- **THEN** the site rebuilds only the manifest-selected detail routes, affected category pages, and sitemap outputs needed for that run

#### Scenario: Untouched routes stay untouched during delta publish
- **WHEN** a delta publish is performed
- **THEN** unchanged public routes are not regenerated or treated as deleted by the publish flow

### Requirement: Nightly Full Rebuild Reconciles Broad Changes

The site MUST preserve a nightly full rebuild path for reconciliation.

#### Scenario: Full rebuild handles deletions and pagination churn
- **WHEN** publish changes include deletions, route removals, or category pagination shifts
- **THEN** the site uses a full rebuild rather than relying on partial route regeneration

### Requirement: Site Reads Publish Models, Not Upstream Layers

The web app MUST consume publish-facing models instead of raw or normalized pipeline layers.

#### Scenario: Site avoids raw-source coupling
- **WHEN** new source connectors or normalization rules are introduced upstream
- **THEN** the web app remains insulated from those changes by consuming publish-oriented read models only
