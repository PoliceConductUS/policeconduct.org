# Civil case video watch page (`src/pages/civil-cases/[slug]/watch`)

## Overview

Astro dynamic page for the routes `/civil-cases/{slug}/watch/{videoId}/`. It serves one page per coverage link of a civil case whose URL can be embedded as a video. The page has no form, no pagination and no client script of its own.

## Interface

- Route `/civil-cases/{slug}/watch/{videoId}/`: the watch path is built from the parent path and the video id. ``[[videoId].astro:const watchPath = `${parentPath}watch/${video.id}/`;]``
- `getStaticPaths` walks every case returned by `loadCivilCaseList()` from `src/lib/data/civil-cases.js`. `[[videoId].astro:for (const civilCase of await loadCivilCaseList()) {]`
- For each case, `getStaticPaths` loads the case detail with `loadCivilCaseDetailBySlug(civilCase.slug)` from `src/lib/data/civil-litigation-detail.js`. `[[videoId].astro:const detail = await loadCivilCaseDetailBySlug(civilCase.slug);]`
- `getStaticPaths` keeps only coverage links for which `getVideoEmbedUrl(link.url)` from `src/lib/video.js` returns a value. `[[videoId].astro:for (const video of detail.coverageLinks.filter((link) =>]`
- `getStaticPaths` emits one path per such link, with the params `slug` and `videoId` and no props. `[[videoId].astro:paths.push({ params: { slug: civilCase.slug, videoId: video.id } });]`
- Route params are `slug` and `videoId`. `[[videoId].astro:const { slug, videoId } = Astro.params;]`
- The render reloads the case by slug with `loadCivilCaseDetailBySlug`. `[[videoId].astro:const data = await loadCivilCaseDetailBySlug(slug!);]`
- The render picks the video with `requireWatchVideo(data.coverageLinks, videoId!)` from `src/lib/video.js`. `[[videoId].astro:const video = requireWatchVideo(data.coverageLinks, videoId!);]`
- The parent path is `/civil-cases/{slug}/`, using the slug stored on the loaded case. ``[[videoId].astro:const parentPath = `/civil-cases/${data.civilCase.slug}/`;]``
- Renders `WatchPage` (`src/components/WatchPage.astro`) with the props `video`, `videos`, `parentTitle`, `parentPath` and `watchPath`. `[[videoId].astro:<WatchPage]`
- `WatchPage` prop `videos` is the case's coverage links filtered to embeddable videos. `[[videoId].astro:videos={data.coverageLinks.filter((link) => getVideoEmbedUrl(link.url))}]`
- `WatchPage` prop `parentTitle` is the civil case title. `[[videoId].astro:parentTitle={data.civilCase.title}]`

## Invariants

- `getStaticPaths` throws when a listed case has no detail record. ``[[videoId].astro:if (!detail) throw new Error(`Civil case ${civilCase.slug} not found.`);]``
- The render throws when the case is not found by slug. ``[[videoId].astro:if (!data) throw new Error(`Civil case ${slug} not found.`);]``
- The render throws when the case has no coverage link whose id equals `videoId` and whose URL `getVideoEmbedUrl` accepts. ``[../../../../lib/video.ts:if (!video) throw new Error(`Video ${id} not found on this record.`);]``
- The render throws when the request path is not exactly the computed watch path. `[[videoId].astro:if (Astro.url.pathname !== watchPath)]`
- The path mismatch error names both paths. ``[[videoId].astro:`Civil case video path ${Astro.url.pathname} does not match ${watchPath}.`,]``

## Side Effects

- Calls `loadCivilCaseList()` once and `loadCivilCaseDetailBySlug()` once per case in `getStaticPaths`, then `loadCivilCaseDetailBySlug()` again for each rendered page; any data access happens inside those loaders. `[[videoId].astro:import { loadCivilCaseDetailBySlug } from "#src/lib/data/civil-litigation-detail.js";]`

## Verification

- Run: `npm run build`
