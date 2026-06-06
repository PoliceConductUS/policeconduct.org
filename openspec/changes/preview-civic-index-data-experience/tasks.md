## 1. Data Model and Content Catalog

- [x] 1.1 Inspect `src/lib/data/civic-index.ts`, `src/components/CivicIndexPage.astro`, `src/lib/metric-vocabulary.ts`, and existing scoped detail routes to confirm current Civic Index model fields, available icons, and detail-page destinations.
- [x] 1.2 Replace the current `thingsToKnow`, `trendPanels`, and generic `dataPanels` Civic Index model fields with a visitor-intent band preview model for metrics, graph previews, existing detail links, and scoped browse CTAs.
- [x] 1.3 Define the seven fixed visitor-intent bands from the spec in the Civic Index data module with level eligibility for state, administrative-area, place, agency, and personnel-oriented content.
- [x] 1.3a Inspect the agency landing page route and component to confirm whether it uses `CivicIndexPage` or a separate implementation path. Agency landing pages use a separate implementation at `src/pages/[category]/[administrativeArea]/[place]/[agencySlug]/index.astro`; keep Task 2.1a pending for that route.
- [x] 1.4 Add page-level filtering so personnel records and officer-level complaint, force, discipline, credibility, and positive-conduct indicators do not appear as top-level state, county, or place metrics.
- [x] 1.5 Assign visible metric-card icons from the existing icon set so no visible metric cards duplicate an icon on the same page.
- [x] 1.6 Keep existing personnel detail page content structure stable while aligning personnel-page labels, graph styles, icons, and availability states with the shared Civic Index presentation system where applicable.

## 2. Civic Index Page Rendering

- [x] 2.1 Update `src/components/CivicIndexPage.astro` to render visitor-intent bands instead of "Top 5 things to know", generic trend panels, generic data panels, or browse-oriented landing-page sections.
- [x] 2.1a If agency landing pages use a separate route or component, update that landing-page UI to follow the same approved visitor-intent pattern without adding new routes.
- [x] 2.2 Render graph previews inside their relevant visitor-intent bands with enough title, band summary, caption, scope, comparison, denominator, grouping, or time-window context to make the future measurement intent clear without requiring every chart to include a "how to read this" explanation.
- [x] 2.3 Render top metric "View details" links only when an applicable scoped detail sub-page already exists, and render default top-metric CTAs to existing child, region, place, agency, or related scoped browse sub-pages where useful; do not create new sub-pages or routes.
- [x] 2.4 Keep collection CTAs and record-needed labels off Civic Index landing pages.
- [x] 2.5 Keep Civic Index landing pages free of child entity lists, maps, browse tables, direct drill-down sections, child browse sections, and explore-child sections; landing pages may link to existing scoped browse sub-pages through metric CTAs, but those browse surfaces render only on scoped sub-pages if they exist at all.
- [x] 2.6 Remove right-side in-page navigation from Civic Index landing pages and do not render the current state, area, place, agency, or personnel name as metric or graph pills/tags.
- [x] 2.7 Remove duplicate decertification law context from state metric bands and render bottom state decertification statuses in a compact responsive non-table layout with only one section-level source link.
- [x] 2.8 Remove the duplicate Reports metric from the contacts band when the top Reports metric and monthly reports graph are present, and rename the graph to "Reports by month".

## 3. Copy, Scope, and Neutrality

- [x] 3.1 Remove or replace user-visible Civic Index copy that says "Top 5 things to know", "Graphs", "Metrics", "Datasets", "Who is most affected", "will appear when verified", "not collected yet", or "source needed".
- [x] 3.2 Ensure displayed metrics and graphs provide what-is-measured, scope, denominator, grouping, comparison, source-basis, or time-window context where needed to avoid ambiguity or unsupported interpretation.
- [x] 3.3 Ensure over-time metrics and graph previews show or inherit a visible time window, defaulting to previous 12 months unless a different range is stated.
- [x] 3.4 Frame positive indicators as comparative signals with "better than what" context where available and without unsupported praise, rankings, endorsements, or causal claims.

## 4. Tests and Verification

- [ ] 4.1 Get page approval before changing implementation tests.
- [ ] 4.2 After page approval, update `tests/e2e/civic-index.spec.ts` to assert the seven visitor-intent bands render on the appropriate pages and prohibited headings do not render.
- [ ] 4.3 After page approval, add or update tests that state, county, and place pages do not expose personnel records or officer-level indicators as top-level metrics.
- [ ] 4.4 After page approval, add or update tests that graph previews include a reader frame, scope, comparison guidance, and visible range context through labels, captions, or chart axes, without redundant time-window metadata, and are not grouped under a generic "Graphs" heading.
- [ ] 4.5 After page approval, add or update tests that visible metric cards do not duplicate icons on the same page, the current entity name is not repeated as a metric or graph pill/tag, and right-side in-page navigation does not render.
- [x] 4.6 Run `npx openspec validate --changes preview-civic-index-data-experience`.
- [x] 4.7 Run `npx openspec status --change preview-civic-index-data-experience`.
- [ ] 4.8 Run relevant site validation, including `npm run astro -- check` for frontend/type changes and `npm run validate` before claiming implementation complete.
