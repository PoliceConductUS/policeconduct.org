## Outcome

Removed consumers of ten dropped tables and retained federal office behavior through the database's replacement `agency.parent_federal_agency_id` relationship. Personnel contribution forms remain enabled. No commit, push, deployment, or database schema edit was performed for this change.

## Findings

An empty relationship table did not establish that federal branches were unused. Import artifacts showed earlier links; the user corrected the database model before the website migrated. The site now uses the explicit parent FK without inferring relationships.

Integration review restored shared CSS used by surviving pages. Live directory testing exposed an expensive summary join plan; an explicit non-null predicate uses the existing index and preserves results. The agency prefill regression was updated to stop expecting values sourced only from the removed agency-links table.

## Initial Validation Constraint (Resolved)

The direct-discipline regression required a multi-agency fixture absent from the current database. A rollback-only transaction now provides it to the real loader without weakening assertions or persisting synthetic records. Aggregate validation passes with 117 browser tests and 7 existing skips.

The full build exposed a separate routing mismatch: Metropolitan Airports Commission is attached to a county location, but agency projections and routes require a place. Its 117 linked profiles cannot resolve an agency canonical path. The user clarified that agency locations must always be places. The 2026-09-30 database reset corrected this assignment to Fort Snelling UT; full release verification continues under the expanded public-record coverage change. See verify.md. Parallel static rendering is now configured at 8 after the user challenged serial profile rendering.
