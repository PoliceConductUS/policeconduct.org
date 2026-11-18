# Agency `budget` topic page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/[agencySlug]/budget/`. It wraps the shared `AgencyTopicPage` component and shows a single empty `StatCell` for the "Budget" topic with a help-collect link.

## Interface

- Route `/[category]/[administrativeArea]/[place]/[agencySlug]/budget/`; route params: `category`, `administrativeArea`, `place`, `agencySlug`. No props are read. `[index.astro:Astro.params]`
- `getStaticPaths()` returns `loadAgencyLocationStaticPathsForTopic("budget")` from `#src/lib/data/agency-detail.js` unchanged. `[index.astro:return loadAgencyLocationStaticPathsForTopic("budget");]`
- The agency is reloaded on every render with `loadAgencyDetailByRouteParams(Astro.params)`. `[index.astro:const data = await loadAgencyDetailByRouteParams(Astro.params);]`
- `AgencyTopicPage` (`#src/components/AgencyTopicPage.astro`) props: `data`, `topicLabel="Budget"`, `topicSlug="budget"`, and `description` "Budget, revenue, spending, forfeiture, and overtime records for this agency." `[index.astro:topicLabel="Budget"]`
- Slot content: one `<ul class="topic-row">` holding one `StatCell` (`#src/components/StatCell.astro`) with `variant="topic"`, `label="Budget"`, `gloss="Yearly department spending"`, `role="budget"`, the `empty` attribute and `helpCollectHref={volunteerHref}`. `[index.astro:gloss="Yearly department spending"]`
- `volunteerHref` is `buildHelpCollectHref(path, "agency", agencySlug)` from `#src/lib/data/civic-index.js`, where `path` is `data.agencyPath` followed by `budget/`. `[index.astro:data.agencyPath}budget/]`
- No pagination. No endpoint (`.ts`) file in this directory.

## Invariants

- The `StatCell` is always rendered with `empty`; this page shows no record values. `[index.astro:empty]`
- `agencySlug` for the help link is the last non-empty segment of `data.agencyPath`, or an empty string when there is none; it is not read from `Astro.params.agencySlug`. `[index.astro:const agencySlug = data.agencyPath.split("/").filter(Boolean).pop() || "";]`
- The topic string, `topicSlug` and the path suffix are the same literal, `budget`. `[index.astro:topicSlug="budget"]`
- The page contains no `throw` of its own. `[index.astro:loadAgencyDetailByRouteParams(]`

## Side Effects

- Build-time data loading only, through `loadAgencyLocationStaticPathsForTopic` and `loadAgencyDetailByRouteParams`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/agency-detail.js]`

## Verification

- Run: `npm run build`
