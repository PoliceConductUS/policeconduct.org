# Place civic index page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/`. It is a thin wrapper: it reloads the place location named by the URL, builds its civic index model, and renders it with the shared `CivicIndexPage` component. The subdirectories hold the topic pages, child lists, report archives and deeper routes for the same location.

## Interface

- Route `/[category]/[administrativeArea]/[place]/`; route params: `category`, `administrativeArea`, `place`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns `loadPlaceScopedPaths()` from `#src/lib/data/civic-scoped-routes.js` unchanged. `[index.astro:return loadPlaceScopedPaths();]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "place")`, where `path` is `/${Astro.params.category}/${Astro.params.administrativeArea}/${Astro.params.place}/`. `[index.astro:"place",]`
- The model is `await buildPlaceCivicIndex(place)` from `#src/lib/data/civic-index.js`. `[index.astro:const model = await buildPlaceCivicIndex(place);]`
- Renders `CivicIndexPage` (`#src/components/CivicIndexPage.astro`) with `model={model}` and `site={Astro.site}`. `[index.astro:<CivicIndexPage model={model} site={Astro.site}>]`
- Slot content: `RecordDataNotes` (`#src/components/RecordDataNotes.astro`) with `recordPath={model.pagePath}`. `[index.astro:<RecordDataNotes recordPath={model.pagePath} />]`
- No pagination in this file.
- Subdirectory: [[agencySlug]](./[agencySlug]/EGM.md) - agency profile page and its topic pages.
- Subdirectory: [agencies](./agencies/EGM.md) - list of agencies in the place, with pagination.
- Subdirectory: [budget](./budget/EGM.md) - `budget` topic page.
- Subdirectory: [civil-cases](./civil-cases/EGM.md) - `civil-cases` topic page.
- Subdirectory: [fatal-force-incidents](./fatal-force-incidents/EGM.md) - `fatal-force-incidents` topic page.
- Subdirectory: [liability-costs](./liability-costs/EGM.md) - `liability-costs` topic page.
- Subdirectory: [outcomes-by-income](./outcomes-by-income/EGM.md) - `outcomes-by-income` topic page.
- Subdirectory: [reports](./reports/EGM.md) - place report archives, and the report detail and watch pages.

## Invariants

- Route identity comes only from `Astro.params`; nothing is passed through `getStaticPaths()` props. `[index.astro:Astro.params.category]`
- The location type passed to `loadRequiredLocationByPath` is the literal `"place"`. `[index.astro:"place",]`
- The page contains no `throw` of its own; a missing or wrong-type location is handled inside `loadRequiredLocationByPath`. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadPlaceScopedPaths`, `loadRequiredLocationByPath` and `buildPlaceCivicIndex`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/civic-index.js]`

## Verification

- Run: `npm run test:e2e`
