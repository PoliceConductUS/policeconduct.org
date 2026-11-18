# News Post: Section1983.org Launches Free Legal Guide for Pro Se Civil Rights Plaintiffs

## Overview

Static news post for the route `/news/2026/02/17/section1983-org-launches-free-guide-for-pro-se-plaintiffs/`. The directory has `index.astro` (the page) and `_metadata.ts` (the list record). The page writes its title, description, path and heading as literal strings instead of reading them from `newsMeta`; only the structured data reads `newsMeta`. The page passes no `robots` or `lede` prop, calls no data loader, has no form and ships no client script.

## Interface

- Route `/news/2026/02/17/section1983-org-launches-free-guide-for-pro-se-plaintiffs/`, a static page with no `getStaticPaths`. [_metadata.ts:href: "/news/2026/02/17/section1983-org-launches-free-guide-for-pro-se-plaintiffs/",]
- `_metadata.ts` exports `newsMeta`, the record the news list pages read for this post. [_metadata.ts:export const newsMeta = {]
- `newsMeta.date` is `2026-02-17`. [_metadata.ts:date: "2026-02-17",]
- `newsMeta.description` is the summary shown in the news list. [_metadata.ts:description:]
- `newsMeta.title` is `Section1983.org Launches Free Legal Guide for Pro Se Civil Rights Plaintiffs`. [_metadata.ts:Section1983.org Launches Free Legal Guide for Pro Se Civil Rights Plaintiffs]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- The page imports `newsMeta` from its own metadata file. [index.astro:import { newsMeta } from "./_metadata";]
- `PageShell` prop `structuredData` is a `buildNewsArticle` object built from `siteUrl`, `pageUrl`, `headline`, `description` and `datePublished`. [index.astro:const structuredData = buildNewsArticle({]
- `PageShell` prop `title` is a literal string. [index.astro:title="Section1983.org Launches Free Legal Guide for Pro Se Civil Rights Plaintiffs"]
- `PageShell` prop `description` is a literal string written in the page. [index.astro:description="]
- `PageShell` props `pagePath` and `canonicalUrl` are the literal route path. [index.astro:canonicalUrl="/news/2026/02/17/section1983-org-launches-free-guide-for-pro-se-plaintiffs/"]
- `PageShell` prop `breadcrumbs` has two entries: `News` linking to `/news/`, then `Section1983.org Launch` marked `current`. [index.astro:label: "Section1983.org Launch",]
- `PageShell` prop `heading` is a literal string. [index.astro:heading="Section1983.org Launches Free Legal Guide for Pro Se Civil Rights Plaintiffs"]
- The `header` slot holds the lead paragraph. [index.astro:Fragment slot="header"]
- The body links out to the announced guide site and related external pages. [index.astro:href="https://section1983.org"]
- The body ends with a media contact block after a horizontal rule. [index.astro:Media Contact:]

## Invariants

- The structured-data page URL is `newsMeta.href` resolved against `getSiteUrl(Astro.site)`. [index.astro:pageUrl: new URL(newsMeta.href, siteUrl).toString(),]
- The structured-data `headline`, `description` and `datePublished` come from `newsMeta`. [index.astro:datePublished: newsMeta.date,]
- `newsMeta.href` matches this directory path under `src/pages`. [_metadata.ts:/news/2026/02/17/section1983-org-launches-free-guide-for-pro-se-plaintiffs/]
- The literal `title` and `heading` in `index.astro` repeat `newsMeta.title` and must be kept in step with it by hand. [index.astro:heading="Section1983.org Launches Free Legal Guide for Pro Se Civil Rights Plaintiffs"]
- The literal `pagePath` in `index.astro` repeats `newsMeta.href` and must be kept in step with it by hand. [index.astro:pagePath="/news/2026/02/17/section1983-org-launches-free-guide-for-pro-se-plaintiffs/"]

## Side Effects

- None

## Verification

- Run: `npm run build`
