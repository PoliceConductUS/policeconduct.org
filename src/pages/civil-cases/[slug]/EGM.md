# Civil case detail page (`src/pages/civil-cases/[slug]`)

## Overview

Astro dynamic page for the routes `/civil-cases/{slug}/`. It shows one civil case: its facts, a complaint summary, the personnel and agencies linked to it, related links and a CourtListener notifications panel. The page has no form, no pagination and no client script of its own. The `watch` subdirectory serves the video pages linked from the related links.

## Interface

- Route `/civil-cases/{slug}/`: the case path is built from the slug stored on the loaded case. ``[index.astro:const casePath = `/civil-cases/${data.civilCase.slug}/`;]``
- `getStaticPaths` runs a SQL query through `withDb` from `src/lib/db.js` that selects `slug` from `public.civil_cases`. `[index.astro:from public.civil_cases]`
- The `getStaticPaths` query orders by filed date (newest first), then title. `[index.astro:order by filed_date desc, title]`
- `getStaticPaths` emits one path per case with the single param `slug` and no props. `[index.astro:slug: civilCase.slug,]`
- The only route param is `slug`. `[index.astro:const { slug } = Astro.params;]`
- The render reloads the case with `loadCivilCaseDetailBySlug` from `src/lib/data/civil-litigation-detail.js`. `[index.astro:const data = await loadCivilCaseDetailBySlug(String(slug || ""));]`
- The loaded data is used as `civilCase`, `officers`, `agencies` and `coverageLinks`. `[index.astro:const coverageLinks = data.coverageLinks;]`
- The CourtListener case URL is the first of the primary source URL and the coverage link URLs that matches a CourtListener docket URL pattern. `[index.astro:(url) => url && /^https:\/\/(www\.)?courtlistener\.com\/docket\//i.test(url),]`
- The page description joins, when present: cause number, court, filed date, up to two officer names and up to two agency names. `[index.astro:const pageDescriptionParts = []`
- The description adds ", and others" when there are more than two officers. ``[index.astro:? `Officers: ${formatLabelList(officerNames.slice(0, 2))}${officerNames.length > 2 ? ", and others" : ""}.`]``
- The description adds ", and others" when there are more than two agencies. ``[index.astro:? `Agencies: ${formatLabelList(agencyNames.slice(0, 2))}${agencyNames.length > 2 ? ", and others" : ""}.`]``
- The description is cut to 280 characters at a word boundary and ends with "..." when cut. `[index.astro:280,]`
- Structured data is a schema.org `@graph` built with `buildWebSite`, `buildContentPageNode`, `buildPublisherOrganization`, `buildGovernmentOrganizationNode` and `buildPersonNode` from `src/lib/structured-data.js`. `[index.astro:buildWebSite(siteUrl),]`
- The content page node id is the page URL plus `#webpage`. ``[index.astro:const webpageId = `${pageUrl}#webpage`;]``
- The `LegalCase` node id is the page URL plus `#legalcase`, and it is the main entity of the content page node. ``[index.astro:const legalCaseId = `${pageUrl}#legalcase`;]``
- Each linked officer becomes a person node with the path `/personnel/{slug}/`. ``[index.astro:path: `/personnel/${officer.slug}/`,]``
- Each linked agency becomes a government organization node with the path `agency.canonicalPath`. `[index.astro:path: agency.canonicalPath,]`
- The `LegalCase` node gets `identifier` only when the case has a cause number. `[index.astro:? { identifier: data.civilCase.cause_number }]`
- The `LegalCase` node gets `court` only when the case has a court. `[index.astro:...(data.civilCase.court ? { court: data.civilCase.court } : {}),]`
- The `LegalCase` node gets `sameAs` only when the case has a primary source URL. `[index.astro:? { sameAs: [data.civilCase.primary_source_url] }]`
- The `LegalCase` node gets `about` references only when there is at least one linked officer or agency. `[index.astro:if (officerEntities.length || agencyEntities.length) {]`
- `PageShell` (`src/layouts/PageShell.astro`) receives `title`, `description`, `pagePath`, `canonicalUrl`, `structuredData`, `breadcrumbs`, `eyebrow` and `heading`. `[index.astro:canonicalUrl={casePath}]`
- `PageShell` prop `title` is the case title followed by `| PoliceConduct.org`. ``[index.astro:title={`${caseTitle} | PoliceConduct.org`}]``
- `PageShell` prop `breadcrumbs` is Home, Civil cases (`/civil-cases/`), then the case title. `[index.astro:{ label: caseTitle, href: casePath },]`
- `PageShell` prop `eyebrow` is "Civil case". `[index.astro:eyebrow="Civil case"]`
- The `header` slot renders `EntityActionBar` (`src/components/EntityActionBar.astro`) with one action, "Suggest edit", linking to `/civil-cases/suggest-edit/`. `[index.astro:actions={[{ label: "Suggest edit", href: "/civil-cases/suggest-edit/" }]}]`
- The fact list shows "Cause number" only when present. `[index.astro:<dt>Cause number</dt>]`
- The fact list shows "Court" only when present. `[index.astro:<dt>Court</dt>]`
- The fact list always shows "Filed" using `formatLongDate` from `src/lib/format.js`. `[index.astro:<dd>{formatLongDate(data.civilCase.filed_date)}</dd>]`
- The fact list shows "Closed" only when `date_terminated` is present. `[index.astro:<dd>{formatLongDate(data.civilCase.date_terminated)}</dd>]`
- The fact list shows "Incident location" as a link to `location_path` only when `location_path` is present. `[index.astro:<a href={data.civilCase.location_path}>]`
- The fact list shows "Outcome" only when present. `[index.astro:<dd>{data.civilCase.outcome}</dd>]`
- The fact list shows a "Primary source" link labelled "Open source" only when the case has a primary source URL. `[index.astro:label: "Primary source",]`
- The primary source link opens in a new tab with `rel="noopener noreferrer"`. `[index.astro:<a href={item.href} target="_blank" rel="noopener noreferrer">]`
- Renders `AiComplaintSummary` (`src/components/AiComplaintSummary.astro`) with the prop `summary` when the case has `ai_complaint_summary`. `[index.astro:<AiComplaintSummary summary={data.civilCase.ai_complaint_summary} />]`
- Otherwise renders `ComplaintSummaryUnavailable` (`src/components/ComplaintSummaryUnavailable.astro`) with the prop `unavailability`. `[index.astro:unavailability={data.civilCase.complaint_summary_unavailability}]`
- The "Personnel named in this case" section renders only when there are linked officers; each links to `/personnel/{slug}/` and shows the officer title when present. `[index.astro:<h2>Personnel named in this case</h2>]`
- The "Agencies" section renders only when there are linked agencies; each links to `agency.canonicalPath` and shows city and state when present. `[index.astro:<a href={agency.canonicalPath}>{agency.name}</a>]`
- The "Related links" section renders only when there are coverage links. `[index.astro:<h2>Related links</h2>]`
- A coverage link that `getVideoEmbedUrl` (from `src/lib/video.js`) accepts links to the internal watch page `/civil-cases/{slug}/watch/{link.id}/`. ``[index.astro:? `${casePath}watch/${link.id}/`]``
- Any other coverage link goes to its own URL in a new tab with `rel="noopener noreferrer"`. `[index.astro:getVideoEmbedUrl(link.url) ? undefined : "noopener noreferrer"]`
- The aside "Case notifications" links to the matched CourtListener case URL when one was found. `[index.astro:<a href={courtListenerCaseUrl}>Open this case on CourtListener</a>]`
- When no CourtListener case URL was found, the aside links to the CourtListener home page. `[index.astro:<a href="https://www.courtlistener.com/">]`
- The aside links to the CourtListener alerts help page. `[index.astro:<a href="https://www.courtlistener.com/help/alerts/">]`
- The aside links to `/civil-cases/suggest-edit/`. `[index.astro:<a href="/civil-cases/suggest-edit/">Suggest an edit →</a>]`
- Renders `RecordDataNotes` (`src/components/RecordDataNotes.astro`) with `recordPath` set to the case path. `[index.astro:<RecordDataNotes recordPath={casePath} />]`
- Imports the shared stylesheet `src/styles/civic-ledger.css`. `[index.astro:import "#src/styles/civic-ledger.css";]`
- [Video watch pages (`watch`)](./watch/EGM.md): routes `/civil-cases/{slug}/watch/{videoId}/`.

## Invariants

- The render throws when no case is found for the slug. ``[index.astro:throw new Error(`Civil case ${slug} not found.`);]``
- The render throws when the loaded case has no `filed_date`. ``[index.astro:throw new Error(`Civil case ${data.civilCase.id} is missing filed_date.`);]``
- `location_name` is asserted non-null whenever `location_path` is present. `[index.astro:{data.civilCase.location_name!}]`
- Route identity is carried only by the `slug` param; `getStaticPaths` passes no props. `[index.astro:return civilCases.map((civilCase: { slug: string }) => ({]`
- Page path and canonical URL both come from the loaded case's stored slug. `[index.astro:pagePath={casePath}]`

## Side Effects

- `getStaticPaths` reads the database table `public.civil_cases` through `withDb`. `[index.astro:const civilCases = await withDb(async (client) => {]`
- Each rendered page calls `loadCivilCaseDetailBySlug()`; any data access happens inside that loader. `[index.astro:import { loadCivilCaseDetailBySlug } from "#src/lib/data/civil-litigation-detail.js";]`

## Verification

- Run: `npm run test:e2e`
