# Federal reports index (`src/pages/federal/reports`)

## Overview

Static Astro page for the route `/federal/reports/`. It loads every federal agency summary, builds the `reports` topic index model and hands it to one shared component. The page has no route params, no `getStaticPaths`, no pagination, no form and no client script of its own.

## Interface

- Route `/federal/reports/`: loads all federal agency summaries with `loadFederalAgencySummaries()` from `src/lib/data/federal-agencies.js`. `[index.astro:const federalAgencies = await loadFederalAgencySummaries();]`
- Builds the page model with `buildFederalAgencyTopicIndexModel` from `src/lib/data/federal-agencies.js`, passing the agency summaries and a topic key. `[index.astro:const model = buildFederalAgencyTopicIndexModel(]`
- The topic key passed to the model builder is the fixed string `reports`. `[index.astro:"reports"]`
- Renders `CivicAgencyHierarchyPage` from `src/components/CivicAgencyHierarchyPage.astro` with the props `model` and `site` (`Astro.site`). `[index.astro:<CivicAgencyHierarchyPage model={model} site={Astro.site} />]`

## Invariants

- None

## Side Effects

- Calls the `loadFederalAgencySummaries()` loader once per build of this page; any data access happens inside that loader. `[index.astro:loadFederalAgencySummaries,]`

## Verification

- Run: `npm run build`
