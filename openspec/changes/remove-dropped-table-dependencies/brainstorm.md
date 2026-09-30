## Design Summary

Align the site with intake migration `20260928234246_drop_empty_tables.sql` and the verified live schema. Remove consumers of the ten dropped tables, including their unsupported display fields. Keep queries and strict validation for surviving data.

## Alternatives Considered

- Remove obsolete queries, types, and display sections: matches the database and avoids inventing relationships.
- Catch missing-table errors or return fabricated empty collections: rejected because it conceals schema errors and retains obsolete contracts.

## Agreed Approach

The user directly requested the scoped adaptation. Use the active worktree. No database changes or replacement relationships. Personnel forms remain enabled.

## Key Decisions

Retain report links, civil case links, personnel-linked coverage, agency phone numbers, and canonical database-backed routes.

## Federal Relationship Resolution

The user supplied the replacement model: `agency.parent_federal_agency_id` links branch offices to `federal_agency.id`. Live PostgreSQL confirms the nullable text FK and eleven linked branches (one per federal agency). Use this direct relationship everywhere the site previously used `federal_agency_branch`; preserve the federal displays and counts.

## Open Questions

None.
