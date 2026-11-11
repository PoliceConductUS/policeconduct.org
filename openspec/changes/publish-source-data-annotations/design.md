## Context

The intake change of the same name owns the annotation schema, source evidence, and correction semantics. This site consumes stored findings, never independently classifies source defects.

## Decisions

- Generate annotation-contract.json from intake's owning exporter. Validate stored JSON at the data-access boundary.
- Read active first-class `public.data_annotation` records for manual, source, and intake producers. Resolved records remain stored but are not published. Subject records retain raw source evidence without embedded annotation arrays.
- One collected entry per stored finding; route ownership follows existing entity relationships and database-backed paths. Fail on missing owners instead of inventing record URLs.
- Authority attribution uses licensing_authority.source_namespaces, not employment or name matching.
- Build finite source/type filter combinations, pagination, and full-result CSV files from one collection. Keep page 1 at the base URL.
- Render text through Astro escaping. Use shared table/layout styles and accessible navigation labels. Keep supplied evidence inspectable as text; do not turn untrusted source strings into executable links.
- Show reported dates without calculated tenure; an unrepresentable effective date displays its literal value. Stored-null end dates use persisted source evidence to distinguish invalid literals from open employment.

## Normal rendering

Annotations use the normal collection, routes, links, notes, and date-evidence display without a separate enablement switch. Existing NO_PERSONNEL controls remain. Merge and deployment remain separate actions.

Authority HTML views and CSV exports include annotations directly attached to that authority, regardless of the annotation's source namespace. This displays explicitly assigned manual exclusions without treating all manual records as that authority's source data.

Agencies without current assignments have no public agency page. Keep their findings visible through the explicitly mapped source authority's annotation page, preserving the affected record label and identifiers. Apply the same current-assignment predicate as projection generation; do not treat an unexpectedly absent eligible page as an excluded agency. Resolve eligible agency URLs through their authoritative location path and slug.

Verification uses an explicitly supplied disposable DATABASE_URL and INTAKE_WORKSPACE. Dev startup preserves those inputs after loading local environment files so the browser server and test queries use the same isolated data.

## Analytics follow-up

Collect only on the HTTPS production hosts `policeconduct.org` and `www.policeconduct.org`. Initialize the queue before loading the Google tag asynchronously. Centralize URL sanitization for page locations, referrers, and custom link destinations; retain only explicit marketing-attribution parameters, never tokens or search text. Disable automatic site-search collection, history page views, outbound clicks, and file downloads so automatic events cannot bypass the explicit measurement contract. Keep the site's sanitized outbound events.

Use the current masthead markup for header events. Measure completed search responses and selections without query text, deduplicating repeated responses for the same search and avoiding per-keystroke counts. Record result count and a bounded destination category rather than record labels or visitor-entered text.

Keep `form_submit_success` as receipt of a submission. Add a bounded verification-email outcome and a separate failure event when the API reports `verificationPending: false`; do not change whether the submission was received or automatically label it verified. Expose form name, failure stage, HTTP response status, and verification-email outcome in Analytics reports.

Tests intercept Google requests and form APIs; they must never submit real reports, activate personnel publication, or send synthetic events to the production property. Preserve existing annotation work and publication gates.

## Approved review corrections

Apply the existing personnel-publication switch to explicitly typed personnel exclusions regardless of their owner. Record-page notes must preserve supplied warning/error evidence. Authority annotation indexes render their findings only in the paginated listing, including records whose fallback destination is that index. The user approved these three corrections during the analytics follow-up.

Record routes explicitly compose a dedicated annotation-notes component using their resolved canonical record path. `PageShell` and generic civic wrappers only provide shared structure and slots; they must not import, load, filter, or render annotations, or inspect annotation-route shapes.
