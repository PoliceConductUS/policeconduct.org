# Brainstorm: Cases From Staff Members' Other Jobs

## Design Summary

A visitor looking at an agency wants to know whether anyone who works or worked there has been involved in a civil case. Under the civil-case count rule ([PR #58](https://github.com/PoliceConductUS/policeconduct.org/pull/58), branch `ddl-openspec`), an agency's own civil cases are only the cases tied to that agency's own `agency_personnel` rows. Cases tied to a person's assignment at another agency no longer appear on this agency's page at all. In the local data (2026-11-17), 87 agencies lose every case under that rule; all 130 of their former `civil_case_personnel` rows (links) were on an assignment at a different agency.

The agreed design adds a second, separate view on the agency page and on the agency civil-cases page: **"Cases from staff members' other jobs"**. It lists the distinct civil cases tied to an assignment at a different agency, for people who have an assignment (current or former) at this agency. The agency's own civil-case count and list stay exactly as the count rule defines them. The two counts are never added together.

## Alternatives Considered

### Option A: Merge the other-job cases into the agency's civil-case list and count

- **Approach**: Count and list every case tied to any assignment of anyone who has worked at the agency, as the site did before PR #58.
- **Pros**: One list; nothing new to design.
- **Cons**: Credits the agency with cases it was not part of; the number reads as the agency's own record.
- **Why not chosen**: It credits the agency with cases tied to other agencies' assignments, which breaks the agency count rule in `openspec/specs/civil-case-content` ("Civil case counts follow personnel assignments") and makes the number read as the agency's own record.

### Option B: Show nothing beyond the agency's own cases

- **Approach**: Keep only the count rule's list; visitors follow each person to their profile to find other cases.
- **Pros**: No new UI; no risk of misreading.
- **Cons**: Hides the staff's cases from other jobs; a visitor must open every profile.
- **Why not chosen**: Fails the visitor's question.

### Option C: A marker on the personnel list only

- **Approach**: Flag people on the agency's personnel list who have a case from another job, linking to their profile.
- **Pros**: Small change; puts the information next to the person.
- **Cons**: No case-level view or count; long lists bury it.
- **Why not chosen**: Useful as an addition, not as the main answer (kept as an open question).

## Agreed Approach

A separate section with its own count and label: the agency's own civil cases stay first and unchanged; a second section lists cases from staff members' other jobs, with the person, the agency the case is tied to, and whether the person is current or former staff here. Chosen because it answers the visitor's question while leaving the agency's own record unchanged and the count rule intact.

## Key Decisions

- The agency's own civil-case count, tile and list are unchanged.
- The new section has its own count; the page never shows a sum of the two.
- A case appears in the new section only when no assignment at this agency is linked to it (those cases are already in the agency's own list).
- Each case appears once; when several of this agency's current or former staff are linked to it through other jobs, all of them are listed on that row.
- Each person on a row shows every agency the case is tied to for them ("while at …", person listed once) and their status at this agency from `getAssignmentStatus` (`src/lib/data/assignment-status.js`): current when any assignment here is current, otherwise former when any has ended, otherwise unknown (no status text). Rows with a current staff member come first, then all other rows; within each group, newest filed date first.
- An agency with no own cases but some other-jobs cases gets an agency civil-cases page; the page states "0 civil cases tied to this agency's personnel records." with no own-cases table (owner decision, 2026-11-18).
- The civil-cases page keeps one route and one page control for both lists; page N shows page N of each list; the profile's "View all" link targets the section anchor (owner decision, 2026-11-19).
- The profile block has no extra allegation note (owner decision, 2026-11-19).
- Copy is descriptive and at an 8th-grade level. It states that these cases are tied to the person's job at another agency, not to this agency. No claims about conduct, accuracy or verification.
- Data comes from the same tables the count rule uses: `public.civil_case_personnel -> public.agency_personnel -> public.agency -> public.location_path`. No new tables.

## Open Questions

- Should the agency personnel list also mark people who have a case from another job (Option C as an addition)? Default in this change: no.
