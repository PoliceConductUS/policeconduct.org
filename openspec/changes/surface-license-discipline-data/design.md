## Context

Intake added licensing and discipline tables (`license`, `authority_license`, `license_action`, `licensing_authority`, `discipline`, `discipline_agency_personnel`). Most of the site work is built. This file records the decisions already made in code and main specs, and the owner decisions from review round 1 (2026-11-18/19).

## Goals / Non-Goals

**Goals:**

- Show each person's licenses, license history and directly owned discipline on their personnel page.
- Show roster license and discipline counts on agency pages with rules that match the data's explicit links.

**Non-Goals:**

- Per-license pages or URL segments.
- An agency-page list of linked discipline records (deferred to a separate change).
- Any site-side rule for which license actions to emphasize.

## Decisions

- **One merged timeline, newest first.** All `license_action` rows across the person's licenses appear in one list, undated last. Alternative: one timeline per license. Chosen because most readers want the person's history in order, and each entry already names its license.
- **Action emphasis comes from intake.** Intake owns an explicit table of every recorded license-action value and fails on an unknown value. The site reads that table and fails the build on a value without a row. Emphasized entries show the visible label "License Action". Alternatives: site regexes (rejected: they misclassified recorded values) or no emphasis.
- **Preload `license` and `license_action` once per build process.** Alternative: per-person queries, as education uses. Chosen for build speed; the cost is memory (see Risks).
- **Internal authority link.** License cards link to the authority's page on this site (`<state path>licensing-authority/`), as `state-licensing-authority` requires, not to the authority's website.
- **Direct discipline ownership.** Profiles show discipline by `discipline.personnel_id`, and list agencies only when explicitly linked through `discipline_agency_personnel`, as `personnel-post-records` requires.
- **Roster discipline count uses any source.** The roster count uses `discipline.personnel_id`, the same rule as the "With discipline actions" filter, so a row the filter keeps shows a count. The agency total still counts only records explicitly linked to that agency's assignments.
- **Roster license comes from the assignment.** A roster row shows the license in its own `agency_personnel.license_id`, and nothing when it is null. Alternative: pick one license per person across all licenses (rejected: a roster could show a license from another state).
- **Status pill color.** Green only for "Active"; a neutral style for every other status, recorded in `DESIGN.md`.

## Risks / Trade-offs

- Build memory rises from preloading licensing data for every person.
- The build fails on an invalid authority state path (`src/lib/data/licensing.ts`) and on an assignment pointing at a missing license (`src/components/PersonnelAssignments.astro`). Both are intended loud failures, but bad intake data stops the build.
- The build depends on intake's license-action table being complete; a new action value stops the build until intake classifies it.
- Emphasizing a named person's license action can be read as a judgment about them. The label "License Action" is factual, and the rule lives in intake data, not site code.
- Roster rows without an `agency_personnel.license_id` stop showing a license.
