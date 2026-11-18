# Agency civil cases topic page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/`. It wraps the shared `AgencyTopicPage` component and renders every civil case row for the agency in one table. Paginated pages live in `./page/`.

## Interface

- Route `/[category]/[administrativeArea]/[place]/[agencySlug]/civil-cases/`; route params: `category`, `administrativeArea`, `place`, `agencySlug`. No props are read. `[index.astro:Astro.params]`
- `getStaticPaths()` returns `loadAgencyLocationStaticPathsForTopic("civil-cases")` from `#src/lib/data/agency-detail.js` unchanged. `[index.astro:return loadAgencyLocationStaticPathsForTopic("civil-cases");]`
- The agency is reloaded on every render with `loadAgencyDetailByRouteParams(Astro.params)`; rows come from `buildAgencyCivilCaseRows(data)` (`#src/lib/data/agency-civil-case-rows.js`). `[index.astro:const rows = buildAgencyCivilCaseRows(data);]`
- `AgencyTopicPage` props: `data`, `topicLabel="Civil Cases"`, `topicSlug="civil-cases"`, and a `description` that starts with the row count. `[index.astro:civil cases linked to this agency through court and personnel records.]`
- Slot content: `TableScroll` (`#src/components/TableScroll.astro`) around a `record-table` with columns Case (link to `row.caseUrl`), Cause number, Court, Filed, Outcome; then a `civic-limit-note` paragraph. `[index.astro:<th scope="col">Cause number</th>]`
- Subdirectory: [page](./page/EGM.md) - pages 2 and up of the agency's civil case rows, with Type and Personnel columns.

## Invariants

- This page renders all rows from `buildAgencyCivilCaseRows(data)`; it does not slice by `PAGE_SIZE` and renders no `Pagination` component. `[index.astro:{rows.map((row: CivilCaseRow) => (]`
- A row with no title is shown with the link text `Civil case`; missing cause number and court render as empty strings. `[index.astro:row.title || "Civil case"]`
- Filed dates are formatted with `en-US`, short month, in UTC; a missing date renders an empty string. `[index.astro:timeZone: "UTC",]`
- The limit note says a pending case is an allegation, not a finding. `[index.astro:finding. A dismissal is a court outcome, not a statement that no misconduct]`
- The page contains no `throw` of its own. `[index.astro:loadAgencyDetailByRouteParams(]`

## Side Effects

- Build-time data loading only, through `loadAgencyLocationStaticPathsForTopic` and `loadAgencyDetailByRouteParams`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/agency-detail.js]`

## Verification

- Run: `npm run build`
