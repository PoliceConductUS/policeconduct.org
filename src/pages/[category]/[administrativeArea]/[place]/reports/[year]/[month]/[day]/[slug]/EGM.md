# Report detail page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/reports/[year]/[month]/[day]/[slug]/`. It reloads one report by slug, checks required fields, builds schema.org structured data, and renders the report facts, narrative, people involved, related cases and evidence links inside `PageShell`.

## Interface

- Route `/[category]/[administrativeArea]/[place]/reports/[year]/[month]/[day]/[slug]/`; route params: `category`, `administrativeArea`, `place`, `year`, `month`, `day`, `slug`. No props. `[index.astro:const { day, month, slug, year } = Astro.params;]`
- `getStaticPaths()` emits one path per entry of `loadReportSummaries()` (`#src/lib/data/summaries.js`). `category`, `administrativeArea` and `place` come from `parseLocationPathParts(report.locationPath, report.id)` (`#src/lib/data/report-paths.js`); `year`, `month`, `day`, `slug` come from the summary. `[index.astro:category: location.state,]`
- The report is reloaded with `loadReportDetail(slug)` (`#src/lib/report-detail.js`). Only `slug` is used for the load; `year`, `month` and `day` are used to build breadcrumb links. `[index.astro:const data = await loadReportDetail(slug);]`
- `pagePath` is `data.canonicalPath`; it is passed to `PageShell` as both `pagePath` and `canonicalUrl`. This file does not compare the request path with it. `[index.astro:const pagePath = data.canonicalPath;]`
- `PageShell` (`#src/layouts/PageShell.astro`) props: `title` (report title plus ` | PoliceConduct.org`), `description` (`metaDescription`), `pagePath`, `canonicalUrl`, `structuredData`, `breadcrumbs`, `eyebrow="Public report"`, `heading` (report title). `[index.astro:eyebrow="Public report"]`
- Breadcrumbs: Home, then `data.locationBreadcrumbs.state`, `.administrativeArea`, `.place`, `.reports`, then year, month and day links built on `data.locationBreadcrumbs.reports.href`, then the report title. `[index.astro:const reportsBasePath = data.locationBreadcrumbs.reports.href;]`
- `PrefillBootstrap` renders in the default slot. `[index.astro:<PrefillBootstrap />]`
- Header slot: an `EntityActionBar` holding one `PrefillNavButton` to `/about/contact/` with payload `{ whoami: "Subscriber", message }`, where the message names `pagePath`. `[index.astro:Please notify me when this report changes:]`
- Fact list: Incident date (with ` at <time>` when a time is present) and Agency (link to the primary agency) always render. Location, Submitted by, Experience type, Setting, Complaint filed, Case number, Bodycam requested, Charges and Updated render only when their value is present. `[index.astro:<dt>Bodycam requested</dt>]`
- `ReportNarrative` (`#src/components/ReportNarrative.astro`) receives `description={String(data.report.description!)}` and `facts={data.facts}`. `[index.astro:description={String(data.report.description!)}]`
- "People involved" renders one line per entry of `data.officers`: a link to `entry.path` with first name, last name and optional suffix, optional title, optional badge, and a link to the agency `canonicalPath`. The code omits the section when there are no officers, but that case cannot be reached because the page throws first when `data.officers` is empty. `[index.astro:<h3>People involved</h3>]`
- "Related cases" renders one link per entry of `data.relatedCases` (`civilCase.path`, `civilCase.title`); omitted when empty. `[index.astro:<h3>Related cases</h3>]`
- "Records and evidence" renders one link per evidence link. A link with a truthy `getVideoEmbedUrl(link.url)` points to `<canonicalPath>watch/<link.id>/`; any other link points to `link.url` with `target="_blank"` and `rel="noopener noreferrer"`. The section is omitted when there are no evidence links. `[index.astro:{evidenceLinks.length ? (]`
- `ReportDisclaimer` and `RecordDataNotes` (with `recordPath={pagePath}`) render at the end of the page. `[index.astro:<RecordDataNotes recordPath={pagePath} />]`
- Structured data is one `@graph` with `buildWebSite`, `buildContentPageNode` (id `<pageUrl>#webpage`), `buildPublisherOrganization`, one `GovernmentOrganization` node per linked agency, one `Person` node per linked officer, and a `Report` node (id `<pageUrl>#report`). Helpers come from `#src/lib/structured-data.js`. `[index.astro:"@type": "Report",]`
- Subdirectory: [watch](./watch/EGM.md) - watch page for one video evidence link of the report.

## Invariants

- Throws `Report <slug> not found.` when `loadReportDetail` returns nothing. `[index.astro:not found.]`
- Throws when `data.officers` is empty or its first entry has no agency (`is missing a primary agency.`). `[index.astro:is missing a primary agency.]`
- Throws when the primary agency has no slug. `[index.astro:primary agency is missing slug.]`
- Throws when the primary agency has no `canonicalPath`. `[index.astro:primary agency is missing a canonical path.]`
- Throws when `data.report.title` is not a non-blank string. `[index.astro:is missing required title.]`
- The primary agency is always the agency of the first officer entry. `[index.astro:const primaryAgency = data.officers[0]?.agency;]`
- Incident time: a value that starts with `H:MM` or `HH:MM` (later characters are ignored) is shown as a 12-hour time with AM or PM; a missing value, a value that does not match, an hour above 23 or minutes above 59 render nothing. `[index.astro:if (hour24 > 23 || minutes > 59) {]`
- The incident date is formatted with `en-US`, long month, in UTC. `[index.astro:timeZone: "UTC",]`
- The meta description is the report description with HTML tags stripped and whitespace collapsed. A text of 160 characters or fewer is used unchanged. A longer text is cut to at most 160 characters and ended with an ellipsis; the cut moves back to the last space only when that space is after position 40, and trailing punctuation is removed before the ellipsis; the full text stays on the `Report` node. `[index.astro:const truncateForMeta = (text: string, max = 160) => {]`
- When `data.report.description` is not a string or is an empty string, the description falls back to a fixed sentence that includes the report title. `[index.astro:Public record of a reported police experience:]`
- The `Report` node author is always a `Person` named `Anonymous`, and the publisher is `organizationId(siteUrl)`. `[index.astro:name: "Anonymous",]`
- Officer nodes are built only for entries with both `officer` and `path`; agency nodes only for agencies with `name`, `slug` and `canonicalPath`. Both lists are de-duplicated by `@id`. `[index.astro:if (!agency || !agency.name || !agency.slug || !agency.canonicalPath) {]`
- `datePublished`, `dateModified`, `contentLocation` and `about` are added to the `Report` node only when their source value exists. `[index.astro:...(createdAtIso ? { datePublished: createdAtIso } : {}),]`

## Side Effects

- Imports the global stylesheet `#src/styles/civic-ledger.css`. `[index.astro:import "#src/styles/civic-ledger.css";]`
- Build-time data loading only, through `loadReportSummaries()` and `loadReportDetail()`. No writes or network calls in this file; client behaviour is limited to what `PrefillBootstrap` and `PrefillNavButton` provide. `[index.astro:<PrefillBootstrap />]`

## Verification

- Run: `npm run test:e2e`
