# Verification

## Scope

Maps are wired only to personnel and agency pages. Maps on city, county, state and federal pages are not part of this change. The show-neighborhood-income changes remain intact.

## Evidence

- Irving source tests: 31 passed across five files.
- Real source reacquisition succeeded: 41,211 bookings, 179,916 source charge rows, and 26 patrol boundaries. Database writes were not performed.
- Website focused map/show-neighborhood-income tests: eight passed. Tests cover count reconciliation, missing/duplicate boundaries, concave polygons, holes/multipolygons, permanent labels, non-overlap of three labels at 1280px and 390px, and no-JavaScript count access. Multi-person bookings and the loader's agency matching are not yet covered; see tasks.md 2.4 and 3.2.
- Full 26-boundary map inspected by eye at 1280px and 390px with synthetic counts; labels did not overlap.
- All 26 label anchors are inside their polygons (winding-number check).
- Website typecheck: zero errors, zero warnings, three existing hints. Scoped ESLint/format/whitespace checks pass.
- OpenSpec: intake 49 items passed; website 26 items passed.

## Limits

The local database currently has zero agency and personnel arrest profiles, so actual personnel/agency page validation awaits the import in tasks.md section 4.

Intake build/typecheck remain blocked by existing SourceNameToCanonicalIdLedger.readSourceName errors in unchanged cache code/tests. No fixes to that unrelated contract were attempted. The intake CLI runs through `tsx`, so these errors do not block acquire, transform, generate or up.

## Current state

No database reset, migration, deployment, commit, or push was performed.
