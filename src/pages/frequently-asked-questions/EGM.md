# Frequently Asked Questions page

## Overview

Static Astro page for the route `/frequently-asked-questions/`. It renders fixed questions and answers as Bootstrap accordions grouped under eleven headings, and publishes the same questions as `FAQPage` structured data. It loads no data.

## Interface

- Route `/frequently-asked-questions/`, from `index.astro`; no `getStaticPaths` and no route params. `[index.astro:const pagePath = "/frequently-asked-questions/";]`
- Layout: `PageShell` from `#src/layouts/PageShell.astro`, with props `title`, `description`, `pagePath`, `canonicalUrl`, `structuredData`, `breadcrumbs` and `heading`. No `lede` is passed. `[index.astro:import PageShell from "#src/layouts/PageShell.astro";]`
- Page metadata: title `FAQ | PoliceConduct.org`; the canonical URL is the page path. `[index.astro:title="FAQ | PoliceConduct.org"]`
- `faqEntries`: an in-file array of `{ question, answer }` objects (44 entries, one per accordion item) used only for structured data. `[index.astro:const faqEntries = []`
- Structured data: `buildWebPage({ siteUrl, pageUrl, name, description, type: "FAQPage" })`, with `siteUrl` from `getSiteUrl(Astro.site)` (both from `#src/lib/structured-data.js`). `[index.astro:type: "FAQPage",]`
- `structuredData.mainEntity` is set to one `Question` per `faqEntries` item, each with an `acceptedAnswer` of type `Answer`. `[index.astro:structuredData.mainEntity = faqEntries.map((entry) => ({]`
- Breadcrumbs: `Home` (`/`) then `Frequently Asked Questions` (current). `[index.astro:label: "Frequently Asked Questions",]`
- Body: eleven group headings, each followed by one accordion with these ids: `faqAccordionOverview`, `faqAccordionTracking`, `faqAccordionStandards`, `faqAccordion`, `faqAccordionScope`, `faqAccordionEvidence`, `faqAccordionWitnesses`, `faqAccordionLegal`, `faqAccordionIntegrity`, `faqAccordionDonations`, `faqAccordionProcess`. `[index.astro:<div class="accordion" id="faqAccordionProcess">]`
- Each accordion item is hand-written markup: an `h2.accordion-header` with a button that carries `data-bs-toggle="collapse"` and a `data-bs-target` pointing at its panel. `[index.astro:data-bs-target="#faqOverviewWhatPanel"]`
- One answer contains a link to `/donate/`. `[index.astro:<a href="/donate/">policeconduct.org/donate</a> for current ways to]`
- The layout and the structured-data helpers are the only imports: no components from `src/components/`, no loaders, no forms, no script in this file and no page-local styles. The accordion collapse behaviour depends on Bootstrap data attributes handled outside this file. `[index.astro:data-bs-toggle="collapse"]`

## Invariants

- The visible accordion markup is not generated from `faqEntries`: the questions and answers are written twice, once in the array and once in the markup, and must be edited in both places. `[index.astro:What is PoliceConduct.org?]`
- Group headings and accordion headers are both `h2`; group headings use `ipc-section-title`. `[index.astro:<h2 class="ipc-section-title text-uppercase text-muted mb-3">]`
- In every accordion except `faqAccordionProcess` the first item is rendered open (`collapse show`, `aria-expanded="true"`); the single item in `faqAccordionProcess` is rendered collapsed. `[index.astro:class="accordion-collapse collapse show"]`
- Every panel names its own accordion in `data-bs-parent`, so opening one item closes the others in the same group. `[index.astro:data-bs-parent="#faqAccordionProcess"]`
- `pagePath` is the single source for the `pagePath` prop, the `canonicalUrl` prop, the breadcrumb `href` and the structured-data `pageUrl`. `[index.astro:canonicalUrl={pagePath}]`
- The description is the same literal in the `description` prop and in the structured data. `[index.astro:description="Frequently asked questions about PoliceConduct.org."]`

## Side Effects

- None

## Verification

- Run: `npm run build`
