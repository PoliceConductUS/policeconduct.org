# State civic index page

## Overview

Static Astro page for the route `/[category]/`. It is a thin wrapper: it reloads the state location named by the URL, builds its civic index model, and renders it with the shared `CivicIndexPage` component. The subdirectories hold the topic pages, child lists, report archives and deeper routes for the same location.

## Interface

- Route `/[category]/`; route params: `category`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns `loadStateScopedPaths()` from `#src/lib/data/civic-scoped-routes.js` unchanged. `[index.astro:return loadStateScopedPaths();]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "state")`, where `path` is `/${Astro.params.category}/`. `[index.astro:"state",]`
- The model is `await buildStateCivicIndex(location)` from `#src/lib/data/civic-index.js`. `[index.astro:const model = await buildStateCivicIndex(location);]`
- Renders `CivicIndexPage` (`#src/components/CivicIndexPage.astro`) with `model={model}` and `site={Astro.site}`. `[index.astro:<CivicIndexPage model={model} site={Astro.site}>]`
- Slot content: `RecordDataNotes` (`#src/components/RecordDataNotes.astro`) with `recordPath={model.pagePath}`. `[index.astro:<RecordDataNotes recordPath={model.pagePath} />]`
- No pagination in this file.
- Subdirectory: [[administrativeArea]](./[administrativeArea]/EGM.md) - administrative area civic index and everything below it (places, agencies, reports).
- Subdirectory: [budget](./budget/EGM.md) - `budget` topic page.
- Subdirectory: [civil-cases](./civil-cases/EGM.md) - `civil-cases` topic page.
- Subdirectory: [counties](./counties/EGM.md) - list of counties in the state, with pagination.
- Subdirectory: [fatal-force-incidents](./fatal-force-incidents/EGM.md) - `fatal-force-incidents` topic page.
- Subdirectory: [liability-costs](./liability-costs/EGM.md) - `liability-costs` topic page.
- Subdirectory: [licensing-authority](./licensing-authority/EGM.md) - state licensing authority page, data notes pages and CSV download.
- Subdirectory: [outcomes-by-income](./outcomes-by-income/EGM.md) - `outcomes-by-income` topic page.
- Subdirectory: [reports](./reports/EGM.md) - report archives for the `"state"` scope.

## Invariants

- Route identity comes only from `Astro.params`; nothing is passed through `getStaticPaths()` props. `[index.astro:Astro.params.category]`
- The location type passed to `loadRequiredLocationByPath` is the literal `"state"`. `[index.astro:"state",]`
- The page contains no `throw` of its own; `loadRequiredLocationByPath` throws when no location has that exact path or the location has a different type. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadStateScopedPaths`, `loadRequiredLocationByPath` and `buildStateCivicIndex`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/civic-index.js]`

## Verification

- Run: `npm run test:e2e`
