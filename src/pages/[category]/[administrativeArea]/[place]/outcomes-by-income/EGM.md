# Place `outcomes-by-income` topic page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/outcomes-by-income/`. It is a thin wrapper: it builds the place civic index model for the location in the URL and hands it to the shared `CivicScopedIndexPage` component with `kind="outcomes-by-income"`.

## Interface

- Route `/[category]/[administrativeArea]/[place]/outcomes-by-income/` (from the file location `index.astro`); route params: `category`, `administrativeArea`, `place`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns the result of `loadPlaceScopedPathsForTopic("outcomes-by-income")` from `#src/lib/data/civic-scoped-routes.js` unchanged; that loader decides which locations get this topic page. `[index.astro:return loadPlaceScopedPathsForTopic("outcomes-by-income");]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "place")`, where `path` is the exact path `/${Astro.params.category}/${Astro.params.administrativeArea}/${Astro.params.place}/` built from the route params. `[index.astro:"place",]`
- The model is `await buildPlaceCivicIndex(location)` from `#src/lib/data/civic-index.js`. `[index.astro:const model = await buildPlaceCivicIndex(location);]`
- Renders exactly one component, `CivicScopedIndexPage` (`#src/components/CivicScopedIndexPage.astro`), with props `model={model}` and `kind="outcomes-by-income"`. No slot content is passed. `[index.astro:<CivicScopedIndexPage model={model} kind="outcomes-by-income" />]`
- No pagination. No endpoint (`.ts`) file in this directory.

## Invariants

- Route identity comes only from `Astro.params`; nothing is passed through `getStaticPaths()` props. `[index.astro:Astro.params.category]`
- The location type passed to `loadRequiredLocationByPath` is the literal `"place"`. `[index.astro:"place",]`
- The topic string passed to `loadPlaceScopedPathsForTopic` and the `kind` prop are the same literal, `"outcomes-by-income"`. `[index.astro:kind="outcomes-by-income"]`
- The page contains no `throw` of its own; a missing or wrong-type location is handled inside `loadRequiredLocationByPath`. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadPlaceScopedPathsForTopic`, `loadRequiredLocationByPath` and `buildPlaceCivicIndex`. The file has no writes, no network calls and no client script of its own. `[index.astro:#src/lib/data/civic-scoped-routes.js]`

## Verification

- Run: `npm run build`
