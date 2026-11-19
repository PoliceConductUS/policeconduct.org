# Board Page

## Overview

Static Astro page for the route `/about/board/`, a placeholder for board information. It has one file, `index.astro`. It passes no `robots` or `lede` prop, calls no data loader, has no form and ships no client script.

## Interface

- Route `/about/board/`, a static page with no `getStaticPaths`. [index.astro:const pagePath = "/about/board/";]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- `PageShell` prop `title` is `Board | PoliceConduct.org`. [index.astro:title="Board | PoliceConduct.org"]
- `PageShell` props `description`, `pagePath` and `canonicalUrl` come from the `pageDescription` and `pagePath` constants. [index.astro:canonicalUrl={pagePath}]
- `PageShell` prop `structuredData` is a `buildWebPage` object built from `siteUrl`, `pageUrl`, `name` and `description`. [index.astro:const structuredData = buildWebPage({]
- `PageShell` prop `breadcrumbs` has two entries: `About` linking to `/about/`, then `Board` marked `current`. [index.astro:{ label: "Board", href: pagePath, current: true }]
- `PageShell` prop `heading` is `Board`. [index.astro:heading="Board"]
- The body is a single placeholder paragraph. [index.astro:Content coming soon.]

## Invariants

- The site URL comes from `getSiteUrl(Astro.site)` and the page URL is `pagePath` resolved against it. [index.astro:const pageUrl = new URL(pagePath, siteUrl).toString();]
- The structured-data `name` is the same string as the `title` prop. [index.astro:name: "Board | PoliceConduct.org",]
- The parent breadcrumb points to the about page. [index.astro:{ label: "About", href: "/about/" }]

## Side Effects

- None

## Verification

- Run: `npm run build`
