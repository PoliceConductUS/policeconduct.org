# About Pages

## Overview

Static pages under `/about/`. `index.astro` is the about page: it explains why the site exists, and it starts the AOS scroll-animation library in a client script. Child directories hold the board, contact and financial reports pages. The about page passes no `robots` or `lede` prop, calls no data loader and has no form.

## Interface

- Route `/about/`, a static page with no `getStaticPaths`. [index.astro:const pagePath = "/about/";]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- `PageShell` prop `title` is `Why PoliceConduct.org Exists | PoliceConduct.org`. [index.astro:title="Why PoliceConduct.org Exists | PoliceConduct.org"]
- `PageShell` props `description`, `pagePath` and `canonicalUrl` come from the `pageDescription` and `pagePath` constants. [index.astro:canonicalUrl={pagePath}]
- `PageShell` prop `structuredData` is a `buildWebPage` object built from `siteUrl`, `pageUrl`, `name` and `description`. [index.astro:const structuredData = buildWebPage({]
- `PageShell` prop `breadcrumbs` has two entries: `Home` linking to `/`, then `About` marked `current`. [index.astro:{ label: "About", href: pagePath, current: true }]
- `PageShell` prop `heading` is `Why PoliceConduct.org exists`. [index.astro:heading="Why PoliceConduct.org exists"]
- The `actions` slot holds two links: one to `/report/new/` and one to `/find-records/`. [index.astro:Fragment slot="actions"]
- The `header` slot holds two introductory paragraphs. [index.astro:Fragment slot="header"]
- The default slot starts with an `aside` summary labelled for assistive technology. [index.astro:aria-label="Public brief summary"]
- The default slot then holds four sections: approach, statement, origin and a closing call to action. [index.astro:about-brief-cta]
- The closing section repeats the links to `/report/new/` and `/find-records/`. [index.astro:about-brief-actions]
- Content blocks carry `data-aos` attributes that the animation library reads. [index.astro:data-aos="fade-up"]
- A bundled client script imports the AOS library and its stylesheet. [index.astro:import "aos/dist/aos.css";]
- Child contract: [board](./board/EGM.md) - Static placeholder page for `/about/board/` with `buildWebPage` structured data.
- Child contract: [contact](./contact/EGM.md) - Static `/about/contact/` page (noindex) with the `contact` form, prefill and session-storage scripts, and submission through `submitJsonForm` with reCAPTCHA.
- Child contract: [financial-reports](./financial-reports/EGM.md) - Static placeholder page for `/about/financial-reports/` with `buildWebPage` structured data.

## Invariants

- AOS is started at most once per document: the script checks a flag on the root element before calling `AOS.init`. [index.astro:if (!document.documentElement.dataset.aosInit) {]
- AOS is disabled when the visitor prefers reduced motion. [index.astro:window.matchMedia("(prefers-reduced-motion: reduce)").matches,]
- AOS runs with a duration of 800 and animates each element once. [index.astro:duration: 800,]
- The site URL comes from `getSiteUrl(Astro.site)` and the page URL is `pagePath` resolved against it. [index.astro:const pageUrl = new URL(pagePath, siteUrl).toString();]
- The structured-data `name` is the same string as the `title` prop. [index.astro:name: "Why PoliceConduct.org Exists | PoliceConduct.org",]

## Side Effects

- In the browser, the client script calls `AOS.init` when the flag is not set. [index.astro:AOS.init({]
- After starting AOS, the script sets `data-aos-init` on the root element to `1`. [index.astro:document.documentElement.dataset.aosInit = "1";]

## Verification

- Run: `npm run test:e2e`
