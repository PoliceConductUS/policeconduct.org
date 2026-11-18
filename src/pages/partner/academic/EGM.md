# Partner Page: Academic

## Overview

Static Astro page for the route `/partner/academic/`, describing partnership work with academic researchers. It has one file, `index.astro`. It passes no `robots` prop, calls no data loader, has no form and has no page-specific client script.

## Interface

- Route `/partner/academic/`, a static page with no `getStaticPaths`. [index.astro:const pagePath = "/partner/academic/";]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- `PageShell` prop `title` is `Partnerships for Academic Researchers | PoliceConduct.org`. [index.astro:title="Partnerships for Academic Researchers | PoliceConduct.org"]
- `PageShell` props `description`, `pagePath` and `canonicalUrl` come from the `pageDescription` and `pagePath` constants. [index.astro:canonicalUrl={pagePath}]
- `PageShell` prop `structuredData` is a `buildWebPage` object built from `siteUrl`, `pageUrl`, `name` and `description`. [index.astro:const structuredData = buildWebPage({]
- `PageShell` prop `breadcrumbs` has two entries: `Partner` linking to `/partner/`, then `Academic` marked `current`. [index.astro:{ label: "Academic", href: pagePath, current: true }]
- `PageShell` prop `heading` is `For Academic Researchers`, and a `lede` string is passed. [index.astro:heading="For Academic Researchers"]
- The `PrefillBootstrap` component is rendered at the top of the default slot. [index.astro:PrefillBootstrap />]
- The body opens with a summary card of what the project can do now. [index.astro:What we can do now]
- The body has sections on how the project can help, who is a good fit, what help is available now and what partnership looks like. [index.astro:What partnership looks like]
- The page ends with one `PrefillNavButton` labelled `Contact partnerships` with `to="/about/contact/"`. [index.astro:to="/about/contact/"]
- The button `payload` sets `whoami` to `Partner` and a page-specific `message`. [index.astro:whoami: "Partner",]
- The payload `message` is the literal `I am interested in a scoped academic partnership or letter of support.` [index.astro:"I am interested in a scoped academic partnership or letter of support.",]

## Invariants

- The site URL comes from `getSiteUrl(Astro.site)` and the page URL is `pagePath` resolved against it. [index.astro:const pageUrl = new URL(pagePath, siteUrl).toString();]
- The structured-data `name` is the same string as the `title` prop. [index.astro:name: "Partnerships for Academic Researchers | PoliceConduct.org",]
- The parent breadcrumb points to the partner index. [index.astro:{ label: "Partner", href: "/partner/" }]

## Side Effects

- None

## Verification

- Run: `npm run test:e2e`
