# News Post: A New Chapter for Accountability: Institute for Police Conduct Begins Soft Launch

## Overview

Static news post for the route `/news/2025/01/19/institute-for-police-conduct-begins-soft-launch/`. The directory has `index.astro` (the page) and `_metadata.ts` (the list record). The page takes its title, description, path and heading from `newsMeta`. The page passes no `robots` or `lede` prop, calls no data loader, has no form and ships no client script.

## Interface

- Route `/news/2025/01/19/institute-for-police-conduct-begins-soft-launch/`, a static page with no `getStaticPaths`. [_metadata.ts:href: "/news/2025/01/19/institute-for-police-conduct-begins-soft-launch/",]
- `_metadata.ts` exports `newsMeta`, the record the news list pages read for this post. [_metadata.ts:export const newsMeta = {]
- `newsMeta.date` is `2025-01-19`. [_metadata.ts:date: "2025-01-19",]
- `newsMeta.description` is the summary shown in the news list. [_metadata.ts:description:]
- `newsMeta.title` is `A New Chapter for Accountability: Institute for Police Conduct Begins Soft Launch`. [_metadata.ts:A New Chapter for Accountability: Institute for Police Conduct Begins Soft Launch]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- The page imports `newsMeta` from its own metadata file. [index.astro:import { newsMeta } from "./_metadata";]
- `PageShell` prop `structuredData` is a `buildNewsArticle` object built from `siteUrl`, `pageUrl`, `headline`, `description` and `datePublished`. [index.astro:const structuredData = buildNewsArticle({]
- `PageShell` props `title` and `heading` are `newsMeta.title`. [index.astro:title={newsMeta.title}]
- `PageShell` prop `description` is `newsMeta.description`, the same text the structured data uses. [index.astro:description={newsMeta.description}]
- `PageShell` props `pagePath` and `canonicalUrl` are `newsMeta.href`. [index.astro:canonicalUrl={newsMeta.href}]
- `PageShell` prop `breadcrumbs` has two entries: `News` linking to `/news/`, then `Soft Launch Announcement` linking to `newsMeta.href` and marked `current`. [index.astro:label: "Soft Launch Announcement",]
- The `header` slot holds the lead paragraph. [index.astro:Fragment slot="header"]
- The body lists ways to help, including volunteering and donations. [index.astro:Volunteers:]

## Invariants

- The structured-data page URL is `newsMeta.href` resolved against `getSiteUrl(Astro.site)`. [index.astro:pageUrl: new URL(newsMeta.href, siteUrl).toString(),]
- The structured-data `headline`, `description` and `datePublished` come from `newsMeta`. [index.astro:datePublished: newsMeta.date,]
- `newsMeta.href` matches this directory path under `src/pages`. [_metadata.ts:/news/2025/01/19/institute-for-police-conduct-begins-soft-launch/]

## Side Effects

- None

## Verification

- Run: `npm run build`
