# Financial Reports Page

## Overview

Static Astro page for the route `/about/financial-reports/`, a placeholder for financial reports. It has one file, `index.astro`. It passes no `robots` or `lede` prop, calls no data loader, has no form and ships no client script.

## Interface

- Route `/about/financial-reports/`, a static page with no `getStaticPaths`. [index.astro:const pagePath = "/about/financial-reports/";]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- `PageShell` prop `title` is `Financial Reports | PoliceConduct.org`. [index.astro:title="Financial Reports | PoliceConduct.org"]
- `PageShell` props `description`, `pagePath` and `canonicalUrl` come from the `pageDescription` and `pagePath` constants. [index.astro:canonicalUrl={pagePath}]
- `PageShell` prop `structuredData` is a `buildWebPage` object built from `siteUrl`, `pageUrl`, `name` and `description`. [index.astro:const structuredData = buildWebPage({]
- `PageShell` prop `breadcrumbs` has two entries: `About` linking to `/about/`, then `Financial Reports` marked `current`. [index.astro:{ label: "Financial Reports", href: pagePath, current: true }]
- `PageShell` prop `heading` is `Financial Reports`. [index.astro:heading="Financial Reports"]
- The body is a single placeholder paragraph. [index.astro:Content coming soon.]

## Invariants

- The site URL comes from `getSiteUrl(Astro.site)` and the page URL is `pagePath` resolved against it. [index.astro:const pageUrl = new URL(pagePath, siteUrl).toString();]
- The structured-data `name` is the same string as the `title` prop. [index.astro:name: "Financial Reports | PoliceConduct.org",]
- The parent breadcrumb points to the about page. [index.astro:{ label: "About", href: "/about/" }]

## Side Effects

- None

## Verification

- Run: `npm run build`
