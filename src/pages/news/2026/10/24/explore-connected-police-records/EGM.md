# News Post: A New Way to Explore Connected Police Records

## Overview

Static news post for the route `/news/2026/10/24/explore-connected-police-records/`. The directory has `index.astro` (the page) and `_metadata.ts` (the list record). The page takes its title, description, path and heading from `newsMeta`. The page passes no `robots` or `lede` prop, calls no data loader, has no form and ships no client script.

## Interface

- Route `/news/2026/10/24/explore-connected-police-records/`, a static page with no `getStaticPaths`. [_metadata.ts:href: "/news/2026/10/24/explore-connected-police-records/",]
- `_metadata.ts` exports `newsMeta`, the record the news list pages read for this post. [_metadata.ts:export const newsMeta = {]
- `newsMeta.date` is `2026-10-24`. [_metadata.ts:date: "2026-10-24",]
- `newsMeta.description` is the summary shown in the news list. [_metadata.ts:description:]
- `newsMeta.title` is `A New Way to Explore Connected Police Records`. [_metadata.ts:A New Way to Explore Connected Police Records]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- The page imports `newsMeta` from its own metadata file. [index.astro:import { newsMeta } from "./_metadata";]
- `PageShell` prop `structuredData` is a `buildNewsArticle` object built from `siteUrl`, `pageUrl`, `headline`, `description` and `datePublished`. [index.astro:const structuredData = buildNewsArticle({]
- `PageShell` props `title` and `heading` are `newsMeta.title`. [index.astro:title={newsMeta.title}]
- `PageShell` prop `description` is `newsMeta.description`. [index.astro:description={newsMeta.description}]
- `PageShell` props `pagePath` and `canonicalUrl` are `newsMeta.href`. [index.astro:canonicalUrl={newsMeta.href}]
- `PageShell` prop `breadcrumbs` has two entries: `News` linking to `/news/`, then the post title marked `current`. [index.astro:{ label: newsMeta.title, href: newsMeta.href, current: true }]
- The `header` slot shows the date in a `time` element whose `datetime` is `newsMeta.date`, followed by a lead paragraph. [index.astro:time datetime={newsMeta.date}]
- The body links to other site routes, including `/find-records/`, `/mn/licensing-authority/`, `/tx/`, `/report/new/` and `/data-and-methods/`. [index.astro:href="/mn/licensing-authority/"]

## Invariants

- The structured-data page URL is `newsMeta.href` resolved against `getSiteUrl(Astro.site)`. [index.astro:pageUrl: new URL(newsMeta.href, siteUrl).toString(),]
- The structured-data `headline`, `description` and `datePublished` come from `newsMeta`. [index.astro:datePublished: newsMeta.date,]
- `newsMeta.href` matches this directory path under `src/pages`. [_metadata.ts:/news/2026/10/24/explore-connected-police-records/]
- The visible date text is written by hand next to the `datetime` attribute and must be kept in step with `newsMeta.date`. [index.astro:October 24, 2026]

## Side Effects

- None

## Verification

- Run: `npm run build`
