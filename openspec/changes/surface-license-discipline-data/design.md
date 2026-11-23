## Context

Intake added licensing and discipline tables (`license`, `authority_license`, `license_action`, `licensing_authority`, `discipline`, `discipline_agency_personnel`). Open tasks: 4.2, 4.5, 4.6, 4.8, 5.5a and 7.2-7.4 (Phase 1); 4.3b, 4.7 and 5.5b (Phase 2, blocked on intake). This file records the decisions made in code and main specs and the owner decisions in `.egm-reviews/owner-decisions-round1.md` (Q27-Q30 and the 2026-11-19 to 2026-11-22 entries).

## Goals / Non-Goals

**Goals:**

- Show each person's licenses, license history and directly owned discipline on their personnel page.
- Show roster license and discipline counts on agency pages with rules that match the data's explicit links.

**Non-Goals:**

- Per-license pages or URL segments.
- An agency-page list of linked discipline records (deferred to a separate change).
- Any site-side rule for which license actions to emphasize or which statuses are active.

## Decisions

- **One merged timeline, newest first.** All `license_action` rows across the person's licenses appear in one list, undated last, ties broken by `license_action.id`. Alternative: one timeline per license. Chosen because one list shows the person's history in date order, and each entry already names its license.
- **Action types come from intake.** Intake owns `license_action_type` (`name`, `category` in `discipline`, `commendation`, `other`) and `license_action_text`, and links each action through the NOT NULL foreign key `license_action.license_action_type_id`; intake fails generation on an action text with no row (owner decision Q27; "License action types" 2026-11-22; intake change `supply-site-display-data` D4, tasks 3.1-3.3). The site follows the foreign key, shows the type name and category as stored under the visible label "License Action", and puts the stored category in the entry's class (`license-timeline-entry--{category}`); CSS emphasizes the `discipline` class. The site never matches action text. Until intake ships, entries show the recorded action only and no entry is emphasized (owner decision 2026-11-22, "Site decisions"). Alternatives: site regexes (rejected: they misclassified recorded values, and the site may not derive labels from text); a site join on `license_action.action` text (rejected: the site may not connect rows by text); a site rule that decides emphasis per type (rejected: the category is a stored fact, so the class reads it directly).
- **Stored text as stored.** License status and type show exactly as stored; intake owns cleanup through its standard values (`AGENTS.md` "The Site Is A View Of The Database"; owner decision 2026-11-22, "No exceptions"; intake `supply-site-display-data` spec `stored-text-standardization`). Alternative: site case-merging (rejected: the site may not rewrite stored text).
- **Preload `license` and `license_action` once per build process.** Exempt from the no-preload rule that `personnel-post-records` sets for education because nearly every personnel page needs licensing (84% of `agency_personnel` rows link a license on 2026-11-18), so one query per page would run about 150,000 times; discipline (532 rows) and education are sparse and keep per-person queries behind a small index. Alternatives: per-person queries (rejected: one round trip per page for most pages); per-person queries behind an index of license holders (rejected: the index would cover most people, so it saves little). Cost: memory (see Risks). Phase 2 reads the action type in the same `license_action` query.
- **Internal authority link.** License cards link to the authority's page on this site (`<state path>licensing-authority/`), as `state-licensing-authority` requires, not to the authority's website. A license whose type has no recorded authority omits "Issued by". Alternative: link to the authority's own website (rejected: `state-licensing-authority` requires the internal page, which carries the website).
- **Direct discipline ownership.** Profiles show discipline by `discipline.personnel_id`, and list agencies only when explicitly linked through `discipline_agency_personnel`, as `personnel-post-records` requires. Alternative: show discipline only when linked to an agency (rejected: 0 `discipline_agency_personnel` rows on 2026-11-18, so no section would render; the main spec selects by `discipline.personnel_id`).
- **Roster discipline count uses any source.** The roster count uses `discipline.personnel_id`, the same rule as the "With discipline actions" filter, so a row the filter keeps shows a count. The agency total still counts only records explicitly linked to that agency's assignments. One field holds the roster count; the label and the filter both read it. Alternative: count only linked records on the roster (rejected by owner decision Q29: the label and the filter would disagree).
- **Counts come from intake views.** The roster count is `site_personnel_count.discipline_count` (any source) and the agency total is `site_agency_count.discipline_count` (explicit links), both added by intake change `supply-site-display-data` task 6.3a (owner decision 2026-11-22: counts move into database views owned by intake; the site only reads them). Until that ships, Phase 1 renders the roster label from the existing per-person count that the filter already reads, and the agency total keeps its existing loader count. Alternatives: SQL counts in the page loader (rejected long term: counts belong in intake views); counts in `scripts/refresh-build-projections.mjs` (rejected: intake's website follow-up deletes that script).
- **Roster license comes from the assignment.** A roster row shows the license in its own `agency_personnel.license_id`, and nothing when it is null (owner decision Q28). The site follows the recorded link and does not check whose license it is. Alternative: pick one license per person across all licenses (rejected: a roster could show a license from another state, and the site may not pick one row to stand for several).
- **Status pill color.** Green only for a status that intake marks as active; the neutral style for every other status, recorded in `DESIGN.md` (owner decision Q30). Scope: license status pills only; the hero and assignment pills that shared the class were removed with the site-decisions code change. Until intake supplies that fact, every license pill is neutral (owner decision 2026-11-22). Alternative: compare stored text to "Active" (rejected: a badge derived by text matching).

## Risks / Trade-offs

- Build memory: the preload holds every `license` row (210,417 on 2026-11-18) and every `license_action` row in each build process, under the 12 GB `--max-old-space-size` limit (`package.json` `build`). Mitigation: task 7.2 records peak memory of the build; if it nears the limit, switch to the per-person query alternative.
- The build fails on an invalid authority state path (`src/lib/data/licensing.ts`), on an assignment pointing at a missing license (`src/components/PersonnelAssignments.astro`, and the roster per task 4.5), on a roster row with no `personnel` row (task 4.6), and on an `action_date` that does not parse (task 4.2). Accepted, no mitigation: missing required data fails loudly, and intake fixes the data.
- Phase 2 depends on intake work that has not shipped. Accepted: until it ships, no entry is emphasized, every pill is neutral, and the agency total keeps its loader count (owner decision 2026-11-22).
- Emphasizing a named person's license action can be read as a judgment about them. Mitigation: the label "License Action" and the type name are factual, and the category lives in intake data, not site code.
- Roster rows without an `agency_personnel.license_id` show no license: 34,585 of 216,469 rows (16%) on 2026-11-18. Accepted by owner decision Q28.

## Open Questions

- Phase 2 intake dependency 1 (task 4.3b): intake change `supply-site-display-data` tasks 3.1-3.3 (`license_action_type`, `license_action_text`, `license_action.license_action_type_id`). Proposed, not yet built; the type set awaits owner review (its task 3.1).
- Phase 2 intake dependency 2 (task 4.7): intake change `supply-site-display-data` task 6.3a (`site_personnel_count.discipline_count`, `site_agency_count.discipline_count`). Proposed, not yet built.
- Phase 2 intake dependency 3 (task 5.5b): a stored fact that marks which license status values are active. No intake change proposes it yet; intake standardizes `license.status` words but does not mark which word is active. Owner decision needed: add it to `supply-site-display-data`, or keep every license pill neutral.
- Intake check (not blocking): intake should ensure `license.personnel_id` equals `agency_personnel.personnel_id` for every `agency_personnel.license_id`. The site shows the recorded link as is.

## Migration Plan

No schema or data migration in this repo. Phase 2 waits for the intake work in Open Questions; each lands as its own task (4.3b, 4.7, 5.5b) with a schema-contract update.
