# Personnel topic page (`src/pages/personnel/[slug]/[topic]`)

## Overview

Astro dynamic page for the routes `/personnel/{slug}/{topic}/`. `getStaticPaths` generates only the `reports` and `civil-cases` topics, and only for people who have at least one linked record of that kind. The page shows one metric card and a table of the linked reports or civil cases. The page has no form, no pagination and no client script of its own.

## Interface

- Route `/personnel/{slug}/{topic}/`: the page path is built from the two route params. ``[index.astro:const pagePath = `/personnel/${slug}/${topicKey}/`;]``
- `getStaticPaths` returns an empty list when the environment variable `NO_PERSONNEL` is set to a non-blank value. `[index.astro:if ((process.env.NO_PERSONNEL || "").trim() !== "") {]`
- `getStaticPaths` runs a SQL query through `withDb` from `src/lib/db.js` that returns each personnel `slug` with a distinct report count and a distinct civil case count. `[index.astro:count(distinct ro.review_id) as report_count,]`
- The `getStaticPaths` query inner-joins `public.agency_personnel`, so only personnel with at least one agency assignment are enumerated. `[index.astro:join public.agency_personnel ao]`
- The `getStaticPaths` query left-joins `public.review_personnel` and `public.civil_case_personnel` on the agency assignment id. `[index.astro:left join public.civil_case_personnel cco]`
- A `reports` path is emitted only when the report count is above zero. `[index.astro:if (Number(officer.report_count) > 0) {]`
- A `civil-cases` path is emitted only when the civil case count is above zero. `[index.astro:if (Number(officer.civil_case_count) > 0) {]`
- Each emitted path has the params `slug` and `topic` and no props. `[index.astro:params: { slug: officer.slug, topic },]`
- Route params are `slug` and `topic`. `[index.astro:const { slug, topic } = Astro.params;]`
- The topic configuration (label, description, metric) comes from `personnelTopics` in `src/lib/data/personnel-topic-config.js`. `[index.astro:const topicConfig = personnelTopics[topicKey];]`
- The render reloads the person with a SQL query on `public.personnel` by `slug`. `[index.astro:await client.query("select * from public.personnel where slug = $1", [slug])]`
- The render loads the person's agency assignment ids from `public.agency_personnel`, ordered by id. `[index.astro:where ao.personnel_id = $1]`
- Linked reports are loaded from `public.reviews` joined to `public.review_personnel` and `public.location_path`, for the person's assignment ids, only when the person has assignments. `[index.astro:select distinct r.*, lp.path as location_path]`
- Linked reports are ordered by incident date (newest first), then title. `[index.astro:order by r.incident_date desc, r.title asc]`
- Linked civil cases are loaded from `public.civil_cases` joined to `public.civil_case_personnel`, for the person's assignment ids, only when the person has assignments. `[index.astro:join public.civil_case_personnel cco on cco.civil_case_id = c.id]`
- Linked civil cases are ordered by filed date (newest first), then title. `[index.astro:order by c.filed_date desc, c.title asc]`
- The displayed name joins first name and last name only. `[index.astro:const officerName = [data.officer.first_name, data.officer.last_name]]`
- The page heading is the officer name followed by the topic label. ``[index.astro:const pageTitle = `${officerName} ${topicConfig.label}`;]``
- `PageShell` prop `title` is that heading followed by `| PoliceConduct.org`. ``[index.astro:title={`${pageTitle} | PoliceConduct.org`}]``
- The metric card spreads `topicConfig.metric`, uses the topic description as its detail, and shows the record count formatted for `en-US`, or `--` when the count is zero. `[index.astro:value: countValue ? countValue.toLocaleString("en-US") : "--",]`
- The record count is the civil case count for `civil-cases`, the report count for `reports`, and 0 for any other topic. `[index.astro:topicKey === "civil-cases"]`
- `PageShell` (`src/layouts/PageShell.astro`) receives `title`, `description`, `pagePath`, `canonicalUrl`, `searchable`, `breadcrumbs`, `heading` and `lede`. `[index.astro:canonicalUrl={pagePath}]`
- `PageShell` prop `searchable` is `false`. `[index.astro:searchable={false}]`
- `PageShell` prop `breadcrumbs` is Personnel (`/personnel/`), the officer name (`/personnel/{slug}/`), then the current topic label; it has no Home entry. ``[index.astro:{ label: officerName, href: `/personnel/${slug}/` },]``
- The `actions` slot renders `HelpCollectDataButton` (`src/components/HelpCollectDataButton.astro`) with the props `context` (officer name), `sourcePage` (page path) and `topic` (topic label). `[index.astro:<HelpCollectDataButton]`
- Renders `MetricGrid` (`src/components/MetricGrid.astro`) with the props `metrics` and `columns="four"`. `[index.astro:<MetricGrid metrics={metricCards} columns="four" />]`
- For `reports`, renders `DataPanel` (`src/components/DataPanel.astro`) with a table of report title and incident date. `[index.astro:<th scope="col">Incident Date</th>]`
- Each report title links to the path from `buildReportCanonicalPath` (`src/lib/data/report-paths.js`), which receives `id`, `incidentDate`, `locationPath` and `slug`. `[index.astro:href={buildReportCanonicalPath({]`
- Report incident dates are formatted with `formatShortDate` from `src/lib/format.js`. `[index.astro:<td>{formatShortDate(report.incident_date)}</td>]`
- For `civil-cases`, renders `DataPanel` with a table of case title, filed date and court. `[index.astro:<th scope="col">Filed</th>]`
- Each civil case title links to `/civil-cases/{slug}/`. ``[index.astro:<a href={`/civil-cases/${civilCase.slug}/`}>]``
- The civil case court cell is empty when the case has no court. `[index.astro:<td>{civilCase.court || ""}</td>]`
- For any other topic key the page renders a `DataPanel` holding `SampleMeasurementChart` (`src/components/SampleMeasurementChart.astro`) with the props `ariaLabel` and `rows`, where every row value is a placeholder. `[index.astro:<SampleMeasurementChart]`
- That fallback uses "Current status" rows when the topic key is `salary` and month rows otherwise. `[index.astro:topicKey === "salary"]`

## Invariants

- The render throws when `slug` or `topic` is missing or when `topic` is not a key of `personnelTopics`. ``[index.astro:throw new Error(`Invalid personnel topic route ${slug || ""}/${topic || ""}`);]``
- The render throws when no personnel row matches the slug. ``[index.astro:throw new Error(`Personnel ${slug} not found.`);]``
- Only the `reports` and `civil-cases` topics are ever added to the generated paths. `[index.astro:availableTopics.push("civil-cases");]`
- Reports and civil cases are reached only through the person's `agency_personnel` assignment ids. `[index.astro:where ro.agency_personnel_id = any($1)]`
- Route identity is carried only by the `slug` and `topic` params; `getStaticPaths` passes no props. `[index.astro:return availableTopics.map((topic) => ({]`

## Side Effects

- `getStaticPaths` reads `process.env.NO_PERSONNEL`. `[index.astro:process.env.NO_PERSONNEL]`
- `getStaticPaths` reads the database tables `public.personnel`, `public.agency_personnel`, `public.review_personnel` and `public.civil_case_personnel` through `withDb`. `[index.astro:from public.personnel o]`
- Each rendered page reads `public.personnel`, `public.agency_personnel`, `public.reviews`, `public.review_personnel`, `public.location_path`, `public.civil_cases` and `public.civil_case_personnel` through `withDb`. `[index.astro:const data = await withDb(async (client) => {]`

## Verification

- Run: `npm run build`
