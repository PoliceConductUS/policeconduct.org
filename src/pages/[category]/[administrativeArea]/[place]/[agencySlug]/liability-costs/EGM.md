# Agency `liability-costs` topic page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/[agencySlug]/liability-costs/`. It wraps the shared `AgencyTopicPage` component and shows a single empty `StatCell` for the "Liability Costs" topic with a help-collect link.

## Interface

- Route `/[category]/[administrativeArea]/[place]/[agencySlug]/liability-costs/`; route params: `category`, `administrativeArea`, `place`, `agencySlug`. No props are read. `[index.astro:Astro.params]`
- `getStaticPaths()` returns `loadAgencyLocationStaticPathsForTopic("liability-costs")` from `#src/lib/data/agency-detail.js` unchanged. `[index.astro:return loadAgencyLocationStaticPathsForTopic("liability-costs");]`
- The agency is reloaded on every render with `loadAgencyDetailByRouteParams(Astro.params)`. `[index.astro:const data = await loadAgencyDetailByRouteParams(Astro.params);]`
- `AgencyTopicPage` (`#src/components/AgencyTopicPage.astro`) props: `data`, `topicLabel="Liability Costs"`, `topicSlug="liability-costs"`, and `description` "Claims, settlements, judgments, defense costs, and related payments for this agency." `[index.astro:topicLabel="Liability Costs"]`
- Slot content: one `<ul class="topic-row">` holding one `StatCell` (`#src/components/StatCell.astro`) with `variant="topic"`, `label="Liability Costs"`, `gloss="Payouts in police-conduct cases"`, `role="liability"`, the `empty` attribute and `helpCollectHref={volunteerHref}`. `[index.astro:gloss="Payouts in police-conduct cases"]`
- `volunteerHref` is `buildHelpCollectHref(path, "agency", agencySlug)` from `#src/lib/data/civic-index.js`, where `path` is `data.agencyPath` followed by `liability-costs/`. `[index.astro:data.agencyPath}liability-costs/]`
- No pagination. No endpoint (`.ts`) file in this directory.

## Invariants

- The `StatCell` is always rendered with `empty`; this page shows no record values. `[index.astro:empty]`
- `agencySlug` for the help link is the last non-empty segment of `data.agencyPath`, or an empty string when there is none; it is not read from `Astro.params.agencySlug`. `[index.astro:const agencySlug = data.agencyPath.split("/").filter(Boolean).pop() || "";]`
- The topic string, `topicSlug` and the path suffix are the same literal, `liability-costs`. `[index.astro:topicSlug="liability-costs"]`
- The page contains no `throw` of its own. `[index.astro:loadAgencyDetailByRouteParams(]`

## Side Effects

- Build-time data loading only, through `loadAgencyLocationStaticPathsForTopic` and `loadAgencyDetailByRouteParams`. No writes, network calls or client script in this file. `[index.astro:#src/lib/data/agency-detail.js]`

## Verification

- Run: `npm run build`
