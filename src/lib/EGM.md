# Site Library (`src/lib`)

## Overview

Shared library code for the Astro site. The files directly in this directory provide the database connection (`db.js`), build-time helpers (release id, route timing, entity and personnel images, sitemap dates), page data assembly for the report detail page, schema.org structured data builders, organization constants, the icon sprite source, metric labels, and small formatting and navigation utilities. Subdirectories hold the browser scripts, the coverage report modules, the data loaders, form types and geography data.

## Interface

### Subdirectories

- [client](./client/EGM.md): browser scripts for site behaviour, analytics, consent and form submission.
- [coverage](./coverage/EGM.md): agency coverage measurement, classification, denominators and report.
- [data](./data/EGM.md): database loaders and data contracts.
- [forms](./forms/EGM.md): form prefill types.
- [geo](./geo/EGM.md): state tile and state outline data.

### `agency-status.ts`

- `agencyStatusPresentation(status, date)` returns `{ label, dateLabel, prominence, summary }`. `label` is `Active` or `Inactive` for those words in any case, the raw status for any other non-empty value, and null for a null or empty status. `[agency-status.ts:agencyStatusPresentation]`
- `dateLabel` is null for a null or empty date, else the date read as UTC midnight and written as a long `en-US` date. `[agency-status.ts:T00:00:00Z]`
- `prominence` is `notice` when the label exists and is not `Active`, otherwise `compact`. `[agency-status.ts:prominence]`
- `summary` joins `Status: <label>.` and `Status date: <dateLabel>.`, each only when present; it is empty when both are missing. `[agency-status.ts:Status date:]`

### `alpha-navigation.ts`

- `ALPHA_LETTERS` is the 26 upper-case letters in order. `[alpha-navigation.ts:ALPHA_LETTERS]`
- `buildAlphaPageMap(items, getLabel, pageSize)` returns 26 objects `{ letter, page, endPage }`. `page` is the 1-based page of the first item whose label starts with that letter, or null. `endPage` is the page before the next letter that has a page, or null. `[alpha-navigation.ts:buildAlphaPageMap]`

### `build-timing.ts`

- `timeBuildStep(label, callback)` is async, runs `callback` and returns its result. When route timing is on it logs the elapsed time; when off it calls `callback` with no measurement. `[build-timing.ts:timeBuildStep]`

### `category-collection-stats.ts`

- `CategoryCollectionCounts` is the type `{ agencyCount, personnelCount, reportCount, civilCaseCount }`, all numbers. `[category-collection-stats.ts:CategoryCollectionCounts]`
- `loadCategoryCollectionCounts()` is async. It calls `loadAgencySummaries`, `loadPersonnelSummaries`, `loadReportSummaries` and `loadCivilCaseCountsByAgencyState` in parallel and returns a `Map` from category (lower-cased state code) to the four counts, with missing counts as 0. `[category-collection-stats.ts:loadCategoryCollectionCounts]`
- `buildCategoryCollectionStats(category, categoryLabel, counts)` returns four stat items in fixed order: Agencies (link `/<category>/`), Personnel, Reports (link `/<category>/reports/`), Civil Cases. Each item is `{ label, value, description, href?, actionLabel? }`. `[category-collection-stats.ts:buildCategoryCollectionStats]`

### `contact-emails.js`

- `contactEmailsForDisplay(value)` is the only export. It trims the field, removes one trailing period, splits on semicolons or commas, trims each piece, drops empty pieces and returns the array. It returns an empty array for null, undefined or an empty string. `[contact-emails.js:contactEmailsForDisplay]`

### `data.js`

- `groupBy(rows, key)` returns a plain object from each distinct `row[key]` to the rows that have it, in input order. `[data.js:groupBy]`
- `mapBy(rows, key)` returns a plain object from `row[key]` to the row. `[data.js:mapBy]`
- `normalizeAgencyHistory(entries)` returns a new array in which each entry's `start_date` and `end_date` are replaced through `reportedDate` using evidence from `parseSourceValues(entry.data_source_values)`, sorted by start date ascending. `[data.js:normalizeAgencyHistory]`

### `db.js`

- `withDb(fn)` is async. It takes a client from the module's shared `pg` pool, awaits `fn(client)`, returns its result, and releases the client in a `finally` block. `[db.js:withDb]`
- `PgClient` is a JSDoc type for the pool client; the pool is not exported. `[db.js:PgClient]`

### `entity-images.ts`

- `EntityImageType` is the type `"personnel" | "report" | "state" | "city" | "county" | "place" | "agency"`. `[entity-images.ts:EntityImageType]`
- `getEntityImageById(type, id)` returns the served URL of the image file in the `<base>/<type>/` folder whose file name stem equals `id`, or null. Any string is accepted as `type`. `[entity-images.ts:getEntityImageById]`

### `format.js`

- `formatShortDate(value)` returns a short `en-US` date (for example `Jan 5, 2024`) or the string `Unknown`. `[format.js:formatShortDate]`
- `formatLongDate(value)` returns a long `en-US` date (for example `January 5, 2024`) or the string `Unknown`. `[format.js:formatLongDate]`

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
- `getMetricVisual(key)` returns `metricVisuals[key]`. `[metric-vocabulary.ts:getMetricVisual]`

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

### `prefill.ts`

- `PrefillPayload` is the type `Record<string, unknown>`. `[prefill.ts:PrefillPayload]`
- `setFlashPrefill(key, payload)` stores the payload as JSON in `sessionStorage` and returns `true`, or `false` when storage is unavailable or the write fails. `[prefill.ts:setFlashPrefill]`
- `readAndConsumeFlashPrefill(key)` reads the item, removes it, parses it and returns the object, or null when storage is unavailable, the item is missing, the JSON is invalid, or the value is not a plain object. `[prefill.ts:readAndConsumeFlashPrefill]`

### `release-id.js`

- `releaseId` is a string: the `RELEASE_ID` environment value when set, otherwise the current git commit SHA. It is computed once at module load. `[release-id.js:releaseId]`

### `report-detail.ts`

- `ReportDetailFacts` is a type with 13 fields, each `string | null`: `submitterRelationship`, `interactionType`, `setting`, `caseNumber`, `complaintFiled`, `bodycamRequested`, `incidentTime`, `feelings`, `charges`, `desiredOutcome`, `whatHappened`, `whatElse`, `purpose`. `[report-detail.ts:ReportDetailFacts]`
- `buildReportFacts(report)` is pure and maps report row columns to `ReportDetailFacts` (for example `how_felt` to `feelings`). `[report-detail.ts:buildReportFacts]`
- `ReportDetailModel` is the type `{ report, facts, canonicalPath, locationBreadcrumbs, officers, evidenceLinks, relatedCases }`. `[report-detail.ts:ReportDetailModel]`
- `loadReportDetail(slug)` is async. It loads one report row by exact `slug` with its officer links, links, personnel, agencies and agency-personnel rows and returns a `ReportDetailModel`, or null when no report has that slug. `[report-detail.ts:loadReportDetail]`
- `canonicalPath` comes from `buildReportCanonicalPath` with the report id, incident date, stored location path and slug. `[report-detail.ts:buildReportCanonicalPath]`
- `locationBreadcrumbs` has `state`, `administrativeArea`, `place` and `reports`, each `{ label, href }`; the `place` href is the stored location path and the `reports` href appends `reports/` to it. `[report-detail.ts:locationBreadcrumbs]`
- Each `officers` entry is `{ officer, agencyOfficer, agency, path, badge, ratingOverall }`, one per `review_personnel` row; `agency` gains a `canonicalPath` from `requireAgencyCanonicalPath`. `[report-detail.ts:ReportOfficerEntry]`
- That `canonicalPath` is the agency's `build_page_payload.path`, which `requireAgencyCanonicalPath` returns whenever it is non-blank. `[report-detail.ts:bpp.path as canonical_path]`
- The `path` of an `officers` entry is `/personnel/<slug>/`, built from the personnel row's stored slug. `[report-detail.ts:/personnel/${officerSlug}/]`
- Each `evidenceLinks` entry is `{ id, title, url }`. `[report-detail.ts:EvidenceLink]`
- Each `relatedCases` entry is `{ id, title, path }`, where `id` is the link row id and `path` is `/civil-cases/<slug>/`. `[report-detail.ts:relatedCases]`

### `sitemap-lastmod.js`

- `buildSitemapLastmodMap()` is the only export. It is async and resolves to a `Map` from site URL path to a `Date` holding the latest known change date for that path. `[sitemap-lastmod.js:buildSitemapLastmodMap]`
- Keys for reports: the report detail path and the report archive paths (base, year, month, day) at state, area and place level. `[sitemap-lastmod.js:setReportArchiveLastmods]`
- Keys for agencies: the stored state, area and place location paths and the agency canonical path, which is the `build_page_payload.path` of the agency's `agency` page payload row. `[sitemap-lastmod.js:bpp.path as canonical_path]`
- Keys for personnel: `/personnel/<slug>/` and the collection key `/personnel/`. `[sitemap-lastmod.js:/personnel/]`
- Keys for civil cases: `/civil-cases/<slug>/`. `[sitemap-lastmod.js:/civil-cases/]`
- Keys for state pages (`/<state code>/`) and the site root `/`. `[sitemap-lastmod.js:CATEGORY_SLUGS]`

### `structured-data.js`

- `getSiteUrl(site)` returns a `URL`: the given URL, a parsed string, or the default site URL. `[structured-data.js:getSiteUrl]`
- `organizationId(siteUrl)` returns the site root URL plus `#organization`. `[structured-data.js:organizationId]`
- `buildPublisherOrganization(siteUrl)` returns an `Organization` node with name, alternate name, url, description, logo, tax id, nonprofit status, postal address and `sameAs`. `[structured-data.js:buildPublisherOrganization]`
- `buildWebSite(siteUrl)` returns a `WebSite` node whose publisher is a reference to the organization. `[structured-data.js:buildWebSite]`
- `buildWebPage({ siteUrl, pageUrl, name, description, type })` returns a node with `@context`, `@type` (`WebPage` by default), the full `WebSite` node as `isPartOf`, and an optional description. `[structured-data.js:buildWebPage]`
- `buildDataset(siteUrl, options = {})` returns a `Dataset` node with a fixed name, description, keywords, license URL, spatial coverage and measurement technique; `options.pageUrl` sets its `url`, which otherwise is the site root URL. `[structured-data.js:buildDataset]` `[structured-data.js:options.pageUrl || new URL("/", siteUrl).toString()]`
- `buildNewsArticle({ siteUrl, pageUrl, headline, description, datePublished, dateModified, image })` returns a `NewsArticle` node with `@context`; the organization is both publisher and author. `[structured-data.js:buildNewsArticle]`
- `buildContentPageNode({ siteUrl, id, pageUrl, name, description, mainEntityId, type = "WebPage", dateModified })` returns a page node that references the site and its main entity by `@id`. `[structured-data.js:buildContentPageNode]`
- `buildPersonNode({ siteUrl, path, url, name, image, mainEntityOfPageId, deathDate, worksForId })` returns a `Person` node whose `@id` ends in `#person`. `[structured-data.js:buildPersonNode]`
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

### `agency-status.ts`, `alpha-navigation.ts`, `build-timing.ts`

- Only the exact words active and inactive (any case, no trimming) are normalised; any other status is shown verbatim with `notice` prominence. `[agency-status.ts:toLowerCase]`
- Status dates are read and written in UTC; the date string is not validated and nothing is thrown. `[agency-status.ts:timeZone: "UTC"]`
- A label's letter is its first character after trim and upper-case, and counts only when it is A to Z; other items are ignored. `[alpha-navigation.ts:normalizeLetter]`
- Only the first item for each letter sets that letter's page; items are not sorted here. `[alpha-navigation.ts:byLetter.has(letter)]`
- `endPage` is the following page minus one with no clamp. `[alpha-navigation.ts:followingPage - 1]`
- Route timing is on only when `ROUTE_TIMING` is non-empty after trim, checked on every call. `[build-timing.ts:shouldLogRouteTiming]`
- The timing line is written in a `finally` block, so it appears whether the callback resolves or rejects. `[build-timing.ts:elapsedMs]`

### `category-collection-stats.ts`, `contact-emails.js`, `data.js`

- Agency counts group by `agency.state.toLowerCase()` with no null guard; an agency without a state fails with a runtime error. `[category-collection-stats.ts:agency.state.toLowerCase()]`
- Personnel entries without `agencyState` and reports without `state` are skipped. `[category-collection-stats.ts:entry.agencyState?.toLowerCase()]`
- Civil case counts are taken as given per category, without lower-casing or summing. `[category-collection-stats.ts:civilCaseCountMap]`
- The Reports description is a fixed federal sentence when the category is `federal`. `[category-collection-stats.ts:Reports tied to federal agencies.]`
- A rejection from any of the four loaders rejects the whole call. `[category-collection-stats.ts:Promise.all]`
- Contact fields are split only on `;` and `,`; there is no format check, de-duplication or sorting, and addresses are not assigned to people. `[contact-emails.js:address.length > 0]`
- `groupBy` skips rows whose key value is falsy. `[data.js:if (!value)]`
- `mapBy` skips nothing; a later row with the same key replaces the earlier one. `[data.js:export const mapBy]`
- `normalizeAgencyHistory` sorts by start date ascending and treats a missing start date as the epoch; errors from `parseSourceValues` and `reportedDate` propagate. `[data.js:new Date(0)]`

### `db.js`

- Throws at import time when `DATABASE_URL` is unset or empty. `[db.js:DATABASE_URL is required to build the site.]`
- The pool size defaults to 10; a `DATABASE_POOL_MAX` that does not parse to an integer of at least 1 throws at import time. `[db.js:DATABASE_POOL_MAX must be a positive integer]`
- The client is always released; errors from `fn` or the pool propagate with no retry and no transaction handling. `[db.js:client.release()]`

### `entity-images.ts`, `format.js`, `icons.ts`, `metric-vocabulary.ts`

- Only `.webp`, `.avif`, `.png`, `.jpg` and `.jpeg` files are considered, case-insensitively. `[entity-images.ts:SUPPORTED_EXTENSIONS]`
- Files whose stem is `default`, in any letter case, are excluded. `[entity-images.ts:RESERVED_STEMS.has(stem.toLowerCase())]`
- Entries that are not regular files are skipped. `[entity-images.ts:entry.isFile()]`
- The id match is an exact, case-sensitive match on the file stem. `[entity-images.ts:Object.hasOwn]`
- When two files in one type subfolder share a stem, the first one the directory read returns is used. The returned URL is `<URL base>/<type>/<file name>`. `[entity-images.ts:First match wins]`
- A type subfolder that cannot be read gives an empty result and null lookups, with no error and no log. `[entity-images.ts:Subfolder may be absent]`
- The base directory is `ENTITY_IMAGES_DIR` or `public/img`, resolved from the working directory. `[entity-images.ts:imagesBaseDir]`
- The URL base is `ENTITY_IMAGES_URL_BASE` when set, else the base directory's path under `public`, else `/img`. `[entity-images.ts:resolveUrlBase]`
- The date formatters return the literal `Unknown` for a falsy or invalid value and never throw. `[format.js:"Unknown"]`
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
- Staging runs at most once per process; a rejected promise is kept and not retried. `[personnel-photos.js:photos ??=]`
- The map is keyed by `personnel_id`; when rows share an id the last row wins. `[personnel-photos.js:photo.personnel_id]`

### `prefill.ts`, `release-id.js`, `video.ts`

- Storage is used only when `window` and `window.sessionStorage` exist; otherwise the functions return `false` or null. `[prefill.ts:hasSessionStorage]`
- The stored item is removed before parsing, so a value that fails to parse is still consumed. `[prefill.ts:removeItem]`
- The parsed value must be a non-array object; no field is validated. `[prefill.ts:Array.isArray(parsed)]`
- The prefill functions never throw; storage and JSON errors become `false` or null. `[prefill.ts:_error]`
- A non-empty `RELEASE_ID` wins and git is not run. When it is unset and the git command fails, importing the module fails; there is no fallback value. `[release-id.js:execFileSync]`
- `requireWatchVideo` throws when no link has that id with a recognised YouTube URL. `[video.ts:not found on this record.]`
- Only five hosts are recognised: `youtu.be`, `www.youtu.be`, `youtube.com`, `www.youtube.com`, `m.youtube.com`. `[video.ts:m.youtube.com]`
- For the full-domain hosts only the `v` query parameter is used. `[video.ts:searchParams.get("v")]`
- `getYouTubeVideoId` never throws; a URL that does not parse gives null. `[video.ts:Not a video URL.]`

### `report-detail.ts`

- Fact values are kept only when they are non-blank strings; anything else becomes null. `[report-detail.ts:nullableText]`
- The report is looked up by exact slug; a missing report returns null and runs no further queries. `[report-detail.ts:where r.slug = $1]`
- State and area slugs come from the stored location path, not from computed slugs. `[report-detail.ts:split_part]`
- Throws when the report row has no id. `[report-detail.ts:Missing id for report row]`
- Throws when the report has no stored location path. `[report-detail.ts:is missing location_path.path.]`
- The state and area slug checks throw only when the value is null, which happens only when the location path itself is missing. `split_part` returns an empty string for a missing segment, and an empty slug does not throw. `[report-detail.ts:is missing state_or_territory_slug.]` `[report-detail.ts:is missing administrative_area_slug.]`
- Every `assertValue` check, including the name, personnel slug and evidence-link title and url checks, rejects only null or undefined; an empty string passes. The link id and the civil case id, title and slug are first passed through `nullableText`, so a blank value there does throw. `[report-detail.ts:value === null || value === undefined]`
- Throws when the state name is missing. `[report-detail.ts:is missing state_or_territory_name.]`
- Throws when the area name is missing. `[report-detail.ts:is missing administrative_area_name.]`
- Throws when the place name is missing. `[report-detail.ts:is missing place_name.]`
- Throws when the report has no `review_personnel` rows. `[report-detail.ts:has no review_personnel records]`
- Throws when a `review_personnel` row names an agency-personnel row that does not exist. `[report-detail.ts:Missing agency_officer]`
- Throws when an agency-personnel row names a personnel row that does not exist. `[report-detail.ts:Missing officer]`
- Throws when the personnel row has no slug. `[report-detail.ts:Missing slug for officer]`
- Throws when the agency is not found. The agency list holds only agencies with a location path row and an `agency` page payload row. `[report-detail.ts:Missing agency]`
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
- `place_slug` is selected but not validated or used. `[report-detail.ts:place_slug]`

### `sitemap-lastmod.js`

- The file has no `throw`; every missing or unusable value is skipped. Only database errors reject the promise. `[sitemap-lastmod.js:continue]`
- State page keys come from `US_STATE_TILES` codes, lower-cased, fixed at module load. `[sitemap-lastmod.js:US_STATE_TILES]`
- A falsy or invalid date is ignored. `[sitemap-lastmod.js:parseDate]`
- Each key keeps the latest date seen; an entry is replaced only by a strictly later date. `[sitemap-lastmod.js:setCategoryLastmod]`
- A report detail key is set only when the location path, the slug and a usable incident date all exist. The incident date is used as given when it is a `YYYY-MM-DD` string; any other value that parses as a date is written as its UTC date. `[sitemap-lastmod.js:normalizeReportDate]`
- Report archive keys are set only when the location path has exactly three segments. `[sitemap-lastmod.js:parts.length !== 3]`
- Reports need a slug and a location path row. `[sitemap-lastmod.js:r.slug is not null]`
- Report and civil case states are the second segment of the stored location path, as stored. The agency state is that segment lower-cased. The personnel collection state is the lower-cased `state` column of the assigned agency row, not a location path segment. `[sitemap-lastmod.js:lower(split_part]` `[sitemap-lastmod.js:lower(a.state) as agency_state]`
- An agency date is the latest of its own dates and those of its agency-personnel rows, personnel, linked reports and linked civil cases. `[sitemap-lastmod.js:max_civil_case_updated_at]`
- Agencies need a place, area and state location row and an `agency` page payload row. `[sitemap-lastmod.js:bpp.page_type = 'agency']`
- A personnel detail key needs a slug and at least one agency-personnel row. `[sitemap-lastmod.js:personnelDetailRows]`
- The personnel collection uses one current assignment per person, chosen by latest start date. `[sitemap-lastmod.js:recency_rank = 1]`
- A civil case date is the later of its updated and created dates. `[sitemap-lastmod.js:civilCaseRows]`
- Civil cases need a slug and a location path row; a case without either gets no key. `[sitemap-lastmod.js:c.slug is not null]`
- A state page gets the latest of that state's agency, personnel, civil case and report dates; a state with no dates gets no key. `[sitemap-lastmod.js:agencyLastmodsByCategory]`
- The root key gets the latest of the personnel collection date and every state page date. `[sitemap-lastmod.js:pathLastmods.get("/personnel/")]`

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
- `report-detail.ts` reads every row of `public.personnel`. `[report-detail.ts:select * from public.personnel]`
- `report-detail.ts` reads every row of `public.agency` joined to `public.build_page_payload`. `[report-detail.ts:public.build_page_payload]`
- `report-detail.ts` reads every row of `public.agency_personnel`. `[report-detail.ts:public.agency_personnel]`
- `sitemap-lastmod.js` runs five read-only queries inside one `withDb` call. `[sitemap-lastmod.js:withDb]`
- `sitemap-lastmod.js` reads `public.reviews`. `[sitemap-lastmod.js:public.reviews]`
- `sitemap-lastmod.js` reads `public.location_path`. `[sitemap-lastmod.js:public.location_path]`
- `sitemap-lastmod.js` reads `public.agency`. `[sitemap-lastmod.js:public.agency a]`
- `sitemap-lastmod.js` reads `public.build_page_payload`. `[sitemap-lastmod.js:public.build_page_payload]`
- `sitemap-lastmod.js` reads `public.agency_personnel`. `[sitemap-lastmod.js:public.agency_personnel]`
- `sitemap-lastmod.js` reads `public.personnel`. `[sitemap-lastmod.js:public.personnel]`
- `sitemap-lastmod.js` reads `public.review_personnel`. `[sitemap-lastmod.js:public.review_personnel]`
- `sitemap-lastmod.js` reads `public.civil_case_personnel`. `[sitemap-lastmod.js:public.civil_case_personnel]`
- `sitemap-lastmod.js` reads `public.civil_cases`. `[sitemap-lastmod.js:public.civil_cases]`
- `sitemap-lastmod.js` builds two queries with the SQL fragment from `currentAssignmentSql`. `[sitemap-lastmod.js:currentAssignmentSql]`
- `personnel-photos.js` reads `public.personnel_photo` through `withDb`. `[personnel-photos.js:public.personnel_photo]`
- `category-collection-stats.ts` has no SQL of its own; it reads the database through four loaders in `./data/`. `[category-collection-stats.ts:loadCivilCaseCountsByAgencyState]`

### Environment, files and processes

- `build-timing.ts` reads `ROUTE_TIMING`. `[build-timing.ts:ROUTE_TIMING]`
- `build-timing.ts` writes a `route-timing` line with `console.info` when timing is on. `[build-timing.ts:route-timing]`
- `entity-images.ts` reads `ENTITY_IMAGES_DIR` and `ENTITY_IMAGES_URL_BASE` at module load. `[entity-images.ts:ENTITY_IMAGES_URL_BASE]`
- `entity-images.ts` lists image folders with a synchronous directory read; it opens no file and writes nothing. `[entity-images.ts:readdirSync]`
- `entity-images.ts` keeps a per-type cache for the life of the process, including empty results. `[entity-images.ts:cacheByType]`
- `personnel-photo-files.js` reads the photo file from the intake workspace. `[personnel-photo-files.js:node:fs/promises]`
- `personnel-photo-files.js` creates the destination folder and writes the photo under `img/personnel-photos` in the public directory, replacing any existing file. `[personnel-photo-files.js:writeFile(destination, bytes)]`
- `personnel-photo-files.js` computes a SHA-256 digest. `[personnel-photo-files.js:createHash("sha256")]`
- `personnel-photos.js` reads `INTAKE_WORKSPACE`. `[personnel-photos.js:process.env.INTAKE_WORKSPACE]`
- `personnel-photos.js` writes photos under the `public` folder of the working directory. `[personnel-photos.js:path.join(process.cwd(), "public")]`
- `personnel-photos.js` holds the staging promise in module-level state. `[personnel-photos.js:let photos]`
- `release-id.js` reads `RELEASE_ID` at module load. `[release-id.js:process.env.RELEASE_ID]`
- `release-id.js` runs `git rev-parse HEAD` as a synchronous child process at module load when `RELEASE_ID` is not set. `[release-id.js:rev-parse]`
- `news.ts` imports every matching news metadata module eagerly through `import.meta.glob`. `[news.ts:import.meta.glob]`
- `prefill.ts` writes, reads and deletes keys in `window.sessionStorage`. `[prefill.ts:window.sessionStorage]`

### Pure files

- `agency-status.ts` has no imports, input, output or module state. `[agency-status.ts:export const agencyStatusPresentation]`
- `alpha-navigation.ts` has no imports, input, output or mutable module state. `[alpha-navigation.ts:nextPageByLetter]`
- `contact-emails.js` has no imports, input, output or module state. `[contact-emails.js:export const contactEmailsForDisplay]`
- `data.js` does not change its inputs and has no input, output or module state. `[data.js:parseSourceValues]`
- `format.js` has no imports, input, output or module state. `[format.js:value instanceof Date]`
- `icons.ts` is static data and types. `[icons.ts:chevron-down]`
- `metric-vocabulary.ts` is static data, types and one lookup. `[metric-vocabulary.ts:as const]`
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
