# Frequently Asked Questions page

## Overview

Static Astro page for the route `/frequently-asked-questions/`. It renders fixed questions and answers from one in-file array as Bootstrap accordions grouped under eleven headings, and publishes the same questions as `FAQPage` structured data. It loads no data.

## Interface

- Route `/frequently-asked-questions/`, from `index.astro`; no `getStaticPaths` and no route params. `[index.astro:const pagePath = "/frequently-asked-questions/";]`
- Layout: `PageShell` from `#src/layouts/PageShell.astro`, with props `title`, `description`, `pagePath`, `canonicalUrl`, `structuredData`, `breadcrumbs` and `heading`. No `lede` is passed. `[index.astro:import PageShell from "#src/layouts/PageShell.astro";]`
- Page metadata: title `FAQ | PoliceConduct.org`; the canonical URL is the page path. `[index.astro:title="FAQ | PoliceConduct.org"]`
- `faqSections`: an in-file array of eleven `FaqSection` objects (`title`, `accordionId`, `entries`). Each `FaqEntry` has `id`, `question`, `answerHtml` and an optional `open: true`; there are 44 entries, one per accordion item. `[index.astro:const faqSections: FaqSection[] = []` `[index.astro:open?: true;]`
- Structured data: `buildWebPage({ siteUrl, pageUrl, name, description, type: "FAQPage" })`, with `siteUrl` from `getSiteUrl(Astro.site)` (both from `#src/lib/structured-data.js`). `[index.astro:type: "FAQPage",]`
- `structuredData.mainEntity` is set to one `Question` per entry across all sections, in page order, each with an `acceptedAnswer` of type `Answer` whose `text` is `answerHtml` with its tags removed. `[index.astro:.flatMap((section) => section.entries)]` `[index.astro:text: toPlainText(entry.answerHtml),]`
- Breadcrumbs: `Home` (`/`) then `Frequently Asked Questions` (current). `[index.astro:label: "Frequently Asked Questions",]`
- Body: one group heading per section, each followed by one accordion whose id is the section `accordionId`: `faqAccordionOverview`, `faqAccordionTracking`, `faqAccordionStandards`, `faqAccordion`, `faqAccordionScope`, `faqAccordionEvidence`, `faqAccordionWitnesses`, `faqAccordionLegal`, `faqAccordionIntegrity`, `faqAccordionDonations`, `faqAccordionProcess`. Every accordion except the last has `mb-5`. `[index.astro:id={section.accordionId}]` `[index.astro:accordionId: "faqAccordionProcess",]`
- Each accordion item is rendered from its entry: an `h2.accordion-header` with id `id`, and a button that carries `data-bs-toggle="collapse"` and a `data-bs-target` pointing at the panel with id `${id}Panel`. The answer is inserted with `set:html`. `[index.astro:data-bs-target={`#${entry.id}Panel`}]` `[index.astro:set:html={entry.answerHtml}]`
- One answer contains a link to `/donate/`. `[index.astro:<a href="/donate/">policeconduct.org/donate</a>]`
- The layout and the structured-data helpers are the only imports: no components from `src/components/`, no loaders, no forms, no script in this file and no page-local styles. The accordion collapse behaviour depends on Bootstrap data attributes handled outside this file. `[index.astro:data-bs-toggle="collapse"]`

## Invariants

- `faqSections` is the only place each question and answer is written: the accordion markup and the structured data are both generated from it, so the structured-data answer is the visible answer as plain text. `[index.astro:faqSections.map((section, sectionIndex) => (]`
- Group headings and accordion headers are both `h2`; group headings use `ipc-section-title`. `[index.astro:<h2 class="ipc-section-title text-uppercase text-muted mb-3">]`
- An entry with `open: true` is rendered open (`collapse show`, `aria-expanded="true"`); all others are collapsed. In every section except `faqAccordionProcess` the first entry has `open: true`; the single entry in `faqAccordionProcess` has none. `[index.astro:? "accordion-collapse collapse show"]`
- Every panel names its section accordion in `data-bs-parent`, so opening one item closes the others in the same group. `[index.astro:data-bs-parent={`#${section.accordionId}`}]`
- `pagePath` is the single source for the `pagePath` prop, the `canonicalUrl` prop, the breadcrumb `href` and the structured-data `pageUrl`. `[index.astro:canonicalUrl={pagePath}]`
- The description is the same literal in the `description` prop and in the structured data. `[index.astro:description="Frequently asked questions about PoliceConduct.org."]`

## Side Effects

- None

## Verification

- Run: `npm run build`
- Run: `npm run test:e2e` (`tests/e2e/content-pages-smoke.spec.ts` loads this page and checks its `h1`). [../../../tests/e2e/content-pages-smoke.spec.ts:path: "/frequently-asked-questions/",]
- Run: `npm run test:client` (its `scripts/public-claims.test.mjs` renders this page and checks its text for unsupported verification claims and that the `FAQPage` structured data has answers). [../../../scripts/public-claims.test.mjs:if (page === "frequently-asked-questions") {]
