# Route coverage adjustment

This bounded follow-up implements the user's approved September 20, 2026 rule
change only. Other atomic deployment tasks remain deferred.

## Outcome and design

Every prior URL must exist, redirect to a terminal current route, or have an exact
path and reason in the committed `route-absences.json` list. Absence permits the
existing 404 response; it does not declare permanent retirement or promise a
return date. The list is release metadata, not a source of personnel identity.
Current routes and valid redirects take precedence when a profile returns.

The October 9, 2026 follow-up excludes empty state pages as the user requested.
Record only exact published state roots and legacy state collection URLs after
verifying their states have no current agency assignments, reports, or civil
cases. Federal roots and individual record URLs are outside this decision.

The user approved explicit accounting rather than blanket exemptions or forced
redirects. No production paths will be invented or inferred from a missing row.

## Implementation

- [x] Add executable fixture tests for accounted and unaccounted gaps, returning
      profiles, exact path scope, invalid entries, and redirect integrity.
- [x] Read the explicit absence list in the existing checker and report 404
      allowances separately from redirects. Update unresolved generator wording.
- [x] Update the deployment specification and document list maintenance.
- [x] Run focused tests and the aggregate validation gate; record limitations.

## Deployment guard follow-up

The current preview sync and production incremental deployment must run the
existing strict redirect coverage check after build/output existence checks and
before any cloud publication. Standalone preview sync and production
`--skip-build` use the same gate. This changes no route policy or data and does
not implement the deferred atomic deployment system.

- [x] Reproduce missing deployment checks with isolated executable shell fixtures.
- [x] Gate both publication scripts and include fixtures in `test:redirects`.
- [x] Verify failure blocks all cloud calls and successful coverage follows the
      build and precedes publication.
