# State report archive pages

## Overview

Static Astro catch-all page for the route `/[category]/reports/[...parts]/`. It renders report archive pages for the `"state"` scope with the shared `ReportArchivePage` component. Which `parts` values exist is decided entirely by `buildReportArchiveStaticPaths`.

## Interface

- Route `/[category]/reports/[...parts]/` (file `[...parts].astro`); route params: `category`, plus the rest param `parts`. The page body reads `Astro.url.pathname`, not `Astro.params` or `Astro.props`. `[[...parts].astro:Astro.url.pathname]`
- `getStaticPaths()` calls `buildReportArchiveStaticPaths(await loadReportSummaries(), "state")` and returns only the `params` of each entry. `buildReportArchiveStaticPaths` comes from `#src/lib/data/report-archives.js` and `loadReportSummaries` from `#src/lib/data/summaries.js`; the second argument is the archive scope. `[[...parts].astro:.map(({ params }) => ({ params }));]`
- At render time the page calls `buildReportArchiveStaticPaths` again and takes the entry whose `props.pagePath` equals `Astro.url.pathname`; it reads `breadcrumbs`, `pagePath`, `reports` and `title` from that entry. `[[...parts].astro:candidate.props.pagePath === Astro.url.pathname]` `[[...parts].astro:const { breadcrumbs, pagePath, reports, title } = archive.props;]`
- Renders exactly one component, `ReportArchivePage` (`#src/components/ReportArchivePage.astro`), passing `breadcrumbs`, `pagePath`, `reports` and `title` unchanged. `[[...parts].astro:<ReportArchivePage]`
- No pagination in this file. No endpoint (`.ts`) file in this directory.

## Invariants

- The archive scope argument is the literal `"state"`. `[[...parts].astro:"state"]`
- Page identity and data never travel through `getStaticPaths()` props; the render reloads the report summaries and finds the archive by exact path. `[[...parts].astro:candidate.props.pagePath === Astro.url.pathname]`
- The page throws when no archive has the request path. `[[...parts].astro:No report archive has the path]`

## Side Effects

- Build-time data loading only, through `loadReportSummaries()`. No writes, network calls or client script in this file. `[[...parts].astro:#src/lib/data/summaries.js]`

## Verification

- Run: `npm run test:e2e`
