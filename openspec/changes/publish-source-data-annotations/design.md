## Context

The intake change of the same name owns the annotation schema, source evidence, and correction semantics. This site consumes stored findings, never independently classifies source defects.

## Decisions

- Generate annotation-contract.json from intake's owning exporter. Validate stored JSON at the data-access boundary.
- One collected entry per stored finding; route ownership follows existing entity relationships and database-backed paths. Fail on missing owners instead of inventing record URLs.
- Authority attribution uses licensing_authority.source_namespaces, not employment or name matching.
- Build finite source/type filter combinations, pagination, and full-result CSV files from one collection. Keep page 1 at the base URL.
- Render text through Astro escaping. Use shared table/layout styles and accessible navigation labels. Keep supplied evidence inspectable as text; do not turn untrusted source strings into executable links.
- Show reported dates without calculated tenure; an unrepresentable effective date displays its literal value. Stored-null end dates use persisted source evidence to distinguish invalid literals from open employment.

## Normal rendering

Annotations use the normal collection, routes, links, notes, and date-evidence display without a separate enablement switch. Existing NO_PERSONNEL controls remain. Merge and deployment remain separate actions.
