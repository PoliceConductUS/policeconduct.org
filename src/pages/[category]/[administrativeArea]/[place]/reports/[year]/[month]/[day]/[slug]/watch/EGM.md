# Report video watch page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/reports/[year]/[month]/[day]/[slug]/watch/[videoId]/`. It renders one video evidence link of a report with the shared `WatchPage` component.

## Interface

- Route `.../reports/[year]/[month]/[day]/[slug]/watch/[videoId]/`; route params: `category`, `administrativeArea`, `place`, `year`, `month`, `day`, `slug`, `videoId`. No props. `[[videoId].astro:videoId: video.id,]`
- `getStaticPaths()` loops over `loadReportSummaries()` (`#src/lib/data/summaries.js`), loads each report with `loadReportDetail(report.slug)` (`#src/lib/report-detail.js`), and emits one path per evidence link for which `getVideoEmbedUrl(link.url)` (`#src/lib/video.js`) is truthy. `[[videoId].astro:for (const report of await loadReportSummaries()) {]`
- Location params come from `parseLocationPathParts(report.locationPath, report.id)` (`#src/lib/data/report-paths.js`): `state` becomes `category`, plus `administrativeArea` and `place`. `year`, `month`, `day` and `slug` come from the report summary. `[[videoId].astro:const location = parseLocationPathParts(report.locationPath, report.id);]`
- Render: reads only `slug` and `videoId` from `Astro.params` and reloads the report with `loadReportDetail(slug!)`. `[[videoId].astro:const data = await loadReportDetail(slug!);]`
- The video is selected with `requireWatchVideo(data.evidenceLinks, videoId!)` from `#src/lib/video.js`. `[[videoId].astro:const video = requireWatchVideo(data.evidenceLinks, videoId!);]`
- `watchPath` is `data.canonicalPath` followed by `watch/`, the video id and `/`. `[[videoId].astro:data.canonicalPath}watch/]`
- Renders `WatchPage` (`#src/components/WatchPage.astro`) with `video`, `videos` (all evidence links with a truthy `getVideoEmbedUrl`), `parentTitle` (`data.report.title`), `parentPath` (`data.canonicalPath`) and `watchPath`. `[[videoId].astro:parentTitle={data.report.title as string}]`
- No pagination.

## Invariants

- The render throws `Video <videoId> not found on this record.` (from `requireWatchVideo`) when the report has no evidence link with that id and a truthy `getVideoEmbedUrl`. ``[../../../../../../../../../../lib/video.ts:if (!video) throw new Error(`Video ${id} not found on this record.`);]``
- `getStaticPaths()` throws `Report <slug> not found.` when `loadReportDetail` returns nothing for a listed report. `[[videoId].astro:if (!detail) throw new Error(]`
- The render throws `Report <slug> not found.` when the report cannot be reloaded by slug. `[[videoId].astro:if (!data) throw new Error(]`
- The render throws when the request path differs from `watchPath`, so the URL must equal the report canonical path plus `watch/<videoId>/`. `[[videoId].astro:if (Astro.url.pathname !== watchPath)]`
- Error text for that mismatch names both paths. `[[videoId].astro:does not match]`
- Only evidence links with a truthy `getVideoEmbedUrl(link.url)` get a watch page and appear in `videos`. `[[videoId].astro:getVideoEmbedUrl(link.url),]`

## Side Effects

- Build-time data loading only: `loadReportSummaries()` once and `loadReportDetail()` once per report while static paths are built, then once per rendered page. No writes, network calls or client script in this file. `[[videoId].astro:const detail = await loadReportDetail(report.slug);]`

## Verification

- Run: `npm run build`
