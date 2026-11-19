# Place `fatal-force-incidents` topic page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/fatal-force-incidents/`. It is a thin wrapper: it builds the place civic index model for the location in the URL and hands it to the shared `CivicScopedIndexPage` component with `kind="fatal-force-incidents"`.

## Interface

- Route `/[category]/[administrativeArea]/[place]/fatal-force-incidents/` (from the file location `index.astro`); route params: `category`, `administrativeArea`, `place`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns the result of `loadPlaceScopedPathsForTopic("fatal-force-incidents")` from `#src/lib/data/civic-scoped-routes.js` unchanged; that loader decides which locations get this topic page. `[index.astro:return loadPlaceScopedPathsForTopic("fatal-force-incidents");]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "place")`, where `path` is the exact path `/${Astro.params.category}/${Astro.params.administrativeArea}/${Astro.params.place}/` built from the route params. `[index.astro:"place",]`
- The model is `await buildPlaceCivicIndex(location)` from `#src/lib/data/civic-index.js`. `[index.astro:const model = await buildPlaceCivicIndex(location);]`
- Renders exactly one component, `CivicScopedIndexPage` (`#src/components/CivicScopedIndexPage.astro`), with props `model={model}` and `kind="fatal-force-incidents"`. No slot content is passed. `[index.astro:<CivicScopedIndexPage model={model} kind="fatal-force-incidents" />]`
- No pagination. No endpoint (`.ts`) file in this directory.

## Invariants

- Route identity comes only from `Astro.params`; nothing is passed through `getStaticPaths()` props. `[index.astro:Astro.params.category]`
- The location type passed to `loadRequiredLocationByPath` is the literal `"place"`. `[index.astro:"place",]`
- The topic string passed to `loadPlaceScopedPathsForTopic` and the `kind` prop are the same literal, `"fatal-force-incidents"`. `[index.astro:kind="fatal-force-incidents"]`
- The page contains no `throw` of its own; `loadRequiredLocationByPath` throws when no location has that exact path or the location has a different type. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadPlaceScopedPathsForTopic`, `loadRequiredLocationByPath` and `buildPlaceCivicIndex`. The file has no writes, no network calls and no client script of its own. `[index.astro:#src/lib/data/civic-scoped-routes.js]`

## Verification

- Run: `npm run build`
