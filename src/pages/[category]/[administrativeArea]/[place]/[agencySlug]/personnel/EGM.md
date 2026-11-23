# Agency personnel topic page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/[agencySlug]/personnel/`. It wraps the shared `AgencyTopicPage` component and lists the agency's personnel with `AgencyPersonnelList`.

## Interface

- Route `/[category]/[administrativeArea]/[place]/[agencySlug]/personnel/`; route params: `category`, `administrativeArea`, `place`, `agencySlug`. No props are read. `[index.astro:Astro.params]`
- `getStaticPaths()` returns `loadAgencyLocationStaticPathsForTopic("personnel")` from `#src/lib/data/agency-detail.js` unchanged. `[index.astro:return loadAgencyLocationStaticPathsForTopic("personnel");]`
- The agency is reloaded on every render with `loadAgencyDetailByRouteParams(Astro.params)`; `employees` is taken from the result. `[index.astro:const { employees } = data;]`
- `AgencyTopicPage` props: `data`, `topicLabel="Personnel"`, `topicSlug="personnel"`, and a fixed `description`. `[index.astro:description="Personnel linked to this agency."]`
- Slot content: `AgencyPersonnelList` (`#src/components/AgencyPersonnelList.astro`) with `employees={employees}` and `counts={counts}` (the staff counts `loadAgencyDetail` reads from the intake view `site_agency_count`), followed by a `civic-limit-note` paragraph. `[index.astro:<AgencyPersonnelList employees={employees} counts={counts} />]`
- No pagination in this file: the whole `employees` list is passed to `AgencyPersonnelList`.

## Invariants

- The limit note states that a listing is employment history, not an allegation. `[index.astro:employment history, not an allegation.]`
- Route identity comes only from `Astro.params`. `[index.astro:loadAgencyDetailByRouteParams(Astro.params)]`
- The page contains no `throw` of its own. `[index.astro:loadAgencyDetailByRouteParams(]`

## Side Effects

- Build-time data loading only, through `loadAgencyLocationStaticPathsForTopic` and `loadAgencyDetailByRouteParams`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/agency-detail.js]`

## Verification

- Run: `npm run test:e2e`
