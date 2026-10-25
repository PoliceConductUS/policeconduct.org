## Context

The agency detail loader selects a.\*. PostgreSQL date parsing currently produces local-midnight Date objects; the new date must remain a calendar date.

## Decisions

Select status and status_date::text explicitly so missing columns fail and dates remain ISO calendar strings. Reuse the existing PageShell header slot. Use compact metadata for Active and a prominent neutral-ink block for any other supplied status (case-insensitive comparison). Render status and date independently when present. Format date in UTC from the ISO date string. Build one shared status summary for page meta and GovernmentOrganization/ProfilePage descriptions. Use description, a supported Schema.org property; do not invent status properties or infer dissolutionDate. SiteLayout already propagates title and description into social metadata. Preserve canonical path and agency identity.

## Verification

Exercise active, non-active, absent values, date-only/status-only cases and calendar-date stability. Check real DB-backed page HTML, SEO tags, JSON-LD, desktop/mobile rendering, schema contract, Astro types, format/lint and aggregate validation. No shared database mutation for tests.
