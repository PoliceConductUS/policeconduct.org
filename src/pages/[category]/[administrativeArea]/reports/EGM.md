# Administrative area report archive pages

## Overview

Static Astro catch-all page for the route `/[category]/[administrativeArea]/reports/[...parts]/`. It renders report archive pages for the `"county"` scope with the shared `ReportArchivePage` component. Which `parts` values exist is decided entirely by `buildReportArchiveStaticPaths`.

## Interface

- Route `/[category]/[administrativeArea]/reports/[...parts]/` (file `[...parts].astro`); route params: `category`, `administrativeArea`, plus the rest param `parts`. The page body does not read `Astro.params`. `[[...parts].astro:Astro.props]`
- `getStaticPaths()` returns `buildReportArchiveStaticPaths(await loadReportSummaries(), "county")` unchanged. `buildReportArchiveStaticPaths` comes from `#src/lib/data/report-archives.js` and `loadReportSummaries` from `#src/lib/data/summaries.js`; the second argument is the archive scope. `[[...parts].astro:return buildReportArchiveStaticPaths(await loadReportSummaries(), "county");]`
- Props read from `Astro.props`: `breadcrumbs`, `pagePath`, `reports`, `title`. All four come from the paths built by `buildReportArchiveStaticPaths`. `[[...parts].astro:const { breadcrumbs, pagePath, reports, title } = Astro.props;]`
- Renders exactly one component, `ReportArchivePage` (`#src/components/ReportArchivePage.astro`), passing `breadcrumbs`, `pagePath`, `reports` and `title` unchanged. `[[...parts].astro:<ReportArchivePage]`
- No pagination in this file. No endpoint (`.ts`) file in this directory.

## Invariants

- The archive scope argument is the literal `"county"`. `[[...parts].astro:"county"]`
- Nothing is reloaded by path at render time: page identity and data (`breadcrumbs`, `pagePath`, `reports`, `title`) arrive through `getStaticPaths()` props. `[[...parts].astro:const { breadcrumbs, pagePath, reports, title } = Astro.props;]`
- The file contains no `throw` of its own. `[[...parts].astro:buildReportArchiveStaticPaths(]`

## Side Effects

- Build-time data loading only, through `loadReportSummaries()`. No writes, network calls or client script in this file. `[[...parts].astro:#src/lib/data/summaries.js]`

## Verification

- Run: `npm run build`
