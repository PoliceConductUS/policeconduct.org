Cool, Ducky — your answers lock in a clearer MVP. Here’s the updated requirements doc with your decisions baked in (incident policy, source quality filtering, n8n-first automation, archiving, per-publisher policy compliance, and the corrections/submit button).

---

# PoliceConduct.org MVP Requirements (Updated)

## Third-Party Coverage Ingestion + Static Browsing UI

### 1) Goal

Build a minimum viable system that:

1. Automatically discovers third-party stories about police conduct, stores each story as a **Source Item**, and links it to **Agencies** and **Officers**.
2. Captures **major story updates** as additional Source Items.
3. Publishes a fast, static UI that surfaces Source Items on officer/agency pages with clear labeling, and a one-click path for corrections or submitting a first-party report.

### 2) Key Decisions (from you)

- **Incident grouping:** Default is **1 incident per article**; create **one more** Source Item per **major update** to the story.
- **Publisher trust tiers:** **Skip** sources that are generally low quality.
- **Automation:** Prefer **entirely automatic**, ideally via **n8n** (or equivalent).
- **Archiving:** **Yes** — store an archive copy to mitigate link rot.
- **Publisher policies:** Automatically discover and follow site policies (robots/terms) and respect them.
- **Corrections CTA:** Add a standard button: **“Have corrections or want to submit a report about this article?”**

### 3) Non-Goals (MVP)

- No automatic trait ratings or “PoliceConduct concludes…” analysis derived from third-party sources.
- No advanced cross-outlet incident clustering beyond the “1 article = 1 Source Item (+ major updates)” rule.
- No real-time ingestion requirements.

---

# Part A — Automated Discovery, Filtering, Archiving, and Linking (Background / Async)

## A1) Functional Requirements

### A1.1 Source Discovery

The system MUST support recurring discovery jobs from configurable inputs:

- RSS feeds and/or “site search” endpoints (preferred)
- Curated source lists
- Optional: YouTube channels/search
- Optional: court dockets as links (manual add is sufficient for MVP)

Each run MUST:

- Produce zero or more new Source Items
- Be safe to rerun (idempotent)

### A1.2 Publisher Policy Compliance

For every publisher domain the system touches, the system MUST:

- Discover and store **robots.txt** rules and crawl directives
- Store a **policy profile** per domain including:
  - `allowed_to_fetch` (bool)
  - `crawl_delay_seconds` (nullable)
  - `disallowed_paths[]`
  - `policy_last_checked_at`
  - `policy_source` (robots/terms/manual_override)

- Enforce policy decisions at fetch time:
  - Do not fetch disallowed URLs
  - Apply crawl delay / rate limits
  - Allow manual overrides (admin-only) if needed

> Note: For MVP, “discover terms” can be limited to robots + a manual admin flag for “blocked by terms” if you want to keep it simple and conservative.

### A1.3 Publisher Trust Filtering

The system MUST maintain a **Publisher Quality List** with:

- `publisher_domain`
- `quality_tier` (trusted | normal | blocked)
- `reason`
- `updated_at`

Behavior:

- If `blocked`, the system MUST skip ingest entirely.
- If `trusted/normal`, proceed.
- Admin MUST be able to change tier and reprocess queued items.

### A1.4 Canonicalization and Idempotency

For each discovered URL, the system MUST:

- Normalize and store `canonical_url`
- Store `discovered_url`
- Compute `idempotency_key = hash(canonical_url)`
- Skip insert if `idempotency_key` exists

### A1.5 “Major Update” Handling

The system MUST support capturing major updates as separate Source Items:

- If a publisher publishes a new URL for the update → treat as normal discovery.
- If the URL stays the same but the page materially changes:
  - Detect change via `content_fingerprint` (hash of normalized text or metadata)
  - Create a new Source Item with:
    - `supersedes_source_item_id` (optional)
    - `update_reason = content_changed`
    - `original_canonical_url` retained

This is how you get “one more per major update” without complex incident clustering.

### A1.6 Metadata Extraction

For each Source Item, the system MUST attempt to extract:

- `title`
- `publisher_name` (if available)
- `publisher_domain`
- `published_at` (nullable)
- `retrieved_at`
- `content_type` (news | video | press_release | court_filing | other)
- `content_excerpt` (short)
- `content_fingerprint` (for update detection)

### A1.7 Archiving

For each Source Item, the system MUST attempt to create and store an archive:

- Preferred: store a **rendered snapshot** (PDF or HTML) + **screenshot** (image) + minimal raw text extract
- Store:
  - `archive_storage_uri`
  - `archive_created_at`
  - `archive_status` (created | failed | skipped_due_to_policy)
  - `archive_error` (nullable)

- Archiving MUST respect publisher policy constraints (if disallowed, skip and record why)

### A1.8 Entity Linking (Agency/Officer)

The system MUST link Source Items to entities with conservative matching:

- Minimum required links:
  - `linked_agency_ids[]` OR `linked_officer_ids[]` OR else queue for review

- Store link records with:
  - `link_confidence`
  - `link_method` (auto_exact | auto_alias | manual)

- If confidence below threshold, queue for admin review.

### A1.9 Admin Review Queue

Admin MUST be able to:

- Review unlinked or low-confidence Source Items
- Confirm/remove suggested links
- Hide/unhide Source Items (with reason)
- Mark an item as “blocked publisher” (which should back-propagate to the publisher list)

### A1.10 Scheduling and Automation (n8n-first)

The system SHOULD be orchestrated via **n8n** (or equivalent), with these workflows:

- **Discover Sources (scheduled)**
- **Policy Check (scheduled per-domain)**
- **Ingest + Canonicalize + Dedup**
- **Extract Metadata**
- **Archive Snapshot**
- **Entity Link + Queue Review**
- **Publish Static Output Refresh** (build trigger or cache purge)

Each workflow MUST be:

- Idempotent
- Retry-safe
- Observable (logs + counters)
- Rate-limit aware per domain

---

## A2) Data Requirements (MVP Schema)

### SourceItem

- `source_item_id` (cuid)
- `canonical_url` (unique)
- `discovered_url`
- `idempotency_key` (unique)
- `title`
- `publisher_name`
- `publisher_domain`
- `published_at` (nullable)
- `retrieved_at`
- `content_type`
- `content_excerpt`
- `content_fingerprint` (nullable but recommended)
- `status` (active | hidden | needs_review)
- `visibility_reason` (nullable)
- `supersedes_source_item_id` (nullable)
- `created_at`, `updated_at`

### SourceArchive

- `source_archive_id`
- `source_item_id`
- `archive_storage_uri`
- `archive_format` (pdf | html | screenshot | bundle)
- `archive_status`
- `archive_created_at`
- `archive_error` (nullable)

### PublisherPolicy

- `publisher_domain` (unique)
- `allowed_to_fetch`
- `crawl_delay_seconds` (nullable)
- `disallowed_paths[]`
- `policy_last_checked_at`
- `policy_source` (robots | manual)

### PublisherQuality

- `publisher_domain` (unique)
- `quality_tier` (trusted | normal | blocked)
- `reason`
- `updated_at`

### SourceItemLink

- `source_item_link_id`
- `source_item_id`
- `entity_type` (agency | officer)
- `entity_id`
- `link_confidence`
- `link_method`
- `created_at`

---

## A3) Observability & Audit

### Authoritative Events (DB-backed)

- `publisher_policy_updated`
- `publisher_quality_changed`
- `source_item_discovered`
- `source_item_created`
- `source_item_duplicate_skipped`
- `source_item_updated_detected`
- `source_archive_created` / `source_archive_failed`
- `source_item_link_created`
- `source_item_marked_needs_review`
- `source_item_hidden` / `source_item_unhidden`

### Diagnostic Events (telemetry)

- discovery throughput
- extraction success rate
- archive success rate
- policy blocks
- link confidence distribution
- per-domain rate limiting events

---

## A4) Acceptance Criteria (Ingestion)

- Re-running ingestion against the same discovered URLs creates **no duplicates**.
- Blocked publishers are **never** ingested.
- Each active Source Item has either:
  - at least one entity link, or
  - `status = needs_review`.

- Archiving:
  - For allowed domains, archives are created successfully for ≥90% of items in a test set (allowing transient failures).
  - For disallowed domains, archives are skipped with a stored policy reason.

---

# Part B — Static UI (Public Browsing)

## B1) Functional Requirements

### B1.1 Officer Page: Coverage

Officer page MUST show a **Coverage** section listing linked Source Items:

- Sort: `published_at desc`, then `retrieved_at desc`
- Each item shows:
  - title (outbound link)
  - publisher
  - publish date (if known)
  - content type badge
  - excerpt
  - optional: “Update to previous coverage” indicator when `supersedes_source_item_id` exists

### B1.2 Agency Page: Coverage

Same behavior as officer coverage.

### B1.3 Source Item Detail Page (Recommended)

A Source Item page SHOULD exist and display:

- Metadata + outbound link
- Linked officers/agencies
- Archive link (if available)
- Clear labeling: third-party coverage
- The standard button (below)

### B1.4 Standard CTA Button (Required)

Every Source Item display context (detail page and coverage lists) MUST include:

- **Button text:** “Have corrections or want to submit a report about this article?”
- Clicking MUST take user to:
  - a corrections form, and/or
  - a report submission form prefilled with source context (canonical_url, publisher, title, involved entities)

## B2) Performance & SEO

- Pages MUST be statically renderable or edge cached.
- Stable URLs for officer/agency/source items.
- Ability to disable indexing for Source Item pages if needed later.

## B3) Safety / Moderation UX

- Hidden Source Items MUST not appear publicly.
- The UI MUST not display internal confidence scores.
