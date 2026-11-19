# Partner Pages

## Overview

Static pages under `/partner/`. `index.astro` is the index page: it lists four partnership tracks from a frontmatter array and links to each child page. It passes no `structuredData` or `robots` prop, calls no data loader, has no form and has no page-specific client script.

## Interface

- Route `/partner/`, a static page with no `getStaticPaths`. [index.astro:pagePath="/partner/"]
- The page renders through the `PageShell` layout. [index.astro:import PageShell from "#src/layouts/PageShell.astro";]
- `PageShell` prop `title` is `Partnerships | PoliceConduct.org`. [index.astro:title="Partnerships | PoliceConduct.org"]
- `PageShell` prop `description` is a literal string about current partnership paths. [index.astro:description="Explore current partnership paths]
- `PageShell` prop `canonicalUrl` is `/partner/`. [index.astro:canonicalUrl="/partner/"]
- `PageShell` prop `breadcrumbs` has two entries: `Home` linking to `/`, then `Partner` marked `current`. [index.astro:{ label: "Partner", href: "/partner/", current: true }]
- `PageShell` prop `heading` is `Partner with PoliceConduct.org`, and a `lede` string is passed. [index.astro:heading="Partner with PoliceConduct.org"]
- The `PrefillBootstrap` component is rendered at the top of the default slot. [index.astro:PrefillBootstrap />]
- A card holds one `PrefillNavButton` labelled `Contact partnerships` with `to="/about/contact/"`. [index.astro:to="/about/contact/"]
- The button `payload` sets `whoami` to `Partner` and a message about discussing a partnership. [index.astro:"I want to discuss a partnership with PoliceConduct.org.",]
- The same card tells visitors they may write by email instead. [index.astro:Prefer email?]
- The frontmatter defines `partnerTracks`, an array of four objects with `slug`, `title`, `summary` and `badge`. [index.astro:const partnerTracks = []
- The page renders one card per track with the badge, the linked title and the summary. [index.astro:{partnerTracks.map((track) => (]
- Each card links to `/partner/{slug}/`. [index.astro:href={`/partner/${track.slug}/`}]
- Child contract: [academic](./academic/EGM.md) - Static `/partner/academic/` page for academic researchers with `buildWebPage` structured data and a prefilled link to the contact page.
- Child contract: [law-firm](./law-firm/EGM.md) - Static `/partner/law-firm/` page for law firms with `buildWebPage` structured data and a prefilled link to the contact page.
- Child contract: [media](./media/EGM.md) - Static `/partner/media/` page for newsrooms and investigative reporters with `buildWebPage` structured data and a prefilled link to the contact page.
- Child contract: [nonprofit](./nonprofit/EGM.md) - Static `/partner/nonprofit/` page for nonprofits and advocacy coalitions with `buildWebPage` structured data and a prefilled link to the contact page labelled `Request the partnership proposal`.

## Invariants

- The `partnerTracks` slugs are the child directory names, in the order `media`, `nonprofit`, `academic`, `law-firm`. [index.astro:slug: "law-firm",]
- The `badge` values are `Press`, `Community`, `Research` and `Legal`. [index.astro:badge: "Legal",]

## Side Effects

- None

## Verification

- Run: `npm run test:e2e`
