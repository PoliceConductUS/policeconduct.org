## Design Summary

Audit every live public table and connect useful public records to the existing visitor pages. The reset database now satisfies the agency-place invariant. Preserve the civic editorial design and exact database-backed routing.

## Alternatives Considered

- Dump all columns into generic pages: rejected because internal identifiers and storage metadata do not help visitors understand records.
- Repair only the build: rejected because the user explicitly requested broad data coverage.
- Extend existing entity pages with missing public facts and account for every table: selected. Reuse existing history, source-link, table, and disclosure patterns.

## Agreed Approach

The user explicitly authorizes scoped changes, formatting, validation, commit, sync, and PR preview publication under the agent's direction. Use the current worktree and branch. Publish only the PR preview.

## Key Decisions

Expose all agencies, arrest profiles with source and time context, report narrative fields and requested outcomes, case closing dates, and available source links. Include all underlying breakdown rows in generated HTML with progressive disclosure. Do not infer geographic meaning for arrest district codes or aggregate officer-linked counts as unique agency arrests. System bookkeeping, geometry storage, IDs, and audit timestamps remain internal unless they support a visitor function.

## Open Questions

None required to begin. The coverage audit records evidence and remaining issues.
