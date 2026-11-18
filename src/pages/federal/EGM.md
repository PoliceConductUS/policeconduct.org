# Federal agencies index (`src/pages/federal`)

## Overview

Static Astro page for the route `/federal/`. It loads every federal agency summary, builds a civic index model and hands it to one shared component. The page has no route params, no `getStaticPaths`, no pagination, no form and no client script of its own. The subdirectories hold the federal topic index pages and the per-agency pages.

## Interface

- Route `/federal/`: loads all federal agency summaries with `loadFederalAgencySummaries()` from `src/lib/data/federal-agencies.js`. `[index.astro:const federalAgencies = await loadFederalAgencySummaries();]`
- Builds the page model with `buildFederalCivicIndex(federalAgencies)` from `src/lib/data/federal-agencies.js`. `[index.astro:const model = buildFederalCivicIndex(federalAgencies);]`
- Renders `CivicIndexPage` from `src/components/CivicIndexPage.astro` with the props `model` and `site` (`Astro.site`). `[index.astro:<CivicIndexPage model={model} site={Astro.site} />]`
- [Federal agency detail (`[slug]`)](./[slug]/EGM.md): per-agency page `/federal/{slug}/` and its topic pages.
- [Federal budget index (`budget`)](./budget/EGM.md): route `/federal/budget/`.
- [Federal civil cases index (`civil-cases`)](./civil-cases/EGM.md): route `/federal/civil-cases/`.
- [Federal liability costs index (`liability-costs`)](./liability-costs/EGM.md): route `/federal/liability-costs/`.
- [Federal outcomes by income index (`outcomes-by-income`)](./outcomes-by-income/EGM.md): route `/federal/outcomes-by-income/`.
- [Federal reports index (`reports`)](./reports/EGM.md): route `/federal/reports/`.

## Invariants

- None

## Side Effects

- Calls the `loadFederalAgencySummaries()` loader once per build of this page; any data access happens inside that loader. `[index.astro:loadFederalAgencySummaries,]`

## Verification

- Run: `npm run test:e2e`
