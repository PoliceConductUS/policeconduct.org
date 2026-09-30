## Context

Migration `20260928234246_drop_empty_tables.sql` drops agency_links, coverage_link_civil_cases, coverage_link_reports, federal_agency_branch, location_report_sources, location_reports, review_attachments, review_tags, review_witnesses, and tags. Live catalog inspection confirms their absence.

## Goals / Non-Goals

Make the existing site run against that schema. No site-invented relationships, schema recreation, input-form changes, new dependencies, or unrelated redesign.

## Decisions

Remove consumers through the full loader/type/template chain. Keep surviving sources. Require all still-consumed tables and fields. Preserve exact canonical route resolution. Use agency.parent_federal_agency_id for the federal relationship, as confirmed by the user and live database.

## Risks / Trade-offs

Stale projection fields must be removed during refresh. Federal branch counts and related aggregates use agency.parent_federal_agency_id; no legacy relationship fallback.
