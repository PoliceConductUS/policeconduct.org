# Place `civil-cases` topic page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/civil-cases/`. It is a thin wrapper: it builds the place civic index model for the location in the URL and hands it to the shared `CivicScopedIndexPage` component with `kind="civil-cases"`.

## Interface

- Route `/[category]/[administrativeArea]/[place]/civil-cases/` (from the file location `index.astro`); route params: `category`, `administrativeArea`, `place`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns the result of `loadPlaceScopedPathsForTopic("civil-cases")` from `#src/lib/data/civic-scoped-routes.js` unchanged; that loader decides which locations get this topic page. `[index.astro:return loadPlaceScopedPathsForTopic("civil-cases");]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "place")`, where `path` is the exact path `/${Astro.params.category}/${Astro.params.administrativeArea}/${Astro.params.place}/` built from the route params. `[index.astro:"place",]`
- The model is `await buildPlaceCivicIndex(location)` from `#src/lib/data/civic-index.js`. `[index.astro:const model = await buildPlaceCivicIndex(location);]`
- Renders exactly one component, `CivicScopedIndexPage` (`#src/components/CivicScopedIndexPage.astro`), with props `model={model}` and `kind="civil-cases"`. No slot content is passed. `[index.astro:<CivicScopedIndexPage model={model} kind="civil-cases" />]`
- No pagination. No endpoint (`.ts`) file in this directory.

## Invariants

- Route identity comes only from `Astro.params`; nothing is passed through `getStaticPaths()` props. `[index.astro:Astro.params.category]`
- The location type passed to `loadRequiredLocationByPath` is the literal `"place"`. `[index.astro:"place",]`
- The topic string passed to `loadPlaceScopedPathsForTopic` and the `kind` prop are the same literal, `"civil-cases"`. `[index.astro:kind="civil-cases"]`
- The page contains no `throw` of its own; a missing or wrong-type location is handled inside `loadRequiredLocationByPath`. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadPlaceScopedPathsForTopic`, `loadRequiredLocationByPath` and `buildPlaceCivicIndex`. The file has no writes, no network calls and no client script of its own. `[index.astro:#src/lib/data/civic-scoped-routes.js]`

## Verification

- Run: `npm run build`
