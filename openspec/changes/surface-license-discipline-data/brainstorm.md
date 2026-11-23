# Task 6.2a slice: agency discipline counts

The user approved adding an agency-specific discipline count to the existing context line beneath each name in the agency personnel roster. Counts link to the person's discipline section and are omitted when zero. The agency page shows the number of distinct linked records, rather than a sum of roster counts. Only explicit `discipline_agency_personnel → agency_personnel` links establish attribution. The separate agency record list is deferred to a separate change.

Owner decision Q29 (`.egm-reviews/owner-decisions-round1.md`): roster counts now use discipline from any source (`discipline.personnel_id`), the same rule as the roster filter. The agency total keeps explicit-link attribution. See `design.md` and task 4.6.
