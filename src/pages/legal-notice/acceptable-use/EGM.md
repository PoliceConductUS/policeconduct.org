# Acceptable Use Policy Page

## Overview

Static Astro page for the route `/legal-notice/acceptable-use/`: the acceptable use policy text. It has one file, `index.astro`. It passes no `canonicalUrl`, `robots` or `lede` prop to `PageShell`, calls no data loader, has no form and ships no client script.

## Interface

- Route `/legal-notice/acceptable-use/`, a static page with no `getStaticPaths` and no route parameters. [index.astro:const pagePath = "/legal-notice/acceptable-use/";]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- `PageShell` prop `title` is the literal `Acceptable Use | PoliceConduct.org`. [index.astro:title="Acceptable Use | PoliceConduct.org"]
- `PageShell` prop `description` is the `pageDescription` constant defined in the frontmatter. [index.astro:description={pageDescription}]
- `PageShell` prop `pagePath` is the `pagePath` constant. [index.astro:pagePath={pagePath}]
- `PageShell` prop `structuredData` is a `buildWebPage` object built from `siteUrl`, `pageUrl`, `name` and `description`. [index.astro:const structuredData = buildWebPage({]
- `PageShell` prop `breadcrumbs` has two entries: `Legal Notice` linking to `/legal-notice/`, then `Acceptable Use Policy` marked `current`. [index.astro:{ label: "Acceptable Use Policy", href: pagePath, current: true }]
- `PageShell` prop `heading` is `ACCEPTABLE USE POLICY`. [index.astro:heading="ACCEPTABLE USE POLICY"]
- The body is static policy text placed in the default slot; it shows a last-updated date of January 14, 2026. [index.astro:January 14, 2026]
- The text links to the terms of service page. [index.astro:href="/legal-notice/terms-of-service/"]
- The text links to the community guidelines page. [index.astro:href="/legal-notice/community-guidelines/"]
- The text links to the site root. [index.astro:href="/"]

## Invariants

- The site URL comes from `getSiteUrl(Astro.site)` and the page URL is `pagePath` resolved against it. [index.astro:const pageUrl = new URL(pagePath, siteUrl).toString();]
- The structured-data `name` is the same string as the `title` prop. [index.astro:name: "Acceptable Use | PoliceConduct.org",]
- The structured-data `description` and the `description` prop both use `pageDescription`. [index.astro:description: pageDescription,]
- The parent breadcrumb points to the legal notices index. [index.astro:{ label: "Legal Notice", href: "/legal-notice/" }]

## Side Effects

- None

## Verification

- Run: `npm run test:e2e`
