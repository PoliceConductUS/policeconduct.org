# Administrative area civic index page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/`. It is a thin wrapper: it reloads the administrative_area location named by the URL, builds its civic index model, and renders it with the shared `CivicIndexPage` component. The subdirectories hold the topic pages, child lists, report archives and deeper routes for the same location.

## Interface

- Route `/[category]/[administrativeArea]/`; route params: `category`, `administrativeArea`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns `loadAdministrativeAreaScopedPaths()` from `#src/lib/data/civic-scoped-routes.js` unchanged. `[index.astro:return loadAdministrativeAreaScopedPaths();]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "administrative_area")`, where `path` is `/${Astro.params.category}/${Astro.params.administrativeArea}/`. `[index.astro:"administrative_area",]`
- The model is `await buildAdministrativeAreaCivicIndex(area)` from `#src/lib/data/civic-index.js`. `[index.astro:const model = await buildAdministrativeAreaCivicIndex(area);]`
- Renders `CivicIndexPage` (`#src/components/CivicIndexPage.astro`) with `model={model}` and `site={Astro.site}`. `[index.astro:<CivicIndexPage model={model} site={Astro.site}>]`
- Slot content: `RecordDataNotes` (`#src/components/RecordDataNotes.astro`) with `recordPath={model.pagePath}`. `[index.astro:<RecordDataNotes recordPath={model.pagePath} />]`
- No pagination in this file.
- Subdirectory: [[place]](./[place]/EGM.md) - place civic index and everything below it (agencies, reports).
- Subdirectory: [budget](./budget/EGM.md) - `budget` topic page.
- Subdirectory: [civil-cases](./civil-cases/EGM.md) - `civil-cases` topic page.
- Subdirectory: [fatal-force-incidents](./fatal-force-incidents/EGM.md) - `fatal-force-incidents` topic page.
- Subdirectory: [liability-costs](./liability-costs/EGM.md) - `liability-costs` topic page.
- Subdirectory: [outcomes-by-income](./outcomes-by-income/EGM.md) - `outcomes-by-income` topic page.
- Subdirectory: [places](./places/EGM.md) - list of places in the administrative area, with pagination.
- Subdirectory: [reports](./reports/EGM.md) - report archives for the `"county"` scope.

## Invariants

- Route identity comes only from `Astro.params`; nothing is passed through `getStaticPaths()` props. `[index.astro:Astro.params.category]`
- The location type passed to `loadRequiredLocationByPath` is the literal `"administrative_area"`. `[index.astro:"administrative_area",]`
- The page contains no `throw` of its own; a missing or wrong-type location is handled inside `loadRequiredLocationByPath`. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadAdministrativeAreaScopedPaths`, `loadRequiredLocationByPath` and `buildAdministrativeAreaCivicIndex`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/civic-index.js]`

## Verification

- Run: `npm run test:e2e`
