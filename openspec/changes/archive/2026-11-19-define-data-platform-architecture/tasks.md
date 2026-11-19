## 1. Pipeline Repository Foundation

- [ ] 1.1 Create a separate pipeline repository for PoliceConduct data ingestion and transformation work.
- [ ] 1.2 Establish repository standards, deployment targets, secrets handling, and environment separation for development and production.
- [ ] 1.3 Define the initial runtime layout for connector code, SQL transforms, orchestration entrypoints, and shared libraries.

## 2. Canonical Storage And Schemas

- [ ] 2.1 Create Postgres schema ownership for `ops`, `ingest`, `core`, and `publish`.
- [ ] 2.2 Define S3 bucket layout for raw payloads, rendered archives, screenshots, and retained evidence bundles.
- [ ] 2.3 Add schema-level lineage, job-run, and review-queue structures needed by the architecture.

## 3. Source Registry And Raw Landing

- [ ] 3.1 Implement per-source contracts for FOIA, websites, CourtListener, OpenSalary, and manual uploads.
- [ ] 3.2 Implement source discovery, publisher policy handling, and publisher quality controls.
- [ ] 3.3 Implement raw landing, fetch metadata capture, and archive retention before downstream transforms.

## 4. Normalization, Linking, And Stats

- [ ] 4.1 Implement canonical URL handling, normalized source items, and source-item versioning.
- [ ] 4.2 Implement entity linking, confidence scoring, and minimal review-queue generation.
- [ ] 4.3 Implement nightly officer, agency, and state stat recomputation with replay-safe backfill support.

## 5. Publish Contract Adoption

- [ ] 5.1 Emit publish-facing read models and the route-change manifest defined by this architecture.
- [ ] 5.2 Update `policeconduct.org` to consume publish read models instead of direct raw/normalized concerns.
- [ ] 5.3 Add delta build support in `policeconduct.org` while preserving nightly full rebuild reconciliation.
