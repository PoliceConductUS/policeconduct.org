# Site Library (`src/lib`)

## Overview

Shared library code for the Astro site. The files directly in this directory provide the database connection (`db.js`), build-time helpers (release id, route timing, personnel images, sitemap dates), page data assembly for the report detail page, schema.org structured data builders, organization constants, the icon sprite source, metric labels, and small formatting utilities. Subdirectories hold the browser scripts, the coverage report modules, the data loaders, form types and geography data.

## Interface

### Subdirectories

- [client](./client/EGM.md): browser scripts for site behaviour, analytics, consent and form submission.
- [coverage](./coverage/EGM.md): agency coverage measurement, classification, denominators and report.
- [data](./data/EGM.md): database loaders and data contracts.
- [forms](./forms/EGM.md): form prefill types.
- [geo](./geo/EGM.md): state tile and state outline data.

### `agency-status.ts`

- `agencyStatusPresentation(status, date)` returns `{ label, dateLabel, summary }`. `label` is the stored status unchanged, or null. `[agency-status.ts:label: status]`
- `dateLabel` is null for a null or empty date, else the date read as UTC midnight and written as a long `en-US` date. `[agency-status.ts:T00:00:00Z]`
- `summary` joins `Status: <label>.` and `Status date: <dateLabel>.`, each only when present; it is empty when both are missing. `[agency-status.ts:Status date:]`

### `build-timing.ts`

- `timeBuildStep(label, callback)` is async, runs `callback` and returns its result. When route timing is on it logs the elapsed time; when off it calls `callback` with no measurement. `[build-timing.ts:timeBuildStep]`

### `contact-emails.js`

- `contactEmailsForDisplay(value)` is the only export. It trims the field, removes one trailing period, splits on semicolons or commas, trims each piece, drops empty pieces and returns the array. It returns an empty array for null, undefined or an empty string. `[contact-emails.js:contactEmailsForDisplay]`

### `data.js`

- `groupBy(rows, key)` returns a plain object from each distinct `row[key]` to the rows that have it, in input order. `[data.js:groupBy]`
- `mapBy(rows, key)` returns a plain object from `row[key]` to the row. `[data.js:mapBy]`
- `normalizeAgencyHistory(entries)` returns a new array in which each entry's `start_date` and `end_date` are passed through `storedDate` (calendar formatting of a stored `Date` only; no evidence substitution), sorted by start date ascending. `[data.js:normalizeAgencyHistory]`

### `db.js`

- `withDb(fn)` is async. It takes a client from the module's shared `pg` pool, awaits `fn(client)`, returns its result, and releases the client in a `finally` block. `[db.js:withDb]`
- `PgClient` is a JSDoc type for the pool client; the pool is not exported. `[db.js:PgClient]`

### `format.js`

- `formatShortDate(value)` returns a short `en-US` date (for example `Jan 5, 2024`). `[format.js:formatShortDate]`
- `formatLongDate(value)` returns a long `en-US` date (for example `January 5, 2024`). `[format.js:formatLongDate]`

### `icons.ts`

- `IconSymbol` is the type `{ viewBox: string; inner: string }`; `inner` is raw SVG markup. `[icons.ts:IconSymbol]`
- `SocialIconName` is a union of eight names: youtube, facebook, twitter, instagram, tiktok, linkedin, reddit, github. `[icons.ts:SocialIconName]`
- `MetricIconName` is a union of thirteen names: building, calendar, cross, dollar, file, link, map, people, person, pin, scales, shield, weight. `[icons.ts:MetricIconName]`
- `IconId` is the union of `social-<name>`, `metric-<name>` and `chevron-down`. `[icons.ts:IconId]`
- `icons` is a `Record<IconId, IconSymbol>` with one entry per id. It is the source for the icon sprite. `[icons.ts:export const icons]`

### `metric-vocabulary.ts`

- `metricLabels` is a readonly map from metric key to display label (for example `agencies`, `civilCases`, `personnel`, `reports`, `settlements`). `[metric-vocabulary.ts:metricLabels]`
- `MetricAccent` is the type `"blue" | "green" | "purple" | "red"`. `[metric-vocabulary.ts:MetricAccent]`
- `MetricIcon` is a union of the thirteen metric icon names, declared in this file. `[metric-vocabulary.ts:MetricIcon]`
- `MetricLabelKey` is the union of `metricLabels` keys. `[metric-vocabulary.ts:MetricLabelKey]`
- `MetricVisual` is the type `{ accent, icon, label }`. `[metric-vocabulary.ts:MetricVisual]`
- `metricVisuals` is a readonly map from a subset of metric keys to a `MetricVisual`. `[metric-vocabulary.ts:metricVisuals]`

### `news.ts`

- `NewsMeta` is the type `{ badge?, date, description, href, title }`. `[news.ts:NewsMeta]`
- `PAGE_SIZE` is re-exported from `pagination.ts`. `[news.ts:export { PAGE_SIZE }]`
- `loadNewsArticles()` returns the `newsMeta` export of every news metadata module, newest first. It is synchronous. `[news.ts:loadNewsArticles]`
- `formatNewsDate(value)` reads the value as UTC midnight and returns a long `en-US` date. `[news.ts:formatNewsDate]`
- `newsBadgeClassName(badge)` returns `badge bg-secondary rounded-pill` for the badge `Coming Soon`, otherwise `badge bg-dark rounded-pill`. `[news.ts:newsBadgeClassName]`

### `org.ts`

- `ORG_LEGAL_NAME`, `ORG_SHORT_NAME` and `ORG_ALTERNATE_NAME` are strings naming the publishing organization. `[org.ts:ORG_SHORT_NAME]`
- `ORG_EIN` is the organization's tax id string. `[org.ts:ORG_EIN]`
- `ORG_DESCRIPTION` is a one-sentence description of the organization. `[org.ts:ORG_DESCRIPTION]`
- `OrgAddress` is the interface `{ streetAddress, addressLocality, addressRegion, postalCode, addressCountry }`, and `ORG_ADDRESS` is the organization's mailing address in that shape. `[org.ts:OrgAddress]`
- `ORG_ADDRESS_LINE` is the one-line address built from `ORG_ADDRESS`, without the country. `[org.ts:ORG_ADDRESS_LINE]`
- `SocialLink` is the interface `{ href, iconId, label }`. `[org.ts:SocialLink]`
- `ORG_SOCIAL_LINKS` is an array of eight `SocialLink` entries, one per social platform, whose `iconId` values are `social-<name>` icon ids. `[org.ts:ORG_SOCIAL_LINKS]`
- `ORG_SAME_AS` is the array of `href` values from `ORG_SOCIAL_LINKS`, in the same order. `[org.ts:ORG_SAME_AS]`

### `pagination.ts`

- `PAGE_SIZE` is the number 50. `[pagination.ts:PAGE_SIZE = 50]`

### `personnel-photo-files.js`

- `copyPersonnelPhoto(photo, workspace, publicDir)` is async. `photo` is `{ id, personnel_id, workspace_path, sha256, byte_size, content_type }`. It reads the file inside the intake workspace, checks it, writes it to `<publicDir>/img/personnel-photos/<id>.<ext>` and resolves to the URL `/img/personnel-photos/<id>.<ext>`. `[personnel-photo-files.js:copyPersonnelPhoto]`
- `PersonnelPhoto` is a JSDoc type, not a runtime export. `[personnel-photo-files.js:PersonnelPhoto]`

### `personnel-photos.js`

- `stagePersonnelPhotos()` is async and resolves to a `Map` from `personnel_id` to the staged photo URL. The first call reads every photo row and copies each photo into the site's `public` folder; later calls return the same promise. `[personnel-photos.js:stagePersonnelPhotos]`
- `getPersonnelPhotoById(personnelId)` is async and returns the URL for that id, or null. `[personnel-photos.js:getPersonnelPhotoById]`

### `release-id.js`

- `releaseId` is a string: the `RELEASE_ID` environment value when set, otherwise the current git commit SHA. It is computed once at module load. `[release-id.js:releaseId]`

### `report-detail.ts`

- `ReportDetailFacts` is a type with 13 fields, each `string | null`: `submitterRelationship`, `interactionType`, `setting`, `caseNumber`, `complaintFiled`, `bodycamRequested`, `incidentTime`, `feelings`, `charges`, `desiredOutcome`, `whatHappened`, `whatElse`, `purpose`. `[report-detail.ts:ReportDetailFacts]`
- `buildReportFacts(report)` is pure and maps report row columns to `ReportDetailFacts` (for example `how_felt` to `feelings`). `[report-detail.ts:buildReportFacts]`
- `ReportDetailModel` is the type `{ report, facts, canonicalPath, locationBreadcrumbs, officers, evidenceLinks, relatedCases }`. `[report-detail.ts:ReportDetailModel]`
- `loadReportDetail(slug)` is async. It loads one report row by exact `slug` with its officer links, links, and the personnel, agencies and agency-personnel rows linked to that report, and returns a `ReportDetailModel`, or null when no report has that slug. `[report-detail.ts:loadReportDetail]`
- `canonicalPath` comes from `buildReportCanonicalPath` with the report id, incident date, stored location path and slug. `[report-detail.ts:buildReportCanonicalPath]`
- `locationBreadcrumbs` has `state`, `administrativeArea`, `place` and `reports`, each `{ label, href }`; the `place` href is the stored location path and the `reports` href appends `reports/` to it. `[report-detail.ts:locationBreadcrumbs]`
- Each `officers` entry is `{ officer, agencyOfficer, agency, path, badge, ratingOverall }`, one per `review_personnel` row; `agency` gains a `canonicalPath` from `requireAgencyCanonicalPath`. `[report-detail.ts:ReportOfficerEntry]`
- That `canonicalPath` is the agency's joined `location_path.path` plus its stored slug, selected as `canonical_path`. `[report-detail.ts:lp.path || a.slug || '/' as canonical_path]`
- The `path` of an `officers` entry is `/personnel/<slug>/`, built from the personnel row's stored slug. `[report-detail.ts:/personnel/${officerSlug}/]`
- Each `evidenceLinks` entry is `{ id, title, url }`. `[report-detail.ts:EvidenceLink]`
- Each `relatedCases` entry is `{ id, title, path }`, where `id` is the link row id and `path` is `/civil-cases/<slug>/`. `[report-detail.ts:relatedCases]`

### `sitemap-lastmod.js`

- `buildSitemapLastmodMap()` is the only export. It is async and resolves to a `Map` from site URL path to a `Date` holding the latest known change date for that path. `[sitemap-lastmod.js:buildSitemapLastmodMap]`
- Keys for reports: the report detail path and the report archive paths (base, year, month, day) at state, area and place level. `[sitemap-lastmod.js:setReportArchiveLastmods]`
- Keys for agencies: the stored state, area and place location paths and the agency canonical path, which is the agency's joined `location_path.path` plus its stored slug. `[sitemap-lastmod.js:lp.path || a.slug || '/' as canonical_path]`
- Keys for personnel: `/personnel/<slug>/` and the collection key `/personnel/`. `[sitemap-lastmod.js:/personnel/]`
- Keys for civil cases: `/civil-cases/<slug>/`. `[sitemap-lastmod.js:/civil-cases/]`
- Keys for state pages (`/<state code>/`), the federal page `/federal/` and the site root `/`. `[sitemap-lastmod.js:CATEGORY_SLUGS]`

### `structured-data.js`

- `getSiteUrl(site)` returns a `URL`: the given URL, a parsed string, or the default site URL. `[structured-data.js:getSiteUrl]`
- `organizationId(siteUrl)` returns the site root URL plus `#organization`. `[structured-data.js:organizationId]`
- `buildPublisherOrganization(siteUrl)` returns an `Organization` node with name, alternate name, url, description, logo, tax id, nonprofit status, postal address and `sameAs`. `[structured-data.js:buildPublisherOrganization]`
- `buildWebSite(siteUrl)` returns a `WebSite` node whose publisher is a reference to the organization. `[structured-data.js:buildWebSite]`
- The organization's alternate name and the `WebSite` name are both `ORG_ALTERNATE_NAME` from `org.ts`. `[structured-data.js:alternateName: ORG_ALTERNATE_NAME]` `[structured-data.js:name: ORG_ALTERNATE_NAME]`
- `buildWebPage({ siteUrl, pageUrl, name, description, type })` returns a node with `@context`, `@type` (`WebPage` by default), the full `WebSite` node as `isPartOf`, and an optional description. `[structured-data.js:buildWebPage]`
- `buildDataset(siteUrl, options = {})` returns a `Dataset` node with a fixed name, description, keywords, license URL, spatial coverage and measurement technique; `options.pageUrl` sets its `url`, which otherwise is the site root URL. `[structured-data.js:buildDataset]` `[structured-data.js:options.pageUrl || new URL("/", siteUrl).toString()]`
- `buildNewsArticle({ siteUrl, pageUrl, headline, description, datePublished, dateModified, image })` returns a `NewsArticle` node with `@context`; the organization is both publisher and author. `[structured-data.js:buildNewsArticle]`
- `buildContentPageNode({ siteUrl, id, pageUrl, name, description, mainEntityId, type = "WebPage", dateModified })` returns a page node that references the site and its main entity by `@id`. `[structured-data.js:buildContentPageNode]`
- `buildPersonNode({ siteUrl, path, url, name, image, mainEntityOfPageId, deathDate, worksForId })` returns a `Person` node whose `@id` ends in `#person`; `worksForId` adds `worksFor` as a reference to that `@id`. `[structured-data.js:buildPersonNode]`
- `buildGovernmentOrganizationNode({ siteUrl, path, url, name, mainEntityOfPageId, address, email, contactPoint, sameAs, areaServed })` returns a `GovernmentOrganization` node whose `@id` ends in `#organization`. `[structured-data.js:buildGovernmentOrganizationNode]`
- `buildCollectionPage({ siteUrl, pageUrl, name, description, items })` returns a `CollectionPage` node with `@context` and, when items remain, an `ItemList` of `ListItem` entries. `[structured-data.js:buildCollectionPage]`
- `buildItemList(items)` returns null for a missing or empty list, otherwise an `ItemList` holding the items unchanged. `[structured-data.js:buildItemList]`

### `video.ts`

- `getYouTubeVideoId(url)` returns the video id from a `youtu.be` path or the `v` query parameter of a YouTube host, or null. `[video.ts:getYouTubeVideoId]`
- `getVideoEmbedUrl(url)` returns the YouTube embed URL for that id, or null. `[video.ts:getVideoEmbedUrl]`
- `getYouTubeThumbnailUrl(url)` returns the YouTube thumbnail URL for that id, or null. `[video.ts:getYouTubeThumbnailUrl]`
- `VideoLink` is the type `{ id, title, url }`. `[video.ts:VideoLink]`
- `requireWatchVideo(links, id)` returns the first link with that id whose URL yields an embed URL. `[video.ts:requireWatchVideo]`

## Invariants

### `agency-status.ts`, `build-timing.ts`

- No status is normalised or ranked; every stored status is shown verbatim with the same styling. `[agency-status.ts:label: status]`
- Status dates are read and written in UTC; the date string is not validated and nothing is thrown. `[agency-status.ts:timeZone: "UTC"]`
- Route timing is on only when `ROUTE_TIMING` is non-empty after trim, checked on every call. `[build-timing.ts:shouldLogRouteTiming]`
- The timing line is written in a `finally` block, so it appears whether the callback resolves or rejects. `[build-timing.ts:elapsedMs]`

### `contact-emails.js`, `data.js`

- Contact fields are split only on `;` and `,`; there is no format check, de-duplication or sorting, and addresses are not assigned to people. `[contact-emails.js:address.length > 0]`
- `groupBy` skips rows whose key value is falsy. `[data.js:if (!value)]`
- `mapBy` skips nothing; a later row with the same key replaces the earlier one. `[data.js:export const mapBy]`
- `normalizeAgencyHistory` sorts by start date ascending and treats a missing start date as the epoch; errors from `storedDate` propagate. `[data.js:new Date(0)]`

### `db.js`

- Throws at import time when `DATABASE_URL` is unset or empty. `[db.js:DATABASE_URL is required to build the site.]`
- The pool size defaults to 10; a `DATABASE_POOL_MAX` that does not parse to an integer of at least 1 throws at import time. `[db.js:DATABASE_POOL_MAX must be a positive integer]`
- The client is always released; errors from `fn` or the pool propagate with no retry and no transaction handling. `[db.js:client.release()]`

### `format.js`, `icons.ts`, `metric-vocabulary.ts`

- The date formatters throw for a falsy value and for a value that does not parse as a date; they return no placeholder text. `[format.js:Cannot format a missing date.]` `[format.js:Cannot format invalid date]`
- A bare `YYYY-MM-DD` string is formatted in UTC, so a stored calendar date shows on its own day in every time zone. `[format.js:timeZone: "UTC"]`
- The date formatters use the `en-US` locale and the runtime's local time zone. `[format.js:Intl.DateTimeFormat]`
- The `Record<IconId, IconSymbol>` annotation makes the compiler require one entry per icon id; there is no runtime check. `[icons.ts:Record<IconId, IconSymbol>]`
- Icon view boxes are `0 0 24 24` or `0 0 16 16`. `[icons.ts:0 0 16 16]`
- `metricVisuals` keys must be keys of `metricLabels`; this is checked by the compiler only, and some label keys have no visual. `[metric-vocabulary.ts:satisfies Partial]`
- The keys `personnel` and `personnelRecords` share one display label. `[metric-vocabulary.ts:personnelRecords]`

### `news.ts`, `org.ts`, `pagination.ts`

- News articles are found only through the fixed glob of `_metadata.ts` files four folders below `pages/news`. `[news.ts:_metadata.ts]`
- A matched module with no `newsMeta` export is skipped. `[news.ts:Boolean(entry)]`
- News is sorted by the `date` string, descending, by string comparison. `[news.ts:right.date.localeCompare(left.date)]`
- The badge match is exact on `Coming Soon`. `[news.ts:Coming Soon]`
- `ORG_ADDRESS_LINE` and `ORG_SAME_AS` are derived from `ORG_ADDRESS` and `ORG_SOCIAL_LINKS` at module load. `[org.ts:ORG_SOCIAL_LINKS.map]`
- `iconId` is typed as a plain string, so its match to an icon id is not checked by the compiler. `[org.ts:iconId: string]`
- The page size is fixed. `[pagination.ts:PAGE_SIZE]`

### `personnel-photo-files.js`, `personnel-photos.js`

- Throws when `photo.workspace_path` is absolute or resolves outside (or to the root of) the intake workspace. This check runs before any file read. `[personnel-photo-files.js:is outside the intake workspace.]`
- Throws when the content type is not supported or the photo id is not lower-case letters, digits and hyphens. `[personnel-photo-files.js:Invalid personnel photo]`
- Supported content types are `image/webp`, `image/png`, `image/jpeg` and `image/avif`. `[personnel-photo-files.js:image/avif]`
- Throws when the file's byte length or SHA-256 digest differs from the photo row; nothing is written in that case. `[personnel-photo-files.js:hash or size does not match the imported record.]`
- A missing or unreadable source file rejects; there is no fallback. `[personnel-photo-files.js:readFile(filename)]`
- Throws when a photo row exists and `INTAKE_WORKSPACE` is unset or blank. `[personnel-photos.js:INTAKE_WORKSPACE is required for imported personnel photos.]`
- Any query or copy error rejects the whole staging promise; no photo is skipped. `[personnel-photos.js:copyPersonnelPhoto]`
- Staging runs at most once per process while it succeeds; a rejected staging promise is dropped, so the next call starts again. `[personnel-photos.js:photos = undefined;]`
- The map is keyed by `personnel_id`; when rows share an id the last row wins. `[personnel-photos.js:photo.personnel_id]`

### `release-id.js`, `video.ts`

- A non-empty `RELEASE_ID` wins and git is not run. When it is unset and the git command fails, importing the module fails; there is no fallback value. `[release-id.js:execFileSync]`
- `requireWatchVideo` throws when no link has that id with a recognised YouTube URL. `[video.ts:not found on this record.]`
- Only five hosts are recognised: `youtu.be`, `www.youtu.be`, `youtube.com`, `www.youtube.com`, `m.youtube.com`. `[video.ts:m.youtube.com]`
- For the full-domain hosts only the `v` query parameter is used. `[video.ts:searchParams.get("v")]`
- `getYouTubeVideoId` never throws; a URL that does not parse gives null. `[video.ts:Not a video URL.]`

### `report-detail.ts`

- Fact values are kept only when they are non-blank strings; anything else becomes null. `[report-detail.ts:nullableText]`
- The report is looked up by exact slug; a missing report returns null and runs no further queries. `[report-detail.ts:where r.slug = $1]`
- State and area breadcrumb links are the stored `path` of the parent `location_path` rows, not parsed from the report's path. `[report-detail.ts:state_lp.path as state_or_territory_path]`
- Throws when the report row has no id. `[report-detail.ts:Missing id for report row]`
- Throws when the report has no stored location path. `[report-detail.ts:is missing location_path.path.]`
- Throws when the report location has no parent state or administrative-area `location_path` row; breadcrumb links use those rows' stored paths. `[report-detail.ts:is missing state_or_territory_path.]` `[report-detail.ts:is missing administrative_area_path.]`
- Every `assertValue` check, including the name, personnel slug and evidence-link title and url checks, rejects only null or undefined; an empty string passes. The link id and the civil case id, title and slug are first passed through `nullableText`, so a blank value there does throw. `[report-detail.ts:value === null || value === undefined]`
- Throws when the state name is missing. `[report-detail.ts:is missing state_or_territory_name.]`
- Throws when the area name is missing. `[report-detail.ts:is missing administrative_area_name.]`
- Throws when the place name is missing. `[report-detail.ts:is missing place_name.]`
- Throws when the report has no `review_personnel` rows. `[report-detail.ts:has no review_personnel records]`
- Throws when a `review_personnel` row names an agency-personnel row that does not exist. `[report-detail.ts:Missing agency_officer]`
- Throws when an agency-personnel row names a personnel row that does not exist. `[report-detail.ts:Missing officer]`
- Throws when the personnel row has no slug. `[report-detail.ts:Missing slug for officer]`
- Throws when the agency is not found. The agency list holds only agencies linked to the report that have a location path row and an `agency` page payload row. `[report-detail.ts:Missing agency]`
- Throws when a link row has no id. `[report-detail.ts:Missing id for review_links row]`
- A link with a `civil_case_id` is a related case only; every other link is an evidence link only. `[report-detail.ts:civil_case_id]`
- Throws when a link names a civil case that was not found. `[report-detail.ts:Missing civil case]`
- Throws when the linked civil case has no title. `[report-detail.ts:Missing title for civil case]`
- Throws when the linked civil case has no slug. `[report-detail.ts:Missing slug for civil case]`
- Throws when an evidence link has no title. `[report-detail.ts:Missing title for review_links row]`
- Throws when an evidence link has no url. `[report-detail.ts:Missing url for review_links row]`
- `ratingOverall` is `Number(rating_overall)`, or null when that is not a number. A null `rating_overall` therefore becomes 0, not null. `[report-detail.ts:numericRating]`
- Errors thrown by `requireAgencyCanonicalPath` (an agency without location-path-backed URL fields) and by `buildReportCanonicalPath` (a missing slug, a location path that does not end in `/`, or an unusable incident date) are not caught. `[report-detail.ts:requireAgencyCanonicalPath(agency)]` `[report-detail.ts:buildReportCanonicalPath({]`
- `badge` is the badge number, or null when it is empty. `[report-detail.ts:badge_number]`

### `sitemap-lastmod.js`

- The file has no `throw`; every missing or unusable value is skipped. Only database errors reject the promise. `[sitemap-lastmod.js:continue]`
- State page keys come from `US_STATE_TILES` codes, lower-cased, plus `federal`, fixed at module load. `[sitemap-lastmod.js:US_STATE_TILES]` `[sitemap-lastmod.js:FEDERAL_CATEGORY = "federal"]`
- A falsy or invalid date is ignored. `[sitemap-lastmod.js:parseDate]`
- Each key keeps the latest date seen; an entry is replaced only by a strictly later date. `[sitemap-lastmod.js:setCategoryLastmod]`
- A report detail key is set only when the location path, the slug and a usable incident date all exist. The incident date is used as given when it is a `YYYY-MM-DD` string; any other value that parses as a date is written as its UTC date. `[sitemap-lastmod.js:normalizeReportDate]`
- Report archive keys are set only when the location path has exactly three segments. `[sitemap-lastmod.js:parts.length !== 3]`
- Reports need a slug and a location path row. `[sitemap-lastmod.js:r.slug is not null]`
- Report, civil case, agency and personnel collection states are the second segment of the stored location path, lower-cased. The personnel collection state uses the location path of the assigned agency. `[sitemap-lastmod.js:lower(split_part]` `[sitemap-lastmod.js:lower(split_part(lp.path, '/', 2)) as agency_state]`
- An agency date is the latest of its own dates and those of its agency-personnel rows, personnel, linked reports and linked civil cases. `[sitemap-lastmod.js:max_civil_case_updated_at]`
- Agencies need a place, area and state location row and an `agency` page payload row. `[sitemap-lastmod.js:bpp.page_type = 'agency']`
- A personnel detail key needs a slug and at least one agency-personnel row. `[sitemap-lastmod.js:personnelDetailRows]`
- The personnel collection uses every assignment row of each person; the site does not choose one. `[sitemap-lastmod.js:with assignments as (]`
- A civil case date is the later of its updated and created dates. `[sitemap-lastmod.js:civilCaseRows]`
- Civil cases need a slug and a location path row; a case without either gets no key. `[sitemap-lastmod.js:c.slug is not null]`
- A state page gets the latest of that state's agency, personnel, civil case and report dates; a state with no dates gets no key. `[sitemap-lastmod.js:agencyLastmodsByCategory]`
- The `/federal/` page gets the latest date of any `public.federal_agency` row and of any agency with a parent federal agency. `[sitemap-lastmod.js:from public.federal_agency]` `[sitemap-lastmod.js:a.parent_federal_agency_id is not null as is_federal]`
- The root key gets the latest of the personnel collection date, every state page date and the `/federal/` date. `[sitemap-lastmod.js:pathLastmods.get("/personnel/")]` `[sitemap-lastmod.js:...CATEGORY_SLUGS.map((category) => pathLastmods.get(]`

### `structured-data.js`

- `getSiteUrl` falls back to the fixed default site URL for an unparseable or non-string input and never throws. `[structured-data.js:DEFAULT_SITE_URL]`
- `buildPersonNode` throws when both `url` and `path` are falsy. `[structured-data.js:buildPersonNode requires either]`
- `buildGovernmentOrganizationNode` throws when both `url` and `path` are falsy. `[structured-data.js:buildGovernmentOrganizationNode requires either]`
- In both node builders `url` wins over `path`. `[structured-data.js:personUrl]`
- Fixed `@id` suffixes: `#organization`, `#dataset`, `#article`, `#person`. `[structured-data.js:#dataset]`
- The publisher is always a reference by `@id`, never an inline node. `[structured-data.js:organizationId(siteUrl)]`
- `@context` is added only by `buildWebPage`, `buildNewsArticle` and `buildCollectionPage`. `[structured-data.js:@context]`
- Optional fields are omitted when missing, never filled with placeholder values. `[structured-data.js:data.description]`
- In `buildNewsArticle`, `dateModified` falls back to `datePublished`. `[structured-data.js:dateModified || datePublished]`
- `contactPoint` and `sameAs` are added only for non-empty arrays. `[structured-data.js:contactPoint.length]`
- Collection items without `href` or `name` are dropped; positions are 1-based after filtering. `[structured-data.js:position: index + 1]`
- The dataset license always points at `/legal-notice/terms-of-service/`. `[structured-data.js:/legal-notice/terms-of-service/]`
- The organization's nonprofit status and logo path are fixed. `[structured-data.js:Nonprofit501c3]`

## Side Effects

### Database

- `db.js` imports `dotenv/config`, which loads a `.env` file into `process.env` at import. `[db.js:dotenv/config]`
- `db.js` reads `DATABASE_URL` and `DATABASE_POOL_MAX` once at module load. `[db.js:DATABASE_POOL_MAX]`
- `db.js` creates one shared `pg` pool at import time with `allowExitOnIdle`, a 30-second idle timeout and the pool maximum. `[db.js:allowExitOnIdle]`
- `db.js` opens connections to the PostgreSQL server when `withDb` is called; it issues no SQL itself. `[db.js:pool.connect()]`
- `report-detail.ts` reads, and never writes, `public.reviews`. `[report-detail.ts:public.reviews]`
- `report-detail.ts` reads `public.location_path`. `[report-detail.ts:public.location_path]`
- `report-detail.ts` reads `public.review_personnel`. `[report-detail.ts:public.review_personnel]`
- `report-detail.ts` reads `public.review_links` joined to `public.civil_cases`. `[report-detail.ts:public.review_links]`
- `report-detail.ts` reads the `public.personnel` rows linked to the report. `[report-detail.ts:select o.*]`
- `report-detail.ts` reads the `public.agency` rows linked to the report, joined to `public.build_page_payload`. `[report-detail.ts:public.build_page_payload]`
- `report-detail.ts` reads the `public.agency_personnel` rows linked to the report. `[report-detail.ts:public.agency_personnel]`
- Each of those three queries filters by the report id through `public.review_personnel`. `[report-detail.ts:where rp.review_id = $1]`
- `sitemap-lastmod.js` runs six read-only queries inside one `withDb` call. `[sitemap-lastmod.js:withDb]`
- `sitemap-lastmod.js` reads `public.reviews`. `[sitemap-lastmod.js:public.reviews]`
- `sitemap-lastmod.js` reads `public.location_path`. `[sitemap-lastmod.js:public.location_path]`
- `sitemap-lastmod.js` reads `public.agency`. `[sitemap-lastmod.js:public.agency a]`
- `sitemap-lastmod.js` reads `public.build_page_payload`. `[sitemap-lastmod.js:public.build_page_payload]`
- `sitemap-lastmod.js` reads `public.agency_personnel`. `[sitemap-lastmod.js:public.agency_personnel]`
- `sitemap-lastmod.js` reads `public.personnel`. `[sitemap-lastmod.js:public.personnel]`
- `sitemap-lastmod.js` reads `public.review_personnel`. `[sitemap-lastmod.js:public.review_personnel]`
- `sitemap-lastmod.js` reads `public.civil_case_personnel`. `[sitemap-lastmod.js:public.civil_case_personnel]`
- `sitemap-lastmod.js` reads `public.civil_cases`. `[sitemap-lastmod.js:public.civil_cases]`
- `sitemap-lastmod.js` reads `public.federal_agency`. `[sitemap-lastmod.js:public.federal_agency]`
- `personnel-photos.js` reads `public.personnel_photo` through `withDb`. `[personnel-photos.js:public.personnel_photo]`

### Environment, files and processes

- `build-timing.ts` reads `ROUTE_TIMING`. `[build-timing.ts:ROUTE_TIMING]`
- `build-timing.ts` writes a `route-timing` line with `console.info` when timing is on. `[build-timing.ts:route-timing]`
- `personnel-photo-files.js` reads the photo file from the intake workspace. `[personnel-photo-files.js:node:fs/promises]`
- `personnel-photo-files.js` creates the destination folder and writes the photo under `img/personnel-photos` in the public directory, replacing any existing file. `[personnel-photo-files.js:writeFile(destination, bytes)]`
- `personnel-photo-files.js` computes a SHA-256 digest. `[personnel-photo-files.js:createHash("sha256")]`
- `personnel-photos.js` reads `INTAKE_WORKSPACE`. `[personnel-photos.js:process.env.INTAKE_WORKSPACE]`
- `personnel-photos.js` writes photos under the `public` folder of the working directory. `[personnel-photos.js:path.join(process.cwd(), "public")]`
- `personnel-photos.js` holds the staging promise in module-level state. `[personnel-photos.js:let photos]`
- `release-id.js` reads `RELEASE_ID` at module load. `[release-id.js:process.env.RELEASE_ID]`
- `release-id.js` runs `git rev-parse HEAD` as a synchronous child process at module load when `RELEASE_ID` is not set. `[release-id.js:rev-parse]`
- `news.ts` imports every matching news metadata module eagerly through `import.meta.glob`. `[news.ts:import.meta.glob]`

### Pure files

- `agency-status.ts` has no imports, input, output or module state. `[agency-status.ts:export const agencyStatusPresentation]`
- `contact-emails.js` has no imports, input, output or module state. `[contact-emails.js:export const contactEmailsForDisplay]`
- `data.js` does not change its inputs and has no input, output or module state. `[data.js:storedDate]`
- `format.js` has no imports, input, output or module state. `[format.js:value instanceof Date]`
- `icons.ts` is static data and types. `[icons.ts:chevron-down]`
- `metric-vocabulary.ts` is static data and types. `[metric-vocabulary.ts:as const]`
- `org.ts` is static constants; its URLs are data and no network call is made. `[org.ts:addressCountry]`
- `pagination.ts` is one constant. `[pagination.ts:export const PAGE_SIZE]`
- `structured-data.js` builds new objects from its arguments and the `org` constants, with no input, output or mutable state. `[structured-data.js:#src/lib/org.js]`
- `video.ts` only builds URL strings and makes no network call. `[video.ts:https://www.youtube.com/embed/]`

## Verification

- Run: `npm run test:contacts` (`tests/unit/contact-emails.test.mjs` covers `contact-emails.js`)
- Run: `npm run test:media` (`scripts/video.test.mjs` covers `video.ts`; `scripts/personnel-photos.test.mjs` covers `personnel-photo-files.js`)
- Run: `npm run test:data` (`scripts/report-detail.test.mjs` covers `report-detail.ts` and `video.ts`)
- Run: `npm run test:redirects` (`scripts/generate-redirect-map.test.mjs` copies the real `video.ts` into its fixture; it replaces `db.js` with a stub, so it does not test `db.js`)
- Run: `npm run test:annotations` (`tests/unit/data-annotations.test.mjs` covers `normalizeAgencyHistory` in `data.js`)
- Run: `npm run test:e2e` (specs under `tests/e2e/` use `withDb` from `db.js`; `tests/e2e/agency-status-presentation.spec.ts` covers `agency-status.ts`)
