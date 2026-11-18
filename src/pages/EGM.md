# Pages (route root)

## Overview

`src/pages/` is the Astro route root: every file and directory here becomes a route of the site. Two files sit directly in this directory: `index.astro`, the home page at `/`, and `404.astro`, the not-found page at `/404/`. All other routes live in the subdirectories listed at the end of the Interface section.

## Interface

### `index.astro` (home page)

- Route `/`; no `getStaticPaths` and no route params. `[index.astro:const pagePath = "/";]`
- Layout: `SiteLayout` from `#src/layouts/SiteLayout.astro` (not `PageShell`), with props `title`, `description`, `pagePath`, `socialImage` and `structuredData`. The page supplies its own `main#main`, has no breadcrumbs and passes no `canonicalUrl`. `[index.astro:import SiteLayout from "#src/layouts/SiteLayout.astro";]`
- Page metadata: title `A Civic Record for Police Experiences | PoliceConduct.org`; social image `/img/webp/usa-1778524_1280.webp`. `[index.astro:title="A Civic Record for Police Experiences | PoliceConduct.org"]`
- Loaders, called together with `Promise.all`: `loadFederalAgencySummaries()` (`#src/lib/data/federal-agencies.js`), `loadLocationBuildPayloads()` (`#src/lib/data/build-payloads.js`) and `loadHomepageNews()` (`#src/lib/data/coverage.js`). `[index.astro:const [federalAgencies, locationPayloads, homepageNews] = await Promise.all([]`
- `categoryCoverageStats`: one entry per item of `US_STATE_TILES` (`#src/lib/geo/states.js`), each `{ code, count, href, hoverLabel }`. `[index.astro:const categoryCoverageStats = US_STATE_TILES.map((state) => {]`
- Component: `CoverageLinks` from `#src/components/CoverageLinks.astro`, with the prop `links` set to the home page news. `[index.astro:<CoverageLinks links={homepageNews} />]`
- Component: `UsaChoroplethMap` from `#src/components/UsaChoroplethMap.astro`, with props `stats`, `title`, `subtitle`, `emptyLabel`, `interactionLabel` and `federalPanel`. `[index.astro:<UsaChoroplethMap]`
- `federalPanel` is `{ title, value, description, items, actionHref, actionLabel }`: `value` is the number of federal agencies, `items` is one `{ label, href }` per federal agency, and `actionHref` is `/federal/`. `[index.astro:value: federalAgencies.length,]`
- Structured data: an array of four objects in this order: the web page, the introduction video, the publisher organization and the dataset. `[index.astro:const structuredData = []`
- The web page object comes from `buildWebPage` with `name` set to `ORG_LEGAL_NAME` (`#src/lib/org.js`); its `mainEntity` points at the organization `@id`. `[index.astro:webPage.mainEntity = { "@id": organization["@id"] };]`
- The organization comes from `buildPublisherOrganization(siteUrl)` and the dataset from `buildDataset(siteUrl, { pageUrl })` (both `#src/lib/structured-data.js`); each is spread into an object with the schema.org `@context`. `[index.astro:{ "@context": schemaContext, ...buildDataset(siteUrl, { pageUrl }) },]`
- `introductionVideo`: a `VideoObject` with `name`, `description`, `embedUrl` (from `getVideoEmbedUrl`, `#src/lib/video.js`), `thumbnailUrl`, `uploadDate`, `duration`, `inLanguage` and `publisher`. It is also the source of the `iframe` `src` and `title` and of the paragraph under the video. `[index.astro:"@type": "VideoObject",]`
- Sections, in order: hero (`#top`), `CoverageLinks`, `#introduction` (video), `#overview` (map), `#use-record`, `#broken`, `#mission`, and a closing contact block. `[index.astro:<section class="py-vh-3 bg-light border-top border-dark" id="overview">]`
- Hero: a `picture` with a 640-wide source for narrow screens and a 1280-wide eager image with `fetchpriority="high"`, and two buttons to `/report/new/` and `/find-records/`. `[index.astro:fetchpriority="high"]`
- Internal links: `/report/new/`, `/find-records/`, `/data-and-methods/`, `/partner/`, `/about/`, `/about/contact/` and `/donate/`. `[index.astro:<a class="btn btn-outline-light btn-xl rounded-0" href="/donate/">]`
- Client script (bundled module): imports `aos` and its stylesheet and calls `AOS.init`; elements opt in with `data-aos` attributes. `[index.astro:import AOS from "aos";]`
- Page-local styles: `.home-hero-panel`, `.home-hero-image` and `.home-mission-image`. `[index.astro:.home-mission-image {]`
- No forms; the only interactive elements are links, the map component and the video frame. `[index.astro:allowfullscreen]`

### `404.astro` (not-found page)

- Route `/404/`; no `getStaticPaths`, no route params, no loaders and no frontmatter logic beyond the import. `[404.astro:pagePath="/404/"]`
- Layout: `PageShell` from `#src/layouts/PageShell.astro`, with props `title`, `description`, `pagePath`, `canonicalUrl`, `robots`, `breadcrumbs`, `heading` and `lede`. No `structuredData` prop is passed. `[404.astro:import PageShell from "#src/layouts/PageShell.astro";]`
- Page metadata: title `Page Not Found | PoliceConduct.org`, canonical URL `/404/`. `[404.astro:title="Page Not Found | PoliceConduct.org"]`
- Breadcrumbs: `Home` (`/`) then `Page not found` (current). `[404.astro:{ label: "Page not found", href: "/404/", current: true },]`
- Slot `actions` of `PageShell`: three links, to `/`, to `/find-records/` (`#find-records-link`) and to `/about/contact/` (`#report-issue-link`). `[404.astro:<Fragment slot="actions">]`
- Inline client script (`is:inline`), first block: sets `data-issue-message` on `#report-issue-link` to a message that holds the full address that was not found. `[404.astro:link.setAttribute("data-issue-message", message);]`
- Inline client script, second block: takes search words from the address that was not found and rewrites `#find-records-link` to `/find-records/?q=<words>`, with link text that quotes the words. `[404.astro:findLink.setAttribute(]`
- The layout is the only import: no components from `src/components/`, no forms and no page-local styles. `[404.astro:</PageShell>]`

### Subdirectories

- `[category]`: [./[category]/EGM.md](./[category]/EGM.md)
- `about`: [./about/EGM.md](./about/EGM.md)
- `agency`: [./agency/EGM.md](./agency/EGM.md)
- `civil-cases`: [./civil-cases/EGM.md](./civil-cases/EGM.md)
- `data-and-methods`: [./data-and-methods/EGM.md](./data-and-methods/EGM.md) - static page `/data-and-methods/`.
- `data-annotations`: [./data-annotations/EGM.md](./data-annotations/EGM.md) - data notes index pages and their CSV export.
- `donate`: [./donate/EGM.md](./donate/EGM.md) - donation page with Stripe links and a frequency switch.
- `federal`: [./federal/EGM.md](./federal/EGM.md)
- `find-records`: [./find-records/EGM.md](./find-records/EGM.md) - record finder page and its JSON data endpoint.
- `frequently-asked-questions`: [./frequently-asked-questions/EGM.md](./frequently-asked-questions/EGM.md) - FAQ accordions and `FAQPage` structured data.
- `help-center`: [./help-center/EGM.md](./help-center/EGM.md) - static report-writing guidance.
- `legal-notice`: [./legal-notice/EGM.md](./legal-notice/EGM.md)
- `news`: [./news/EGM.md](./news/EGM.md)
- `partner`: [./partner/EGM.md](./partner/EGM.md)
- `personnel`: [./personnel/EGM.md](./personnel/EGM.md)
- `report`: [./report/EGM.md](./report/EGM.md)
- `status`: [./status/EGM.md](./status/EGM.md) - submission status lookup page.
- `verify`: [./verify/EGM.md](./verify/EGM.md) - email confirmation page.
- `volunteer`: [./volunteer/EGM.md](./volunteer/EGM.md) - volunteer roles and interest form.

## Invariants

- Home: the build throws `Home map cannot render` when a state has a total count above zero but no route target. `[index.astro:if (totalCount > 0 && !href) {]`
- Home: a state's count is the sum of its `coverage.reports`, `coverage.personnel`, `coverage.agencies` and `coverage.civilCases`; each is zero when the state has no state-level location payload. `[index.astro:reportCount + personnelCount + agencyCount + civilCaseCount;]`
- Home: state context reports do not make a state clickable; only those four coverage counts do. `[index.astro:// state clickable on the home map. Only record coverage counts do.]`
- Home: a state with a zero count has no `href` and the hover label `<state name>: no entries yet`. `[index.astro:: undefined;]`
- Home: state payloads are matched to `US_STATE_TILES` by lower-cased state code, using only payloads with `level === "state"`. `[index.astro:.filter((location) => location.level === "state")]`
- Home: when a state has exactly one child, the map links to that child's `nextPath` if it has one, else to the state's own `path`. `[index.astro:? onlyChild?.nextPath || stateLocation?.path || undefined]`
- Home: the hover label names the only child (`nextLabel` or `label`, plus `nextDetail` in brackets) when its `nextPath` differs from the state path; otherwise it lists the four counts. `[index.astro:? onlyChild?.nextPath && onlyChild.nextPath !== stateLocation?.path]`
- Home: the video embed URL is asserted non-null. `[index.astro:embedUrl: getVideoEmbedUrl("https://www.youtube.com/watch?v=xA6z1L-MG_k")!,]`
- Home: the video `iframe` is lazy-loaded with `referrerpolicy="strict-origin-when-cross-origin"`. `[index.astro:referrerpolicy="strict-origin-when-cross-origin"]`
- Home: `AOS.init` runs once per document, guarded by `data-aos-init` on the root element, with `once: true` and animations disabled for visitors who prefer reduced motion. `[index.astro:window.matchMedia("(prefers-reduced-motion: reduce)").matches,]`
- 404: the page is `noindex,follow`. `[404.astro:robots="noindex,follow"]`
- 404: the search segment is the last path segment that is longer than two characters, contains a letter and is not in the `sectionNames` list. `[404.astro:!sectionNames.includes(part),]`
- 404: `sectionNames` is `404`, `404.html`, `agencies`, `budget`, `civil-cases`, `counties`, `fatal-force-incidents`, `federal`, `liability-costs`, `licensing-authority`, `outcomes-by-income`, `page`, `personnel`, `places` and `reports`; a new site section name must be added here to be skipped. `[404.astro:"outcomes-by-income",]`
- 404: the words are the decoded segment with a trailing six-character hex suffix removed, every run of characters that are not letters or digits turned into a space, trimmed, and cut to 60 characters. `[404.astro:.replace(/-[0-9a-f]{6}$/, "")]`
- 404: the find-records link is left unchanged when there is no usable segment, when decoding fails, or when no words remain. `[404.astro:if (!findLink || !segment) {]`
- 404: the query is passed through `encodeURIComponent`, and the link text is set with `textContent`. `[404.astro:findLink.textContent =]`

## Side Effects

- Home: build-time data loading through `loadFederalAgencySummaries`, `loadLocationBuildPayloads` and `loadHomepageNews`. `[index.astro:loadHomepageNews(),]`
- Home: the browser loads an embedded video `iframe` from the URL returned by `getVideoEmbedUrl`. `[index.astro:src={introductionVideo.embedUrl}]`
- Home: the client script sets `data-aos-init` on the document root. `[index.astro:document.documentElement.dataset.aosInit = "1";]`
- Home: a page-local style rule loads `/img/webp/people15.webp` as a background image. `[index.astro:background-image: url("/img/webp/people15.webp");]`
- 404: the client script changes attributes and text of two links on the page; it makes no network call. `[404.astro:const link = document.getElementById("report-issue-link");]`
- 404: because `#report-issue-link` carries `data-issue-message`, the click handler in `SiteLayout` opens the site feedback widget with that message and cancels the navigation to `/about/contact/` when the widget is available. `[../layouts/SiteLayout.astro:const trigger = target?.closest("[data-issue-message]");]`

## Verification

- Run: `npm run test:e2e`
