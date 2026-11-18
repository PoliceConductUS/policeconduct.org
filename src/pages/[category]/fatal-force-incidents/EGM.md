# State `fatal-force-incidents` topic page

## Overview

Static Astro page for the route `/[category]/fatal-force-incidents/`. It is a thin wrapper: it builds the state civic index model for the location in the URL and hands it to the shared `CivicScopedIndexPage` component with `kind="fatal-force-incidents"`.

## Interface

- Route `/[category]/fatal-force-incidents/` (from the file location `index.astro`); route params: `category`. No props are read. `[index.astro:Astro.params.category]`
- `getStaticPaths()` returns the result of `loadStateScopedPathsForTopic("fatal-force-incidents")` from `#src/lib/data/civic-scoped-routes.js` unchanged; that loader decides which locations get this topic page. `[index.astro:return loadStateScopedPathsForTopic("fatal-force-incidents");]`
- The location is reloaded on every render with `loadRequiredLocationByPath(path, "state")`, where `path` is the exact path `/${Astro.params.category}/` built from the route params. `[index.astro:"state",]`
- The model is `await buildStateCivicIndex(location)` from `#src/lib/data/civic-index.js`. `[index.astro:const model = await buildStateCivicIndex(location);]`
- Renders exactly one component, `CivicScopedIndexPage` (`#src/components/CivicScopedIndexPage.astro`), with props `model={model}` and `kind="fatal-force-incidents"`. No slot content is passed. `[index.astro:<CivicScopedIndexPage model={model} kind="fatal-force-incidents" />]`
- No pagination. No endpoint (`.ts`) file in this directory.

## Invariants

- Route identity comes only from `Astro.params`; nothing is passed through `getStaticPaths()` props. `[index.astro:Astro.params.category]`
- The location type passed to `loadRequiredLocationByPath` is the literal `"state"`. `[index.astro:"state",]`
- The topic string passed to `loadStateScopedPathsForTopic` and the `kind` prop are the same literal, `"fatal-force-incidents"`. `[index.astro:kind="fatal-force-incidents"]`
- The page contains no `throw` of its own; a missing or wrong-type location is handled inside `loadRequiredLocationByPath`. `[index.astro:loadRequiredLocationByPath(]`

## Side Effects

- Build-time data loading only, through `loadStateScopedPathsForTopic`, `loadRequiredLocationByPath` and `buildStateCivicIndex`. The file has no writes, no network calls and no client script of its own. `[index.astro:#src/lib/data/civic-scoped-routes.js]`

## Verification

- Run: `npm run build`
