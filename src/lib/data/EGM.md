# Data Loaders (`src/lib/data`)

## Overview

Build-time data layer for the Astro site. The files here read the Postgres database through the shared `withDb` helper (defined outside this directory in `src/lib/db`), check required fields, and shape rows into the objects that pages, static-path functions and release scripts use. The directory has no subdirectories. It holds four kinds of file:

- Database loaders: `agencies.ts`, `agency-detail.ts`, `arrest-profiles.ts`, `build-payloads.ts`, `civic-topic-records.ts`, `civil-case-scopes.ts`, `civil-cases.ts`, `civil-litigation-category.ts`, `civil-litigation-detail.ts`, `coverage.ts`, `data-annotations.ts`, `federal-agencies.ts`, `licensing-authority.ts`, `licensing.ts`, `personnel-education.ts`, `personnel.ts`.
- Loaders that only reuse another loader in this directory: `civic-scoped-routes.ts`, `reports.ts`, `summaries.ts`.
- Pure functions with no input or output: `agency-civil-case-rows.ts`, `ai-complaint-summary.ts`, `annotation-access.js`, `annotation-values.js`, `annotation-views.ts`, `arrest-beats.ts`, `arrest-income.js`, `assignment-status.js`, `civic-index.ts`, `location-paths.ts`, `release-news.ts`, `report-archives.ts`, `report-paths.ts`.
- Static data and types: `annotation-contract.json`, `personnel-topic-config.ts`, `types.ts`, and `constants.ts` (an empty file, 0 bytes, with no exports).

Citations have the form `[file:text]`. `file` is relative to this directory and `text` appears verbatim in that file. All SQL in this directory is `select` only. Test files (`*.test.*`) are not documented here.

## Interface

### agencies.ts

- `loadAgencySummaries(): Promise<AgencySummary[]>` runs one query and returns one summary per agency with fields `id`, `name`, `state`, `slug`, `administrativeArea`, `administrativeAreaSlug`, `city`, `placeSlug`, `address`, `zipCode`, `phoneNumber`, `canonicalPath`, `activePersonnelCount`, `reportCount`, `civilCaseCount`. [agencies.ts:loadAgencySummaries]
- `loadAgencySummaries` reads `public.agency` inner-joined to `public.location_path` and to `public.build_page_payload` (`page_type = 'agency'`), left-joined to the parent `public.location_path` row at level `administrative_area`. [agencies.ts:area_lp.level = 'administrative_area']
- `loadAgencySummaries` takes the earliest-created phone per agency from `public.agency_phone_numbers`. [agencies.ts:first_phone]
- `loadAgencySummaries` counts distinct current personnel from `public.agency_personnel` using `currentAssignmentSql()`. [agencies.ts:active_personnel_counts]
- `loadAgencySummaries` counts distinct reports from `public.agency_personnel` joined to `public.review_personnel`. [agencies.ts:report_counts]
- `loadAgencySummaries` counts distinct civil cases from `public.civil_case_personnel`, both through the agency's own assignment rows and through any assignment row of a person who also has an assignment at the agency. [agencies.ts:civil_case_agency_cases]
- `loadAgencyFinderResults(): Promise<AgencyFinderResult[]>` reads `entity_id, payload` from `public.build_page_payload` where `page_type = 'agency'`. It takes `id` from `entity_id` (falling back to `payload.agency.id`) and maps `payload.agency` to `name`, `state`, `administrativeArea`, `city`, `zipCode` (from `postalCode`) and `canonicalPath` (from `path`); `administrativeAreaSlug` is always `null`. [agencies.ts:requireText(agency.entity_id || payload?.id, "id", "unknown")]
- `resolveAgencyByStateSlug(state, slug)` calls `loadAgencySummaries()` and returns the first summary whose lower-cased `state` equals the `state` argument as given and whose `slug` matches exactly, or `undefined`. [agencies.ts:resolveAgencyByStateSlug]
- `resolveAgencyByLocationSlug(state, administrativeArea, place, slug)` calls `loadAgencySummaries()` and returns the first summary matching state, `administrativeAreaSlug`, `placeSlug` and `slug`, or `undefined`. [agencies.ts:resolveAgencyByLocationSlug]

### agency-civil-case-rows.ts

- Type `CivilCaseRow`: `id`, `slug`, optional `title`, `cause_number`, `filed_date`, `date_terminated`, `court`, plus `outcome`, `caseUrl`, `type`, `personnel`, `personnelNames`. [agency-civil-case-rows.ts:CivilCaseRow]
- Type `CivilCasePersonnelRef`: `href`, `id`, `name`. [agency-civil-case-rows.ts:CivilCasePersonnelRef]
- `buildAgencyCivilCaseRows(data)` takes the result of `loadAgencyDetail` and merges `data.civilCases` and `data.personnelLinkedCivilCases` into one `CivilCaseRow[]` keyed by case id. It is synchronous and reads no database. [agency-civil-case-rows.ts:buildAgencyCivilCaseRows]

### agency-detail.ts

- Type `AgencyScopedTopicKind`: `"personnel" | "reports" | "budget" | "civil-cases" | "fatal-force-incidents" | "liability-costs" | "outcomes-by-income"`. [agency-detail.ts:AgencyScopedTopicKind]
- `requireAgencyText(value, fieldName, agencyId)` returns the trimmed string or throws. [agency-detail.ts:requireAgencyText]
- `loadAgencyStaticPaths()` reads `payload` from `public.build_page_payload` where `page_type = 'agency'` and returns `{ params: { category, slug }, props: { canonicalAgencyPath } }` for each row. [agency-detail.ts:loadAgencyStaticPaths]
- `loadAgencyLocationStaticPaths()` reads `path, entity_id` from `public.build_page_payload` where `page_type = 'agency'`, ordered by `path`, and returns `{ params: { category, administrativeArea, place, agencySlug } }` from the four path segments. [agency-detail.ts:loadAgencyLocationStaticPaths]
- `loadAgencyLocationStaticPathsForTopic(kind)` returns the same shape, limited to agencies that have data for the topic. [agency-detail.ts:loadAgencyLocationStaticPathsForTopic]
- For `"personnel"` the topic filter requires a `public.agency_personnel` row for the agency. [agency-detail.ts:where ao.agency_id = bpp.entity_id]
- For `"reports"` the topic filter requires a `public.review_personnel` row linked to one of the agency's assignments. [agency-detail.ts:public.review_personnel ro]
- For `"civil-cases"` the topic filter requires a `public.civil_case_personnel` row linked to any assignment of a person who has an assignment at the agency. [agency-detail.ts:where target_ao.agency_id = bpp.entity_id]
- For every other kind the topic filter is `where false`, so the result is always empty. [agency-detail.ts:where false]
- `loadAgencyDetailByRouteParams(params)` builds the location path and agency path from `category`, `administrativeArea`, `place`, `agencySlug`, finds the agency id in `public.agency` joined to `public.location_path` by exact path and slug, then returns `loadAgencyDetail(agencyId)`. [agency-detail.ts:loadAgencyDetailByRouteParams]
- `loadAgencyDetail(agencyId)` returns the full agency detail object (raw rows plus derived fields listed below). [agency-detail.ts:loadAgencyDetail]
- `loadAgencyDetail` reads the agency row from `public.agency` with `public.location_path` (own and parent) and `public.build_page_payload`, where `a.id = $1`. [agency-detail.ts:a.status_date::text as status_date]
- `loadAgencyDetail` reads phones from `public.agency_phone_numbers`, with rows described as fax sorted last. [agency-detail.ts:description ilike 'fax']
- `loadAgencyDetail` reads all assignment rows from `public.agency_personnel` for the agency. [agency-detail.ts:select * from public.agency_personnel where agency_id = $1]
- `loadAgencyDetail` reads the parent federal agency (`id`, `name`, `slug`) from `public.federal_agency`. [agency-detail.ts:public.federal_agency]
- `loadAgencyDetail` reads the linked people from `public.personnel`. [agency-detail.ts:select * from public.personnel where id = any($1)]
- `loadAgencyDetail` counts distinct reports per person from `public.review_personnel` joined to `public.agency_personnel`, across all of that person's assignments. [agency-detail.ts:count(distinct ro.review_id) as report_count]
- `loadAgencyDetail` counts discipline rows per person from `public.discipline`. [agency-detail.ts:discipline_count]
- `loadAgencyDetail` reads agency-scoped discipline links from `public.discipline_agency_personnel` joined to `public.agency_personnel`. [agency-detail.ts:public.discipline_agency_personnel]
- `loadAgencyDetail` reads one license per person from `public.license` joined to `public.authority_license`, active first, then most recently first awarded. [agency-detail.ts:public.authority_license]
- `loadAgencyDetail` reads `public.review_personnel` for the agency's assignment ids and keeps the distinct report ids. [agency-detail.ts:select * from public.review_personnel where agency_personnel_id = any($1)]
- `loadAgencyDetail` reads direct civil case ids from `public.agency_personnel` joined to `public.civil_case_personnel`. [agency-detail.ts:select distinct cco.civil_case_id]
- `loadAgencyDetail` reads those cases from `public.civil_cases`. [agency-detail.ts:order by filed_date desc, title asc, cause_number asc]
- `loadAgencyDetail` reads every person linked to those cases, from any agency. [agency-detail.ts:select cco.civil_case_id, ao.personnel_id, ao.title]
- `loadAgencyDetail` reads personnel-linked civil cases: cases recorded against another agency for a person who has an assignment at this agency, excluding cases with a direct link to this agency. It joins `public.civil_case_personnel`, `public.civil_cases`, `public.agency_personnel`, `public.personnel`, `public.agency`, `public.location_path` and `public.build_page_payload`. [agency-detail.ts:case_ao.agency_id <> $1]
- `loadAgencyDetail` also calls `loadCoverageLinksForAgency(agencyId)` and `loadReportSummaryBuildPayloads()`. [agency-detail.ts:loadCoverageLinksForAgency]
- Derived fields returned by `loadAgencyDetail`: `employees`, `currentEmployees`, `formerEmployees`, `civilCases`, `personnelLinkedCivilCases`, `reportedReports`, `coverageLinks`, `agencyName`, `agencyState`, `agencySlug`, `categorySlug`, `categoryLabel`, `categoryPath`, `agencyPath`, `canonicalAgencyPath`, `administrativeArea`, `administrativeAreaSlug`, `placeLabel`, `placeSlug`, `placePath`, and `counts` (`civilCases`, `personnelLinkedCivilCases`, `reports`, `discipline`, `personnel`, `currentPersonnel`, `formerPersonnel`, `coverage`). [agency-detail.ts:formerPersonnel]
- Each `employees` item has `entry`, `officer`, `reportCount`, `personnelDisciplineCount`, `disciplineCount`, `rating` (always `null`) and `license`. [agency-detail.ts:rating: null as number | null]
- Assignment rows pass through `normalizeAgencyHistory` (defined outside this directory in `src/lib/data.js`) before they become `employees`. [agency-detail.ts:normalizeAgencyHistory(data.agencyOfficers)]
- Each `civilCases` item is the case row plus `caseUrl` and `officers` (the linked person rows, each with the assignment `title`). [agency-detail.ts:officers: officerLinks.filter(Boolean)]
- Each `personnelLinkedCivilCases` item has case fields, `caseUrl` and `links`; each link has `officer`, `caseAgency` and `targetAgencyAssignment` (`title`, `startDate`, `endDate`, `relationship`). [agency-detail.ts:targetAgencyAssignment]
- Each `reportedReports` item is the report summary payload plus `url` and `officers`. [agency-detail.ts:url: report.canonicalPath]

### ai-complaint-summary.ts

- Type `AiComplaintSummary`: `summary` and `source` (`{ sourcePage }`). [ai-complaint-summary.ts:AiComplaintSummary]
- `requireAiComplaintSummary(value): AiComplaintSummary | null` returns `null` for `null`, otherwise validates the value and returns the same object. [ai-complaint-summary.ts:requireAiComplaintSummary]
- Type `ComplaintSummaryUnavailability`: `reason`, `sourceUrl`, `checkedAt`, `detail`. The reasons are `missing_copy`, `pending`, `retrieval_failed`, `authentication_failed`, `generation_failed`, `available_unsummarized`. [ai-complaint-summary.ts:available_unsummarized]
- `requireComplaintSummaryUnavailability(value, summary): ComplaintSummaryUnavailability | null` returns `null` for `null`, otherwise validates the value and returns the same object. [ai-complaint-summary.ts:requireComplaintSummaryUnavailability]

### annotation-access.js

- `currentAssignmentSql(alias = "")` returns a SQL predicate string for an open assignment. It requires `end_date is null`, a null `end_date` effective value in `data_source_values`, and either a `start_date` on or before the database's UTC date or a null `start_date` with a null effective value. It runs no query. [annotation-access.js:currentAssignmentSql]

### annotation-contract.json

- Static JSON with five top-level keys: `generatedBy`, `annotation`, `annotationRecord`, `sourceValues`, `records`. [annotation-contract.json:"annotationRecord"]
- `generatedBy` names the intake script that publishes the file. [annotation-contract.json:publish-data-annotation-contract.ts]
- `annotation` is a JSON Schema `oneOf` with three variants set by the `type` const: `warning`, `error`, `correction`. All require `field`, `value`, `message`, `source_namespace`, `source_record_id`, `type`; `correction` also requires `replacement_value`; `evidence` is optional. [annotation-contract.json:"const": "correction"]
- `annotationRecord` is a JSON Schema for a stored annotation row with `subject_kind`, `subject_id`, `producer_namespace`, `producer_record_id`, `source_namespace`, `source_record_id`, `type`, `field`, `value`, `replacement_value`, `message`, `evidence`, `status`, `id`. [annotation-contract.json:"producer_record_id"]
- `sourceValues` is a JSON Schema for an object whose values each require `value`, `effective_value`, `source_namespace`, `source_record_id`. [annotation-contract.json:"effective_value"]
- `records` lists 26 `{ kind, table, primaryKey }` entries. The kinds are `LocationPath`, `LocationPathGeometry`, `LocationPathAlias`, `Agency`, `Personnel`, `AgencyPersonnel`, `LicensingAuthority`, `AuthorityLicense`, `License`, `LicenseAction`, `PersonnelEducation`, `PersonnelPhoto`, `Discipline`, `DisciplineAgencyPersonnel`, `CoverageLink`, `CoverageLinkAgencyPersonnel`, `AgencyPhoneNumber`, `FederalAgency`, `CivilCase`, `CivilCasePersonnel`, `CivilCaseLink`, `Review`, `ReviewPersonnel`, `ReviewLink`, `ArrestProfile`, `AgencyArrestProfile`. [annotation-contract.json:"AgencyArrestProfile"]
- The tables named in `records` are `public.location_path`, `public.location_path_geometry`, `public.location_path_alias`, `public.agency`, `public.personnel`, `public.agency_personnel`, `public.licensing_authority`, `public.authority_license`, `public.license`, `public.license_action`, `public.personnel_education`, `public.personnel_photo`, `public.discipline`, `public.discipline_agency_personnel`, `public.coverage_links`, `public.coverage_link_agency_personnel`, `public.agency_phone_numbers`, `public.federal_agency`, `public.civil_cases`, `public.civil_case_personnel`, `public.civil_case_links`, `public.reviews`, `public.review_personnel`, `public.review_links`, `public.arrest_profile`, `public.agency_arrest_profile`. [annotation-contract.json:public.location_path_geometry]
- Every primary key is `id` except `location_path_id` (for `LocationPath` and `LocationPathGeometry`) and `alias_path` (for `LocationPathAlias`). [annotation-contract.json:"alias_path"]

### annotation-values.js

- JSDoc types `DataAnnotation` and `AnnotationEntry` (a `DataAnnotation` plus `canonical_id`, `entity_kind`, `record_url`, `record_label`, `source_provider`). They are not runtime exports. [annotation-values.js:AnnotationEntry]
- `parseAnnotations(value)` checks that the value is an array whose entries match `contract.annotation` and returns the same array. [annotation-values.js:parseAnnotations]
- `parseSourceValues(value)` checks the value against `contract.sourceValues` and returns it unchanged. [annotation-values.js:parseSourceValues]
- `annotationValue(value)` returns a string as it is and passes anything else through `JSON.stringify`. [annotation-values.js:annotationValue]
- `annotationDisplay(entry)` returns `{ field, showValues, value?, replacement_value?, message, evidence? }` for public display. [annotation-values.js:annotationDisplay]
- `filterAnnotations(entries, provider = "", type = "")` keeps entries whose `source_namespace` equals `provider` and whose `type` equals `type`, when each is given. [annotation-values.js:filterAnnotations]
- `paginateAnnotations(entries, page)` returns the 50-entry slice for a 1-based page. [annotation-values.js:paginateAnnotations]
- `annotationsCsv(entries)` returns CSV text with the columns `source_provider`, `source_record_id`, `record_url`, `field`, `reported_value`, `type`, `message`, `replacement_value`, `evidence`. [annotation-values.js:reported_value]
- `reportedDate(stored, evidence)` returns `YYYY-MM-DD` from the local calendar fields of a `Date`, or `evidence.effective_value` when `stored` is `null` and evidence is given, or `stored`. [annotation-values.js:reportedDate]
- `isReportedDate(value)` is true only for a `YYYY-MM-DD` string that is a real calendar date. [annotation-values.js:isReportedDate]
- `authorityAnnotations(entries, namespaces, authorityId)` keeps entries whose `source_namespace` is in `namespaces`, or whose `entity_kind` is `LicensingAuthority` with `canonical_id` equal to `authorityId`. [annotation-values.js:authorityAnnotations]
- `annotationFromRecord(record)` projects a stored annotation row to a `DataAnnotation` and validates it with `parseAnnotations`. [annotation-values.js:annotationFromRecord]
- `annotationRecordLabel(entry)` returns the excluded record's `name` (or its `kind` and `key`) for the field `excluded_records`, otherwise `entry.record_label`. [annotation-values.js:annotationRecordLabel]
- `annotationNoteLabel(entry)` returns `Excluded duplicate`, `Excluded record`, `Our warning`, `Data error` or `Our correction`. [annotation-values.js:annotationNoteLabel]

### annotation-views.ts

- `annotationFilters(entries, namespaces?, authorityId?)` returns one `{ parts, provider, type, entries }` filter for each provider crossed with the types all, `warning`, `error`, `correction`. [annotation-views.ts:annotationFilters]
- `annotationPages(entries, namespaces?, authorityId?)` returns one `{ parts, provider, type, entries, filterParts, page, pageCount, rows }` object per page of each filter. [annotation-views.ts:annotationPages]
- `annotationHref(base, parts)` returns `base` plus `parts` and a trailing `/`, or `base` when `parts` is empty. [annotation-views.ts:annotationHref]

### arrest-beats.ts

- Type `BeatBoundary`: `code`, `name`, `geometry` (a GeoJSON `Polygon` or `MultiPolygon`). [arrest-beats.ts:BeatBoundary]
- Type `BeatMap`: `beats` (each boundary plus `count` and `anchor`), `total`, `unmapped`. [arrest-beats.ts:BeatMap]
- `buildBeatMap(boundaries, counts, total): BeatMap` validates boundaries and counts and adds an interior label point and a count to each boundary. [arrest-beats.ts:buildBeatMap]

### arrest-income.js

- JSDoc type `IncomeEvidence`: `cells` (`month`, `incomeTract`, `incomeStatus`, `arrests`) and `residential_income_by_tract`. It is not a runtime export. [arrest-income.js:IncomeEvidence]
- `incomeRows(personnel, agency, firstMonth, lastMonth)` returns exactly seven `{ label, count, agencyCount }` rows: six income ranges from `Under $25,000` to `$150,000 or more`, then `Unknown`. [arrest-income.js:incomeRows]

### arrest-profiles.ts

- Type `ArrestProfileRecord`: `id`, `agency` (`name`, `href`), `coverage` (`agency`, `source`, `firstMonth`, `lastMonth`, `totalArrests`, `chargeRows`, `distinctChargeRecords`), `breakdowns`, optional `beatMap`, optional `incomeRows`, `updatedAt`. [arrest-profiles.ts:ArrestProfileRecord]
- Type `ArrestProfile`: `ArrestProfileRecord` plus `assignmentId`. [arrest-profiles.ts:assignmentId]
- Type `AgencyArrestProfile`: `ArrestProfileRecord` plus `agencyId`. [arrest-profiles.ts:AgencyArrestProfile]
- `loadArrestProfilesForPersonnel(personnelId): Promise<ArrestProfile[]>` reads every row of `public.arrest_profile` joined to `public.agency_personnel`, `public.agency` and `public.location_path`, groups by person in memory, and returns that person's profiles or `[]`. [arrest-profiles.ts:from public.arrest_profile profile]
- `loadArrestProfilesForAgency(agencyId): Promise<AgencyArrestProfile[]>` reads every row of `public.agency_arrest_profile` joined to `public.agency` and `public.location_path`, groups by agency in memory, and returns that agency's profiles or `[]`. [arrest-profiles.ts:from public.agency_arrest_profile profile]

### assignment-status.js

- `getAssignmentStatus(assignment, options = {})` returns `{ isCurrent, isEnded, isUnknown, endDate, endDateInvalid, endDateImplausible }`. `options.now` replaces the system clock. [assignment-status.js:getAssignmentStatus]
- `isCurrentAssignment(assignment, options)` returns the `isCurrent` flag. [assignment-status.js:isCurrentAssignment]
- `isEndedAssignment(assignment, options)` returns the `isEnded` flag. [assignment-status.js:isEndedAssignment]
- `selectHeadlineAssignment(history, options)` picks one assignment from a history and returns its status fields plus `assignment`, `isCurrent` and `hasUncertainHistory`. [assignment-status.js:selectHeadlineAssignment]
- `formatAssignmentDate(value)` formats a valid reported date as, for example, "Jan 5, 2024" in UTC, and returns any other value unchanged. [assignment-status.js:formatAssignmentDate]

### build-payloads.ts

- Type `LocationChildPayload`: `childCount`, `coverage`, `label`, `path`, and optional `directAgency`, `kind`, `mapPoint`, `nextDetail`, `nextLabel`, `nextPath`. [build-payloads.ts:LocationChildPayload]
- Type `LocationMapBounds`: `maxLat`, `maxLng`, `minLat`, `minLng`. [build-payloads.ts:LocationMapBounds]
- Type `LocationMapPoint`: `lat`, `lng`. [build-payloads.ts:LocationMapPoint]
- Type `LocationAgencyPayload`: `civilCases`, `id`, `name`, `path`, `personnel`, `reports`, `slug`, and optional `address`, `administrativeArea`, `city`, `mapPoint`. [build-payloads.ts:LocationAgencyPayload]
- Type `LocationCoveragePayload`: `agencies`, `civilCases`, `personnel`, `reports`. [build-payloads.ts:LocationCoveragePayload]
- Type `LocationPagePayload`: `coverage`, `displayName`, `level`, `pageType`, `path`, `state`, `stateLabel`, and optional `administrativeArea`, `administrativeAreaKind`, `administrativeAreaPlural`, `administrativeAreaSlug`, `agencies`, `children`, `mapBounds`, `mapPositionSource`, `parentPath`. [build-payloads.ts:LocationPagePayload]
- Type `ReportSummaryPayload`: the report fields copied by `loadReportSummaries` (see `reports.ts`) plus `pageType`. [build-payloads.ts:ReportSummaryPayload]
- Type `BuildPayloadRow<TPayload>`: `path`, `pageType`, `entityId`, `payload`. [build-payloads.ts:BuildPayloadRow]
- `loadLocationBuildPayloads(): Promise<LocationPagePayload[]>` reads `public.build_page_payload` where `page_type = 'location'`, ordered by `path`, and returns the `payload` column. [build-payloads.ts:where page_type = 'location']
- `loadReportSummaryBuildPayloads(): Promise<ReportSummaryPayload[]>` reads `public.build_page_payload` where `page_type = 'report_summary'`, ordered by incident date descending then `entity_id`, and returns the `payload` column. [build-payloads.ts:where page_type = 'report_summary']

### civic-index.ts

- Constant `civicIndexCollator`: `Intl.Collator("en", { numeric: true, sensitivity: "base" })`. [civic-index.ts:export const civicIndexCollator]
- Types `CivicIndexLevel`, `CivicIndexScope`, `CivicScopedTopicKind`, `CivicCoverageMetric`, `CivicTopicRole`, `VolunteerScope`. [civic-index.ts:export type CivicScopedTopicKind]
- Types `CivicStatCell`, `CivicJumpCell`, `CivicPendingTopic`, `CivicIndexColumn`, `CivicIndexRow`, `CivicIndexMapPoint`. [civic-index.ts:export type CivicIndexMapPoint]
- Type `CivicIndexModel`: `breadcrumbs`, `columns`, `coverage`, `description`, `drilldownLabel`, `indexLabel`, `jumpCell`, `jurisdictionLabel`, `level`, `map`, `pagePath`, `pendingTopics`, `rows`, `statCells`, `title`. [civic-index.ts:export type CivicIndexModel]
- `buildHelpCollectHref(pagePath, scope, entitySlug)` returns a `/volunteer/` link with `source`, `scope` and the scope-named query values. [civic-index.ts:export const buildHelpCollectHref]
- `hasCivicScopedTopicData(coverage, kind)` is true for `"reports"` when `coverage.reports > 0`, true for `"civil-cases"` when `coverage.civilCases > 0`, and false for every other kind. [civic-index.ts:export const hasCivicScopedTopicData]
- `buildStatCells({ coverage, pagePath, scope, entitySlug })` returns stat cells in the order agencies (left out for `place`), personnel, reports, civil cases. [civic-index.ts:export const buildStatCells]
- `buildPendingTopics(pagePath, scope, entitySlug)` always returns four topics: `budget`, `liability-costs`, `fatal-force-incidents`, `outcomes-by-income`. [civic-index.ts:export const buildPendingTopics]
- `buildStateCivicIndex(state)` is async and resolves to the state-level `CivicIndexModel` built from a location payload's `children`. [civic-index.ts:export const buildStateCivicIndex = async]
- `buildAdministrativeAreaCivicIndex(area)` is async and resolves to the county-level model built from `children`. [civic-index.ts:export const buildAdministrativeAreaCivicIndex = async]
- `buildPlaceCivicIndex(place)` is async and resolves to the place-level model built from `agencies`. [civic-index.ts:export const buildPlaceCivicIndex = async]

### civic-scoped-routes.ts

- `loadStateScopedPaths()` returns `{ params: { category } }` for each state payload that has at least one child. [civic-scoped-routes.ts:export const loadStateScopedPaths = async]
- `loadStateScopedPathsForTopic(kind)` returns the same shape for states where `hasCivicScopedTopicData` is true. [civic-scoped-routes.ts:loadStateScopedPathsForTopic]
- `loadRequiredLocationByPath(path, expectedLevel)` returns the location payload with that exact path and level, or throws. [civic-scoped-routes.ts:loadRequiredLocationByPath]
- `loadAdministrativeAreaScopedPaths()` returns `{ params: { category, administrativeArea } }` for every `administrative_area` payload. [civic-scoped-routes.ts:export const loadAdministrativeAreaScopedPaths = async]
- `loadAdministrativeAreaScopedPathsForTopic(kind)` is the same, filtered by `hasCivicScopedTopicData`. [civic-scoped-routes.ts:loadAdministrativeAreaScopedPathsForTopic]
- `loadPlaceScopedPaths()` returns `{ params: { category, administrativeArea, place } }` for every `place` payload. [civic-scoped-routes.ts:export const loadPlaceScopedPaths = async]
- `loadPlaceScopedPathsForTopic(kind)` is the same, filtered by `hasCivicScopedTopicData`. [civic-scoped-routes.ts:loadPlaceScopedPathsForTopic]

### civic-topic-records.ts

- Type `CivicTopicKind`: `"budget" | "civil-cases" | "fatal-force-incidents" | "liability-costs" | "outcomes-by-income"`. [civic-topic-records.ts:export type CivicTopicKind]
- Types `CivicTopicAgencyRef` and `CivicTopicPersonnelRef`: `href`, `id`, `name`. [civic-topic-records.ts:export type CivicTopicPersonnelRef]
- Type `CivicCivilCaseRecord`: `agencies`, `connectionType`, `court`, `dateTerminated`, `filedDate`, `href`, `id`, `personnel`, `searchText`, `title`. [civic-topic-records.ts:export type CivicCivilCaseRecord]
- Type `CivicTopicRecords`: for `civil-cases`, `rows` of `CivicCivilCaseRecord` and a numeric `totalCount`; for the other kinds, empty `rows` and `totalCount: null`. Both have `emptyLabel`, `kind`, `title`. [civic-topic-records.ts:export type CivicTopicRecords]
- `loadCivicTopicRecords(model, kind)` returns the records for a civic page. Only `civil-cases` reads the database. [civic-topic-records.ts:export const loadCivicTopicRecords]
- For `civil-cases` it selects agencies from `public.agency` joined to `public.location_path` whose path starts with `model.pagePath`. [civic-topic-records.ts:lp.path like $1 || '%']
- For `civil-cases` it selects cases from `public.civil_case_personnel` joined twice to `public.agency_personnel` (the case assignment, and any assignment of the same person at a scoped agency). [civic-topic-records.ts:from public.civil_case_personnel cco]
- For `civil-cases` it reads up to 200 cases from `public.civil_cases`, ordered by `filed_date desc, title asc, cause_number asc`. [civic-topic-records.ts:limit 200]
- For `civil-cases` it reads each case's agencies through `public.agency`, `public.location_path` and `public.build_page_payload`. [civic-topic-records.ts:bpp.page_type = 'agency']
- For `civil-cases` it reads each case's people from `public.personnel`. [civic-topic-records.ts:join public.personnel o]

### civil-case-scopes.ts

- Type `CivilCaseCategoryCount`: `category`, `count`. [civil-case-scopes.ts:export type CivilCaseCategoryCount]
- `loadCivilCaseCountsByAgencyState()` returns one count of distinct civil cases per state slug. The state comes from the location path of every agency where a person on the case has an assignment. It reads `public.civil_case_personnel`, `public.agency_personnel`, `public.agency` and `public.location_path`. [civil-case-scopes.ts:count(distinct cco.civil_case_id) as case_count]

### civil-cases.ts

- Constant `CIVIL_CASES_PAGE_SIZE = 25`. [civil-cases.ts:CIVIL_CASES_PAGE_SIZE = 25]
- Type `CivilCaseListItem`: `id`, `slug`, `title`, `cause_number`, `court`, `filed_date`, `date_terminated`, `claims_summary`. [civil-cases.ts:export type CivilCaseListItem]
- `loadCivilCaseList(): Promise<CivilCaseListItem[]>` reads every row of `public.civil_cases` with no filter and no limit. [civil-cases.ts:export const loadCivilCaseList]

### civil-litigation-category.ts

- Type `OfficerRef`: `id`, `slug`, `first_name`, `last_name`. [civil-litigation-category.ts:export type OfficerRef]
- Type `AgencyRef`: `id`, `slug`, `name`, `state`, optional `location_path`, optional `canonicalPath`. [civil-litigation-category.ts:export type AgencyRef]
- Type `CivilCaseSummary`: `id`, `slug`, `state`, `locationPath`, `title`, `cause_number`, `court`, `filed_date`, `claims_summary`, `outcome`, `primary_source_url`, `created_at`, `officers`, `agencies`. [civil-litigation-category.ts:export type CivilCaseSummary]
- `loadCivilCasesByState(stateCode)` returns the civil cases whose own incident location (`public.civil_cases.location_path_id` joined to `public.location_path`) is in the state. [civil-litigation-category.ts:where upper(split_part(lp.path, '/', 2)) = $1]
- `loadCivilCasesByState` reads each case's people through `public.civil_case_personnel`, `public.agency_personnel` and `public.personnel`. [civil-litigation-category.ts:select cco.civil_case_id, ao.personnel_id]
- `loadCivilCasesByState` reads each case's agencies through `public.agency`, `public.location_path` and `public.build_page_payload`, ordered by agency name. [civil-litigation-category.ts:order by a.name]

### civil-litigation-detail.ts

- Type `CivilCaseCoverageLink`: `id`, `title`, `url`, optional `source_name`, `published_at`, `notes`. [civil-litigation-detail.ts:export type CivilCaseCoverageLink]
- Type `CivilCaseDetailOfficer`: `id`, `title`, `slug`, `first_name`, `last_name`. [civil-litigation-detail.ts:export type CivilCaseDetailOfficer]
- Type `CivilCaseDetailAgency`: `id`, `name`, `slug`, `city`, `state`, `administrative_area`, `location_path`, `canonicalPath`. [civil-litigation-detail.ts:export type CivilCaseDetailAgency]
- Type `CivilCaseDetail`: `civilCase`, `officers`, `agencies`, `coverageLinks`. [civil-litigation-detail.ts:export type CivilCaseDetail]
- `loadCivilCaseDetail(slug): Promise<CivilCaseDetail | null>` reads one case from `public.civil_cases` left-joined to `public.location_path` by slug. [civil-litigation-detail.ts:from public.civil_cases c]
- `loadCivilCaseDetail` reads the case's links from `public.civil_case_links`. [civil-litigation-detail.ts:from public.civil_case_links]
- `loadCivilCaseDetail` reads the case's people from `public.civil_case_personnel`, `public.agency_personnel` and `public.personnel`. [civil-litigation-detail.ts:from public.civil_case_personnel civil_case_officer]
- `loadCivilCaseDetail` reads the case's agencies from `public.agency`, `public.location_path` (own and parent) and `public.build_page_payload`. [civil-litigation-detail.ts:join public.build_page_payload bpp]
- `loadCivilCaseDetailBySlug(slug)` calls `loadCivilCaseDetail(slug)`. [civil-litigation-detail.ts:export const loadCivilCaseDetailBySlug]

### constants.ts

- The file is empty (0 bytes). It has no exports, so no citation is possible.

### coverage.ts

- Type `CoverageLink` is re-exported from `release-news.ts`. [coverage.ts:export type { CoverageLink }]
- `loadReleaseCoverage()` returns `{ articles, agencies, personnel, officers, home, ranking }` for all news coverage. [coverage.ts:export const loadReleaseCoverage]
- `loadReleaseCoverage` reads every row of `public.coverage_links`. [coverage.ts:from public.coverage_links]
- `loadReleaseCoverage` reads `public.coverage_link_agency_personnel` joined to `public.agency_personnel` and `public.personnel`. [coverage.ts:from public.coverage_link_agency_personnel r join public.agency_personnel a]
- `loadReleaseCoverage` reads the newest row of `public.coverage_homepage_windows`. [coverage.ts:from public.coverage_homepage_windows order by window_end desc limit 1]
- `loadReleaseCoverage` reads that window's placements from `public.coverage_homepage_placements`, up to the window's `placement_count`. [coverage.ts:from public.coverage_homepage_placements where window_id=$1 and position <= $2 order by position]
- `loadCoverageLinksForAgency(id)` returns the sorted coverage links for an agency id. [coverage.ts:export const loadCoverageLinksForAgency]
- `loadCoverageLinksForOfficer(id)` returns the sorted coverage links for a personnel id. [coverage.ts:export const loadCoverageLinksForOfficer]
- `loadHomepageNews()` returns the homepage articles in placement order, each selected with an empty assignment list. [coverage.ts:export async function loadHomepageNews]
- `loadReleaseRoster()` returns `{ agencies, personnel, assignments }`. [coverage.ts:export async function loadReleaseRoster]
- `loadReleaseRoster` reads every agency from `public.agency` joined to `public.location_path`, with `path` built from the location path and slug. [coverage.ts:lp.path || a.slug || '/' as path]
- `loadReleaseRoster` reads every person from `public.personnel` who has at least one `public.agency_personnel` row. [coverage.ts:where exists (select 1 from public.agency_personnel a where a.personnel_id=p.id)]
- Each roster person has `id`, `name`, `firstName`, `middleName`, `suffix`, `lastName`, `displayName` and a `path` of `/personnel/{slug}/`. [coverage.ts:'/personnel/'||p.slug||'/' as path]
- `loadReleaseRoster` reads every assignment from `public.agency_personnel`. [coverage.ts:from public.agency_personnel order by id]

### data-annotations.ts

- `collectDataAnnotations(client: PoolClient): Promise<AnnotationEntry[]>` builds one entry per active annotation whose owner resolves to a public record. It uses the database client passed in. [data-annotations.ts:export async function collectDataAnnotations]
- `loadDataAnnotations()` returns the result of `collectDataAnnotations` run through `withDb`. [data-annotations.ts:export function loadDataAnnotations()]
- `collectDataAnnotations` reads `id, name, source_namespaces` from `public.licensing_authority`. [data-annotations.ts:select id, name, source_namespaces from public.licensing_authority]
- `collectDataAnnotations` reads the active rows of `public.data_annotation`. [data-annotations.ts:select * from public.data_annotation where status = 'active' order by id]
- `collectDataAnnotations` reads each owner row from the table and primary key named for its kind in `annotation-contract.json`. [data-annotations.ts:select * from ${descriptor.table} where ${descriptor.primaryKey} = $1]
- `collectDataAnnotations` checks `public.agency_personnel` for a current assignment at an agency. [data-annotations.ts:select exists(select 1 from public.agency_personnel ap where ap.agency_id=$1]
- `collectDataAnnotations` reads the public page path from `public.build_page_payload` for page types `agency` and `report_summary`. [data-annotations.ts:select path from public.build_page_payload where entity_id=$1 and page_type=$2]
- `collectDataAnnotations` checks `public.build_page_payload` for a location page at an exact path. [data-annotations.ts:where page_type='location' and path=$1]
- `collectDataAnnotations` reads `public.coverage_link_agency_personnel` to find the owner of a coverage link. [data-annotations.ts:from public.coverage_link_agency_personnel where coverage_link_id=$1 order by agency_personnel_id]

### federal-agencies.ts

- Type `FederalAgencySummary`: `branchCount`, `civilCaseCount`, `id`, `name`, `path`, `personnelCount`, `reportCount`, `slug`. [federal-agencies.ts:export type FederalAgencySummary]
- Type `FederalAgencyBranch`: optional `address`, `administrativeArea`, `city`, `state`, plus `civilCaseCount`, `id`, `name`, `path`, `personnelCount`, `reportCount`. [federal-agencies.ts:export type FederalAgencyBranch]
- Type `FederalAgencyDetail`: `FederalAgencySummary` plus `branches`. [federal-agencies.ts:export type FederalAgencyDetail]
- Types `FederalAgencyIndexColumn`, `FederalAgencyIndexMetric`, `FederalAgencyIndexRow`. [federal-agencies.ts:export type FederalAgencyIndexMetric]
- Type `FederalAgencyIndexModel`: `breadcrumbs`, `charts`, `columns`, `description`, `heading`, `metrics`, `pagePath`, `rows`, `rowsLabel`, `searchLabel`, `searchPlaceholder`, `title`, and optional `isFieldOfficesTable`. [federal-agencies.ts:isFieldOfficesTable?: boolean]
- Type `FederalAgencyTopicKind`: `"personnel" | "reports" | "budget" | "civil-cases" | "liability-costs" | "outcomes-by-income"`. [federal-agencies.ts:export type FederalAgencyTopicKind]
- `loadFederalAgencySummaries()` returns every row of `public.federal_agency` with counts of child agencies, current personnel, reports and civil cases. It reads `public.agency`, `public.agency_personnel`, `public.review_personnel` and `public.civil_case_personnel`. [federal-agencies.ts:export const loadFederalAgencySummaries]
- `loadFederalAgencyDetailBySlug(slug)` returns one federal agency with its child agencies as `branches`, or `null`. It reads `public.federal_agency`, `public.agency`, `public.agency_personnel`, `public.location_path`, `public.build_page_payload`, `public.review_personnel` and `public.civil_case_personnel`. [federal-agencies.ts:export const loadFederalAgencyDetailBySlug]
- `buildFederalCivicIndex(federalAgencies): CivicIndexModel` builds the `/federal/` page model with no database access. [federal-agencies.ts:export const buildFederalCivicIndex]
- `buildFederalAgencyIndexModel(federalAgencies)` builds the federal agency table model with metric keys `parents`, `leafAgencies`, `personnel`, `civilCases`, `reports`. [federal-agencies.ts:export const buildFederalAgencyIndexModel]
- `buildFederalAgencyDetailIndexModel(federalAgency)` builds the field-office table for one federal agency and is the only builder that sets `isFieldOfficesTable`. [federal-agencies.ts:export const buildFederalAgencyDetailIndexModel]
- `buildFederalAgencyTopicIndexModel(federalAgencies, kind)` builds the `/federal/{kind}/` table model. [federal-agencies.ts:export const buildFederalAgencyTopicIndexModel]
- `buildFederalAgencyDetailTopicIndexModel(federalAgency, kind)` builds the topic table for one federal agency, with rows per child agency. [federal-agencies.ts:export const buildFederalAgencyDetailTopicIndexModel]

### licensing-authority.ts

- Type `StateAuthority`: `id`, `name`, `abbreviation`, `website`, `statePath`, `stateName`, `level`. [licensing-authority.ts:export type StateAuthority]
- Type `AuthorityRecords`: `licenses` (`licenseType`, `status`, `count`), `actions` (`action`, `count`, `latestDate`), `discipline` (record fields with `personnelName` and `personnelSlug`). [licensing-authority.ts:export type AuthorityRecords]
- `requireStateAuthority(rows, statePath)` returns `rows[0]` or throws. [licensing-authority.ts:export const requireStateAuthority]
- `loadStateAuthority(statePath)` reads `public.licensing_authority` joined to `public.location_path` by exact path and returns the one authority. [licensing-authority.ts:from public.licensing_authority la]
- `loadStateAuthorityLink(statePath)` returns `null` when the state has no authority, otherwise the state path followed by `licensing-authority/`. [licensing-authority.ts:export const loadStateAuthorityLink]
- `loadStateAuthorityPaths()` returns `{ params: { category } }` for every authority. [licensing-authority.ts:export const loadStateAuthorityPaths]
- `loadAuthorityRecords(authorityId)` returns license counts by type and status from `public.license` and `public.authority_license`. [licensing-authority.ts:group by al.name, l.status order by al.name, l.status nulls last]
- `loadAuthorityRecords` returns action counts and latest dates from `public.license_action`. [licensing-authority.ts:from public.license_action a]
- `loadAuthorityRecords` returns discipline rows from `public.discipline` joined to `public.personnel`. [licensing-authority.ts:from public.discipline d join public.personnel p]
- `loadAuthorityNamespaces(id)` returns the authority's `source_namespaces`. [licensing-authority.ts:select source_namespaces from public.licensing_authority where id = $1]

### licensing.ts

- Type `LicensingAuthority`: `id`, `name`, `abbreviation`, `website`, `href`. [licensing.ts:export type LicensingAuthority]
- Type `License`: `id`, `licenseType`, `status`, `firstAwarded`, `authority`. [licensing.ts:export type License]
- Type `LicenseTimelineEntry`: `id`, `action`, `actionDate`, `status`, `licenseId`, `licenseType`, `isAdverse`. [licensing.ts:export type LicenseTimelineEntry]
- Type `PersonnelLicensing`: `licenses`, `timeline`. [licensing.ts:export type PersonnelLicensing]
- Type `DisciplineRecord`: `id`, `action`, `effectiveDate`, `expirationDate`, `caseNumber`, `documentUrl`, `allegation`, `violation`, `finding`, `chiefAction`, `sanction`, `authority`, `agencies`. [licensing.ts:export type DisciplineRecord]
- `normalizeLicenseStatus(value)` returns `null` for blank input, `Active`, `Inactive`, `Expired` or `Deceased` for those words in any case, and the trimmed text otherwise. [licensing.ts:export const normalizeLicenseStatus]
- `normalizeLicenseType(value)` returns the trimmed string, or `""`. [licensing.ts:export const normalizeLicenseType]
- `isAdverseLicenseAction(action)` is true when the action text matches any pattern in `ADVERSE_ACTION_PATTERNS` (reprimand, hold, noncompliant, non-compliant, out of compliance, suspend, revok, surrender, denied, probation, cancelled for cause). [licensing.ts:export const isAdverseLicenseAction]
- `loadLicensingForPersonnel(personnelId)` returns the person's licenses and action timeline from one full load of `public.license`, `public.authority_license`, `public.licensing_authority` and `public.location_path`. [licensing.ts:left join public.licensing_authority la]
- `loadLicensingForPersonnel` reads every row of `public.license_action`. [licensing.ts:from public.license_action]
- `loadDisciplineForPersonnel(personnelId)` returns the person's rows from `public.discipline` with the authority from `public.licensing_authority` and `public.location_path`. [licensing.ts:where d.personnel_id = $1]
- `loadDisciplineForPersonnel` attaches the linked agencies from `public.discipline_agency_personnel`, `public.agency_personnel` and `public.agency`. [licensing.ts:from public.discipline_agency_personnel dap]

### location-paths.ts

- `getAgencyLocationPath(agency)` returns the trimmed `locationPath` or `location_path`, or `null`. [location-paths.ts:export const getAgencyLocationPath]
- `buildAgencyCanonicalPath(agency)` returns the trimmed `canonicalPath` or `canonical_path` when present, otherwise the location path followed by the slug and `/`, otherwise `null`. [location-paths.ts:export const buildAgencyCanonicalPath]
- `requireAgencyCanonicalPath(agency)` returns the same value or throws when it is `null`. [location-paths.ts:export const requireAgencyCanonicalPath]

### personnel-education.ts

- Type `EducationRecord`: `id`, `name`, `completionDate`, `credits`, `sponsorName`, `sponsorInstructor`. [personnel-education.ts:export type EducationRecord]
- `loadEducationForPersonnel(personnelId)` returns the person's rows from `public.personnel_education`, newest completion date first. [personnel-education.ts:order by completion_date desc nulls last, id]

### personnel-topic-config.ts

- Constant `personnelTopics` has the keys `arrests`, `civil-cases`, `liability-costs`, `reports`, `salary`, each with `description`, `label` and `metric`. Labels and metrics come from `metric-vocabulary`. [personnel-topic-config.ts:export const personnelTopics]
- Type `PersonnelTopic`: the keys of `personnelTopics`. [personnel-topic-config.ts:export type PersonnelTopic]

### personnel.ts

- `loadPersonnelSummaries(options: { agencyId? } = {}): Promise<PersonnelSummary[]>` returns one summary per person with a current assignment. [personnel.ts:export const loadPersonnelSummaries]
- `loadPersonnelSummaries` reads current assignments from `public.agency_personnel` using `currentAssignmentSql("ao")`, limited to one agency when `agencyId` is given. [personnel.ts:select * from public.agency_personnel ao]
- `loadPersonnelSummaries` reads the people from `public.personnel`. [personnel.ts:select * from public.personnel where id = any($1)]
- `loadPersonnelSummaries` reads the agencies from `public.agency` joined to `public.location_path` and `public.build_page_payload`. [personnel.ts:bpp.path as canonical_path]
- `loadPersonnelSummaries` counts distinct reports per person from `public.review_personnel`. [personnel.ts:from public.review_personnel ro]
- `loadPersonnelSummaries` counts distinct civil cases per person from `public.civil_case_personnel`. [personnel.ts:from public.civil_case_personnel cco]

### release-news.ts

- Type `SourceReference`: optional `namespace`, `sourceId`, `canonicalId`. [release-news.ts:export type SourceReference]
- Type `Occurrence`: `url`, `title`, `publishedAt`, `sourceName`, `summary`, and optional `namespace`, `sourceId`, `publisherAttribution`, `domainRank`. [release-news.ts:export type Occurrence]
- Type `Relationship`: a `SourceReference` plus `agencyPersonnelId`, `occurrenceUrl`, `confidence`, `notes`, and optional `needsCorrection`. [release-news.ts:export type Relationship]
- Type `ReleaseArticle`: a `SourceReference` plus `preferredUrl`, `normalizedUrl`, `notes`, `occurrences`, `relationships`. [release-news.ts:export type ReleaseArticle]
- Type `Officer`: `slug`, `first_name`, `last_name`. [release-news.ts:export type Officer]
- Type `Ranking`: `windowEnd`, `placements`. [release-news.ts:export type Ranking]
- `selectCoverageLink(article, assignments, officers)` picks one occurrence of an article and returns `id`, `namespace`, `sourceId`, `url`, `title`, `source_name`, `published_at`, `summary`, `notes`, `officers`. [release-news.ts:export function selectCoverageLink]
- Type `CoverageLink`: the return type of `selectCoverageLink`. [release-news.ts:export type CoverageLink]
- `releaseAliases(articles)` returns `{ CoverageLink }`, a map from a source id to the source id that replaces it. [release-news.ts:export function releaseAliases]
- `pageNews(articles, ranking?)` returns `{ news: { target, template, data } }` for the page-part template `coverage-item`. [release-news.ts:export function pageNews]

### report-archives.ts

- Type `ReportArchiveScope`: `"state" | "county" | "place"`. [report-archives.ts:export type ReportArchiveScope]
- `buildReportArchiveStaticPaths(reports, scope)` returns `{ params: { category, administrativeArea, place, parts }, props: { pagePath, breadcrumbs, reports, title } }` for each archive page. It reads no database. [report-archives.ts:export const buildReportArchiveStaticPaths]

### report-paths.ts

- Type `ReportDateParts`: `day`, `month`, `year`. [report-paths.ts:export type ReportDateParts]
- `normalizeReportDate(value)` returns a `YYYY-MM-DD` string, or `""` for an empty or invalid value. [report-paths.ts:export const normalizeReportDate]
- `getReportDateParts(value, reportId)` returns the year, month and day strings. [report-paths.ts:export const getReportDateParts]
- `buildReportCanonicalPath(report)` returns the location path followed by `reports/{year}/{month}/{day}/{slug}/`. [report-paths.ts:export const buildReportCanonicalPath]
- `parseLocationPathParts(locationPath, reportId)` returns `{ state, administrativeArea, place }`. [report-paths.ts:export const parseLocationPathParts]

### reports.ts

- `loadReportSummaries(): Promise<ReportSummary[]>` copies each payload from `loadReportSummaryBuildPayloads()` into a `ReportSummary`. It contains no SQL. [reports.ts:export const loadReportSummaries]

### summaries.ts

- Re-exports `loadAgencySummaries` and `resolveAgencyByStateSlug` from `agencies.ts`. [summaries.ts:resolveAgencyByStateSlug]
- Re-exports `loadPersonnelSummaries` from `personnel.ts`. [summaries.ts:loadPersonnelSummaries]
- Re-exports `loadReportSummaries` from `reports.ts`. [summaries.ts:loadReportSummaries]

### types.ts

- Type `PersonnelSummary`: `id`, `slug`, `lastName`, `firstName`, `title`, `reportCount`, `civilCaseCount`, `agencyName`, `agencyState`, `agencyCanonicalPath`, and optional `nameSuffix`. [types.ts:export type PersonnelSummary]
- Type `AgencySummary`: `id`, `slug`, `name`, `state`, `canonicalPath`, `activePersonnelCount`, `reportCount`, `civilCaseCount`, and optional `administrativeArea`, `administrativeAreaSlug`, `city`, `placeSlug`, `address`, `zipCode`, `phoneNumber`. [types.ts:export type AgencySummary]
- Type `AgencyFinderResult`: `id`, `name`, `state`, `canonicalPath`, and optional `city`, `administrativeArea`, `administrativeAreaSlug`, `zipCode`. [types.ts:export type AgencyFinderResult]
- Type `ReportSummary`: `id`, `slug`, `state`, `locationPath`, `canonicalPath`, `year`, `month`, `day`, `administrativeAreaName`, `administrativeAreaSlug`, `placeName`, `placeSlug`, `stateName`, `title`, `incidentDate`, `agencySlug`, `agencyName`, `agencyCanonicalPath`, and optional `address`, `latitude`, `longitude`, `ratingOverall`, `personnelSlugs`, `personnel`. [types.ts:export type ReportSummary]

## Invariants

### Across files

- An agency's public URL is the projected `canonicalPath` or `canonical_path` when one is supplied; otherwise it is the location path followed by the slug. `requireAgencyCanonicalPath` throws `Agency {id} is missing required location_path_id-backed URL fields` when neither can be built. [location-paths.ts:is missing required location_path_id-backed URL fields]
- Loaders that inner-join `public.build_page_payload` with `page_type = 'agency'` leave out agencies that have no such row, with no error. This applies to `loadAgencySummaries`, `loadPersonnelSummaries`, `loadCivicTopicRecords`, `loadCivilCasesByState` and `loadCivilCaseDetail`. [agencies.ts:bpp.entity_id = a.id]
- Civil cases are selected in two different ways. `loadCivilCasesByState` uses the case's own incident location. `loadCivicTopicRecords`, `loadCivilCaseCountsByAgencyState`, `loadAgencySummaries` and the federal loaders use links through `public.civil_case_personnel` and `public.agency_personnel`, including other assignments of the same person. [civil-case-scopes.ts:join public.agency_personnel target_ao]
- A state licensing authority must sit on a location with `level` equal to `state` and a path of exactly one segment. `licensing-authority.ts` and `licensing.ts` check both conditions. [licensing-authority.ts:Expected exactly one state licensing authority at]
- `data-annotations.ts` checks only that the authority's location path has exactly one segment; it does not check `level`. [data-annotations.ts:requires a state path.]
- These loads cache a promise for the life of the process and never reset it, so a failed load stays failed: `loadLocationBuildPayloads`, `loadReportSummaryBuildPayloads`, `loadArrestProfilesForPersonnel`, `loadArrestProfilesForAgency`, `loadReleaseCoverage`, `loadDataAnnotations`, the full licensing load, and the two "has rows" sets for discipline and education. [build-payloads.ts:locationPayloadCache ??=]

### agencies.ts

- Throws `Agency {id} is missing required {field}` when a required field is blank. In `loadAgencySummaries` the fields are `id`, `name`, `state`, `slug`, `location administrative_area`, `location administrative_area_slug`, `location place_slug`. [agencies.ts:location administrative_area_slug]
- `loadAgencySummaries` also passes the projected `canonical_path` to `requireAgencyCanonicalPath`, which throws when it is blank. [agencies.ts:canonicalPath: requireAgencyCanonicalPath({]
- In `loadAgencyFinderResults` the required fields are `id`, `name`, `state`, `location administrative_area`, `canonicalPath`. [agencies.ts:"canonicalPath"]
- `city`, `address`, `zipCode` and `phoneNumber` become `null` when empty. [agencies.ts:agency.phone_number || null]
- Both loaders sort by `name`, then `id`, with `Intl.Collator("en", { sensitivity: "base" })`. [agencies.ts:sensitivity: "base"]
- `administrativeAreaSlug` and `placeSlug` are lower-cased; `state` is not. `resolveAgencyByStateSlug` does not lower-case its `state` argument. [agencies.ts:agency.state.toLowerCase() === state &&]
- Neither loader caches; each `resolve*` call runs the full summary query again. [agencies.ts:const agencies = await loadAgencySummaries();]

### agency-civil-case-rows.ts

- A case that is both direct and personnel-linked gets the type `Direct + personnel-linked`, and its personnel lists are merged without duplicates by `id`. [agency-civil-case-rows.ts:Direct + personnel-linked]
- A case found only through personnel gets the type `Personnel-linked`. [agency-civil-case-rows.ts:"Personnel-linked"]
- A person is listed only when `id`, `slug` and name are all present; others are dropped with no error. The link is `/personnel/{slug}/`. [agency-civil-case-rows.ts:/personnel/${slug}/]
- The outcome label is the trimmed `outcome`; when it is empty the label is `--` for a terminated case and `Ongoing` otherwise. [agency-civil-case-rows.ts:"Ongoing"]
- Rows are sorted by `filed_date` descending (a missing date sorts last), then by `title` with a numeric, base-sensitivity collator. [agency-civil-case-rows.ts:numeric: true]
- The file throws no errors. [agency-civil-case-rows.ts:casesById]

### agency-detail.ts

- `requireAgencyText` throws `Agency {id} is missing required {field}` for a blank value. [agency-detail.ts:is missing required]
- `loadAgencyStaticPaths` requires `id`, `state`, `slug` and `canonical path`. [agency-detail.ts:"canonical path"]
- `loadAgencyLocationStaticPaths` and `loadAgencyLocationStaticPathsForTopic` require `id` and `path`. [agency-detail.ts:requireAgencyText(agency.path, "path", agencyId)]
- `loadAgencyDetailByRouteParams` requires `route category`, `route administrativeArea`, `route place` and `route agencySlug`. [agency-detail.ts:"route administrativeArea"]
- `loadAgencyDetail` requires `id`, `name`, `state`, `slug`, `administrative_area`, `administrative_area_slug`, `city`, `place_slug` and `location_path`. [agency-detail.ts:"administrative_area_slug"]
- Throws `Agency {id} has malformed projected canonical path {path}.` unless the path has exactly four segments. [agency-detail.ts:has malformed projected canonical path]
- Throws `Agency route {path} did not resolve.` when no agency matches the route's location path and slug. [agency-detail.ts:did not resolve.]
- Throws `Agency route {path} resolved to {other}.` when the loaded agency's path differs from the route path. [agency-detail.ts:resolved to]
- An unknown agency id in `loadAgencyDetail` fails with a plain `TypeError` when the code reads `data.agency.id`; there is no descriptive message. [agency-detail.ts:data.agency.id]
- `agencyPath` and `canonicalAgencyPath` are the same value. [agency-detail.ts:const agencyPath = canonicalAgencyPath]
- `categoryLabel` is the state name from `US_STATE_TILES`, or the upper-cased state code when no tile matches. [agency-detail.ts:agencyState.toUpperCase()]
- Employees are sorted by last name, first name, start date, end date, then `personnel_id`. [agency-detail.ts:comparePersonnelEntry]
- `currentEmployees` passes `isCurrentAssignment` and `formerEmployees` passes `isEndedAssignment`; an employee can be in neither list. [agency-detail.ts:isCurrentAssignment(employee.entry)]
- `reportCount` and `personnelDisciplineCount` cover all of a person's agencies; `disciplineCount` and `counts.discipline` cover this agency only. [agency-detail.ts:personnelDisciplineCount]
- A personnel-linked case's `relationship` is `current`, `former` or `uncertain`. [agency-detail.ts:"uncertain"]
- A personnel-linked case link is left out, with no error, when the case's agency has no `page_type = 'agency'` row in `public.build_page_payload`. [agency-detail.ts:case_bpp.entity_id = case_agency.id]
- A report id with no build projection is skipped with a warning; it does not throw. Remaining reports sort by `incidentDate` descending. [agency-detail.ts:has no build projection; skipping.]
- Results are cached per agency id only when `process.env.NODE_ENV` is `production`; the cache keeps the promise, including a rejected one. [agency-detail.ts:agencyDetailCache]

### ai-complaint-summary.ts

- Throws `Expected a complaint summary or unavailability object.` when a value is not a plain object. Only strict `null` means "absent"; `undefined` throws. [ai-complaint-summary.ts:Expected a complaint summary or unavailability object.]
- Throws `Expected nonblank complaint summary text.` for `summary`, `sourcePage`, `sourceUrl`, `checkedAt` or `detail` that is not a non-blank string. [ai-complaint-summary.ts:Expected nonblank complaint summary text.]
- Throws `AI complaint summary requires an HTTP source URL.` when `sourcePage` or `sourceUrl` is not `http:` or `https:`. [ai-complaint-summary.ts:AI complaint summary requires an HTTP source URL.]
- A `sourcePage` or `sourceUrl` that cannot be parsed as a URL fails with the `TypeError` thrown by the `URL` constructor, not with the message above. [ai-complaint-summary.ts:new URL(value).protocol]
- Throws `AI complaint summary requires a valid source date.` when the date part of `checkedAt` is not a real calendar date. [ai-complaint-summary.ts:AI complaint summary requires a valid source date.]
- Throws `AI complaint summary requires a retrieval timestamp with timezone.` when `checkedAt` has no time or no `Z` or offset. [ai-complaint-summary.ts:AI complaint summary requires a retrieval timestamp with timezone.]
- Throws `A completed summary cannot also be unavailable.` when both a summary and an unavailability value are present. [ai-complaint-summary.ts:A completed summary cannot also be unavailable.]
- Throws `Invalid complaint summary state.` when `reason` is not one of the six allowed values. [ai-complaint-summary.ts:Invalid complaint summary state.]

### annotation-access.js

- Throws `Invalid assignment alias.` when the alias is non-empty and contains anything other than lower-case letters and underscores. [annotation-access.js:Invalid assignment alias.]
- "Today" in the predicate is the database's UTC date. [annotation-access.js:current_timestamp at time zone 'UTC']

### annotation-values.js

- `parseAnnotations` throws `Stored data annotations do not satisfy the intake contract.` [annotation-values.js:Stored data annotations do not satisfy the intake contract.]
- `parseSourceValues` throws `Stored source evidence does not satisfy the intake contract.` [annotation-values.js:Stored source evidence does not satisfy the intake contract.]
- The built-in schema checker throws `Unsupported generated annotation schema.` for a schema form it does not handle. It checks `minLength` against the trimmed string, requires finite numbers, and does not implement `enum`. [annotation-values.js:Unsupported generated annotation schema.]
- `paginateAnnotations` throws `Invalid annotation page.` when the page is not a whole number between 1 and the last page. Page 1 of an empty list is valid. [annotation-values.js:Invalid annotation page.]
- `reportedDate` throws `Invalid database date.` for an invalid `Date`. [annotation-values.js:Invalid database date.]
- A field is an internal reference when it is `id` or ends in `_id` and does not start with `source_`. For those fields `annotationDisplay` hides the values and renames the field (`location_path_id` becomes `Administrative area`; any other drops its `_id` ending and shows underscores as spaces). [annotation-values.js:internalReferenceField]
- `annotationDisplay` removes internal-reference keys from the evidence of every entry, whatever the entry's own field is. [annotation-values.js:.filter(([key]) => !internalReferenceField(key))]
- `annotationDisplay` replaces the message with `Excluded duplicate of an existing record.` for a duplicate in `excluded_records`. [annotation-values.js:Excluded duplicate of an existing record.]
- `annotationDisplay` replaces the message with `Applied an explicit administrative correction.` for a reference field whose message is the conditional source correction text. [annotation-values.js:Applied an explicit administrative correction.]
- `annotationsCsv` quotes every data cell, joins lines with CRLF, and fills `replacement_value` only for corrections whose values are shown. [annotation-values.js:annotationsCsv]

### annotation-views.ts

- Filters are ordered with all providers first, then each provider in first-seen order; inside each, the types are all, `warning`, `error`, `correction`. Filters with no entries are still returned. [annotation-views.ts:"correction"]
- When `namespaces` is given there is no per-provider breakdown, and the entries are first narrowed with `authorityAnnotations(entries, namespaces, authorityId)`. [annotation-views.ts:authorityAnnotations(entries, namespaces, authorityId)]
- A filter's `parts` is `source/{URL-encoded namespace}`, then `type/{type}`, joined with `/`; each is left out when it is not set. [annotation-views.ts:encodeURIComponent(provider)]
- Each filter has at least one page. Page 1 has no `page/` segment. [annotation-views.ts:page/]
- The page count uses `PAGE_SIZE` from `src/lib/pagination`, while `paginateAnnotations` slices by a fixed 50; the two agree only while `PAGE_SIZE` is 50. [annotation-views.ts:PAGE_SIZE]

### arrest-beats.ts

- Throws `Missing arrest beat boundaries; reacquire and transform the agency source` when boundaries is not an array. [arrest-beats.ts:Missing arrest beat boundaries]
- Throws `Invalid arrest beat boundary` for a boundary without a non-empty `code`, `name`, and a `Polygon` or `MultiPolygon` geometry with coordinates. [arrest-beats.ts:Invalid arrest beat boundary]
- Throws `Duplicate arrest beat boundary {code}` for a repeated code. [arrest-beats.ts:Duplicate arrest beat boundary]
- Throws `Invalid arrest beat count {code}` when a count is not a non-negative whole number. [arrest-beats.ts:Invalid arrest beat count]
- Throws `Missing boundary for arrest beat {code}` for a counted code with no boundary. The key `unknown` needs no boundary and is reported as `unmapped`. [arrest-beats.ts:Missing boundary for arrest beat]
- Throws `Arrest beat counts do not match profile total` when the counts do not add up to `total`. [arrest-beats.ts:Arrest beat counts do not match profile total]
- Throws `Arrest beat boundary has no interior label point` when no interior span is found. [arrest-beats.ts:has no interior label point]
- Beats keep the input order; a boundary with no count gets 0. [arrest-beats.ts:count: counts[beat.code] ?? 0]

### arrest-income.js

- Only cells whose `incomeStatus` is `matched` are placed in an income range; all others count as `Unknown`. [arrest-income.js:"matched"]
- Throws `Matched arrest is missing a valid neighborhood income estimate` when a matched cell has no tract or no finite, non-negative estimate. [arrest-income.js:Matched arrest is missing a valid neighborhood income estimate]
- Cells outside the inclusive `firstMonth` to `lastMonth` window are skipped for both the personnel and the agency counts. [arrest-income.js:function counts]

### arrest-profiles.ts

- Each of the two queries runs at most once per process; one invalid row fails the load for every person or agency. [arrest-profiles.ts:profilesByPersonnel ??=]
- A personnel profile that has `by_income_status` or `by_arrest_beat` must have exactly one agency profile with the same source that covers its months, or the loader throws `Expected one agency comparison for arrest profile {id}; found {n}`. [arrest-profiles.ts:Expected one agency comparison for arrest profile]
- Throws `Income counts do not cover all arrests in profile {id}` when the income rows do not add up to `totalArrests`. [arrest-profiles.ts:Income counts do not cover all arrests in profile]
- A personnel profile's beat map uses boundaries from the agency profile and counts from the personnel profile. [arrest-profiles.ts:arrest_beat_boundaries]
- An agency profile has a `beatMap` only when its breakdowns have `by_arrest_beat`, and never has `incomeRows`. [arrest-profiles.ts:beatMap: Object.hasOwn(row.breakdowns, "by_arrest_beat")]
- `agency.href` in both loaders is the agency's location path followed by its slug, built by `requireAgencyCanonicalPath`. [arrest-profiles.ts:href: requireAgencyCanonicalPath(row)]
- Profiles for one person are ordered by `coverage.firstMonth`, then `id`. [arrest-profiles.ts:order by assignment.personnel_id]
- Profiles for one agency are ordered by `coverage.firstMonth`, then `id`. [arrest-profiles.ts:order by profile.agency_id]

### assignment-status.js

- An assignment is current when it exists, has no end date (stored or in evidence), and its start date is not invalid or in the future. [assignment-status.js:getAssignmentStatus]
- An assignment is ended when its end date is valid and before today (UTC), its start date is not uncertain, and the end date is not before the start date. Otherwise it is unknown. [assignment-status.js:toISOString().slice(0, 10)]
- A valid end date of today or later sets `endDateImplausible` and does not count as ended. [assignment-status.js:endDateImplausible]
- `selectHeadlineAssignment` picks the last current entry; if none and any entry is unknown, the last entry in input order; otherwise the entry with the latest end date; `null` for an empty history. [assignment-status.js:hasUncertainHistory]
- The file throws nothing itself; `reportedDate` can throw for an invalid `Date`. [assignment-status.js:./annotation-values.js]

### build-payloads.ts

- Every caller receives the same array instance, so a caller that changes the array changes it for all callers. [build-payloads.ts:locationPayloadCache ??=]
- Payload shapes are not checked at run time; the file throws no errors of its own. [build-payloads.ts:loadLocationBuildPayloads]

### civic-index.ts

- Throws `Expected a non-empty path segment in {path}.` [civic-index.ts:Expected a non-empty path segment in]
- Throws `Expected state path segment for location {path}.` [civic-index.ts:Expected state path segment for location]
- Throws `Expected children payload array for {level} page at {path}.` in the state and county builders. [civic-index.ts:Expected children payload array for]
- Throws `Expected agencies payload array for {level} page at {path}.` in the place builder. [civic-index.ts:Expected agencies payload array for]
- Throws `Expected parentPath for {level} page at {path}.` in the county and place builders. [civic-index.ts:Expected parentPath for]
- Rows are sorted by `label` with `civicIndexCollator`; jump options follow row order. [civic-index.ts:civicIndexCollator.compare(a.label, b.label)]
- Children and agencies without a `mapPoint` are left off the map but stay in the rows. [civic-index.ts:.filter((child) => child.mapPoint)]
- A stat cell with a count of 0 has `value: null` and a help link; the reports cell links to `/report/new/` with the label `Share an experience →`, the others use `Help collect this →`. [civic-index.ts:Share an experience →]
- A populated reports cell links to `{pagePath}reports/` and a populated civil cases cell links to `{pagePath}civil-cases/`. [civic-index.ts:View civil cases →]
- The agencies cell has the meta `Statewide` for a state and `Countywide` otherwise. [civic-index.ts:Countywide]
- An agency map point's `meta` is the address, or the word `Agency` when there is no address. [civic-index.ts:meta: agency.address || "Agency"]
- Every model has `jurisdictionLabel: "Police conduct"`. [civic-index.ts:jurisdictionLabel: "Police conduct"]

### civic-scoped-routes.ts

- Throws `Missing required location payload for path: {path}`. [civic-scoped-routes.ts:Missing required location payload for path:]
- Throws `Expected {level} location payload for {path}, received {level}.` [civic-scoped-routes.ts:received]
- Throws `Malformed {level} path for scoped route params: {path}` unless a county path has two segments and a place path has three. [civic-scoped-routes.ts:path for scoped route params:]
- The topic loaders return an empty list for every kind except `reports` and `civil-cases`. [civic-scoped-routes.ts:hasCivicScopedTopicData]
- State params come from the payload's `state` field; county and place params come from path segments. [civic-scoped-routes.ts:params: { category: state.state }]

### civic-topic-records.ts

- Throws `Topic record {id} is missing required {field}.` for a blank case `id`, `title`, `slug` or `filed_date`, agency `id`, path, slug or name, or person `id`, name or slug. [civic-topic-records.ts:is missing required ${fieldName}.]
- `totalCount` counts every case in scope, while `rows` holds at most 200. [civic-topic-records.ts:limit 200]
- `connectionType` is `Direct + officer transfer`, `Officer transfer` or `Direct`. [civic-topic-records.ts:"Direct + officer transfer"]
- A case is in scope when any person on it has any assignment at an agency under the page path. The agencies and people listed for a case are not limited to the scope. [civic-topic-records.ts:target_ao.personnel_id = case_ao.personnel_id]
- Kinds other than `civil-cases` return empty rows with a label such as `Budget records are not projected for this scope yet.` [civic-topic-records.ts:Budget records are not projected for this scope yet.]
- The empty label for civil cases is `No civil cases are connected to agencies in this scope.` [civic-topic-records.ts:No civil cases are connected to agencies in this scope.]
- The `title` is `Civil Cases`, `Budget`, `Fatal Force Incidents`, `Liability Costs` or `Outcomes by Income`. [civic-topic-records.ts:title: "Civil Cases"]
- A case links to `/civil-cases/{slug}/` and a person to `/personnel/{slug}/`. An agency link is the agency's location path followed by its slug, built by `requireAgencyCanonicalPath`. [civic-topic-records.ts:slug: requireText(agency.slug, "agency slug", id)]

### civil-case-scopes.ts

- A case counts once per state but can count in several states. A null state becomes `""` and a null count becomes 0; nothing throws. Row order is not set. [civil-case-scopes.ts:String(row.category || "").toLowerCase()]

### civil-cases.ts

- Throws `Civil case {id} is missing required {field}.` for a blank `id`, `slug`, `title`, `claims_summary` or `filed_date`. [civil-cases.ts:is missing required ${fieldName}.]
- A `Date` in `filed_date` or `date_terminated` becomes its UTC `YYYY-MM-DD`. [civil-cases.ts:value.toISOString().slice(0, 10)]
- `cause_number`, `court` and `date_terminated` are optional and become `null` when absent. [civil-cases.ts:typeof row.court === "string" ? row.court : null]
- Rows are ordered by `filed_date desc, title asc, cause_number asc`. [civil-cases.ts:order by filed_date desc, title asc, cause_number asc]

### civil-litigation-category.ts

- The state filter compares the upper-cased path segment with `stateCode` as passed, so a lower-case code matches nothing. [civil-litigation-category.ts:where upper(split_part(lp.path, '/', 2)) = $1]
- Cases are sorted in JavaScript by `filed_date` descending with no tie-breaker. [civil-litigation-category.ts:return rightDate - leftDate;]
- Returned agency objects hold only `id`, `slug`, `name` and `canonicalPath`; the case objects are raw rows cast to `CivilCaseSummary`, so `locationPath` is never set. [civil-litigation-category.ts:as CivilCaseSummary[]]
- The file throws nothing itself; `requireAgencyCanonicalPath` can throw. [civil-litigation-category.ts:canonicalPath: requireAgencyCanonicalPath(entry)]

### civil-litigation-detail.ts

- Returns `null` when no case has the slug. [civil-litigation-detail.ts:if (!civilCase)]
- Throws `Civil case {id} is missing required claims_summary.` [civil-litigation-detail.ts:is missing required claims_summary.]
- `ai_complaint_summary` and `complaint_summary_unavailability` are validated with the functions in `ai-complaint-summary.ts`, which can throw. [civil-litigation-detail.ts:requireComplaintSummaryUnavailability(]
- Links are ordered by `created_at, id`; people by last then first name; agencies by name. [civil-litigation-detail.ts:order by created_at, id]
- `coverageLinks` rows carry `created_at` and `updated_at` and never carry `source_name`, `published_at` or `notes`. [civil-litigation-detail.ts:select id, title, url, created_at, updated_at]

### coverage.ts

- Throws `Incomplete source identity for {id}` when a row has only one of `source_namespace` and `source_id`. [coverage.ts:Incomplete source identity for]
- Throws `Unknown ranked article {id}` when a homepage placement names an article that is not in `public.coverage_links`. [coverage.ts:Unknown ranked article]
- When an article has no occurrence for its own URL, one is built from the article row. [coverage.ts:Database coverage predating source acquisition has metadata on the article row.]
- A relationship gets `needsCorrection: true` only when `correction_reason` is set. [coverage.ts:needsCorrection: true]
- With no homepage window, `ranking` is `undefined` and `home` is empty. [coverage.ts:if (windows.length)]
- Links for an agency or person are sorted by `published_at` descending, then `title`, then source identity; an unknown id returns `[]`. [coverage.ts:sortIdentity(a).localeCompare(sortIdentity(b))]
- `loadReleaseCoverage`, `loadCoverageLinksForAgency`, `loadCoverageLinksForOfficer` and `loadHomepageNews` share one cached load; `loadReleaseRoster` queries every time. [coverage.ts:let cached]

### data-annotations.ts

- Throws `Multiple licensing authorities claim source {namespace}.` [data-annotations.ts:Multiple licensing authorities claim source]
- Throws `Annotation owner requires {field}.` for a blank `subject_kind`, `subject_id`, parent key, `slug`, `path`, `display_name`, `name`, `title` or `location_path_id`. [data-annotations.ts:Annotation owner requires]
- Throws `Unknown annotation owner kind {kind}.` when the kind is not in `annotation-contract.json`. [data-annotations.ts:Unknown annotation owner kind]
- Throws `Missing annotation owner {kind}:{id}.` when the owner row does not exist. [data-annotations.ts:Missing annotation owner]
- Child kinds resolve to a parent kind through a fixed map of 18 entries (for example `LicenseAction` to `License`, `AgencyPhoneNumber` to `Agency`). [data-annotations.ts:CoverageLinkAgencyPersonnel: ["AgencyPersonnel", "agency_personnel_id"]]
- A `Personnel` owner links to `/personnel/{slug}/`. [data-annotations.ts:/personnel/]
- A `FederalAgency` owner links to `/federal/{slug}/`. [data-annotations.ts:/federal/${required(row.slug, "slug")}/]
- A `CivilCase` owner links to `/civil-cases/{slug}/`. [data-annotations.ts:/civil-cases/${required(row.slug, "slug")}/]
- A `LocationPath` owner links to its `path` and is labelled with its `display_name`. [data-annotations.ts:url: required(row.path, "path")]
- A `LicensingAuthority` owner must sit on a one-segment state path, or the loader throws `Authority {id} requires a state path.` [data-annotations.ts:requires a state path.]
- An `Agency` with no current assignment has no record URL. [data-annotations.ts:return { url: null, label: required(row.name, "name") }]
- An `Agency` with a current assignment, and every `Review`, must have exactly one public page, or the loader throws `Expected one public page for {kind}:{id}.` [data-annotations.ts:Expected one public page for]
- That `Agency` owner links to its location path followed by its slug, not to the path stored in `public.build_page_payload`. [data-annotations.ts:${location.url}${required(row.slug, "slug")}/]
- A `Review` owner links to the path stored in `public.build_page_payload`. [data-annotations.ts:url: paths[0].path, label: required(row.title, "title")]
- Throws `Agency {id} requires a location path.` [data-annotations.ts:requires a location path.]
- Throws `Coverage link {id} has no public record owner.` [data-annotations.ts:has no public record owner.]
- Throws `No public annotation owner for {kind}:{id}.` for any other root kind. [data-annotations.ts:No public annotation owner for]
- When `NO_PERSONNEL` is set, annotations owned by a person are left out, and so are `excluded_records` annotations whose value has the kind `Personnel`. [data-annotations.ts:annotation.field === "excluded_records"]
- An annotation on a location with no location page links to `/data-annotations/`. [data-annotations.ts:Keep findings discoverable without creating pages for thin locations.]
- An annotation with no record URL links to its source authority's `data-annotations/` page; the loader throws `No source authority for {kind}:{id} from {namespace}.` when no authority claims the namespace. [data-annotations.ts:No source authority for]
- Throws `Source authority {id} requires a public page.` [data-annotations.ts:requires a public page.]
- Entries are sorted by `source_namespace`, `entity_kind`, `canonical_id`, `field`, `type`, `source_record_id`, `message` in code-unit order. [data-annotations.ts:].join("\u0000")]
- `source_provider` is the authority's name, or the raw namespace when no authority claims it. [data-annotations.ts:providers.get(annotation.source_namespace)?.name ??]

### federal-agencies.ts

- `loadFederalAgencyDetailBySlug` returns `null` for an unknown slug. [federal-agencies.ts:if (!row) return null]
- Throws `Federal agency {slug} has linked agency {id} without a required canonical path.` when a child agency has no agency page payload. [federal-agencies.ts:without a required canonical path.]
- A child agency is included only when it has at least one current assignment. [federal-agencies.ts:and ${currentAssignmentSql("assignment")}]
- Every federal agency's `path` is `/federal/{slug}/`. [federal-agencies.ts:const federalAgencyPath]
- The two loaders count differently: summaries count distinct people, reports and cases across all child agencies, while the detail adds up per-child counts. [federal-agencies.ts:(total, branch) => total + branch.civilCaseCount]
- Summaries are sorted by name with `Intl.Collator("en", { sensitivity: "base" })`; branches are ordered by state, city, then name. [federal-agencies.ts:order by split_part(lp.path, '/', 2), lp.display_name, a.name]
- Values that are not computed show the placeholder `$--`. [federal-agencies.ts:value: "$--"]
- Only `budget` and `liability-costs` are financial topics; they get a two-column table. `outcomes-by-income` has no charts and no metrics. [federal-agencies.ts:kind === "budget" || kind === "liability-costs"]
- `buildFederalCivicIndex` sorts rows with `civicIndexCollator`; the other builders keep input order. [federal-agencies.ts:civicIndexCollator.compare(a.label, b.label)]

### licensing-authority.ts

- `requireStateAuthority` throws `Expected exactly one state licensing authority at {statePath}.` unless there is exactly one row, at that path, at level `state`, on a one-segment path. [licensing-authority.ts:Expected exactly one state licensing authority at]
- `loadStateAuthorityLink` returns `null` only for zero rows. [licensing-authority.ts:if (!rows.length) return null;]
- `loadStateAuthorityPaths` checks every authority and throws when two share a state path. [licensing-authority.ts:rows.filter((row) => row.statePath === authority.statePath)]
- `loadAuthorityNamespaces` throws `Missing licensing authority {id}.` [licensing-authority.ts:Missing licensing authority]
- `loadAuthorityRecords` sorts licenses and actions with `Intl.Collator("en", { sensitivity: "base" })`; discipline is ordered by effective date descending. An unknown id returns three empty lists. [licensing-authority.ts:new Intl.Collator("en", { sensitivity: "base" })]

### licensing.ts

- Throws `Invalid licensing authority state path for {id}.` when a license's authority is not on a one-segment state path. A license with no authority is allowed. [licensing.ts:Invalid licensing authority state path for ${row.authority_id}]
- Throws `Invalid licensing authority state path for discipline {id}.` when a discipline row has no authority, no authority name, or an authority that is not on a state path. [licensing.ts:Invalid licensing authority state path for discipline]
- A license authority with no name gets an empty-string name. [licensing.ts:name: row.authority_name ?? ""]
- The timeline is sorted newest first; entries with no date go last. [licensing.ts:const actionSortTime]
- An unknown person returns empty `licenses` and `timeline`. [licensing.ts:licensesByPersonnel.get(personnelId) || []]
- A person's licenses are ordered by first awarded date descending (missing dates last), then by license type. [licensing.ts:order by l.personnel_id, l.first_awarded desc nulls last, al.name]
- An authority's `href`, on a license and on a discipline record, is its state path followed by `licensing-authority/`. [licensing.ts:${row.authority_path}licensing-authority/]
- `loadDisciplineForPersonnel` returns `[]` with no further query for a person who is not in the set of disciplined people. [licensing.ts:if (!disciplined.has(personnelId))]
- Discipline rows are ordered by effective date descending, and each row's agencies are sorted by name then id. [licensing.ts:const agencyCollator]
- The full licensing load and the set of disciplined people are each loaded once per process. [licensing.ts:let allLicensingPromise]

### location-paths.ts

- The camel-case key is used before the snake-case key, and a projected canonical path is used before location path plus slug. [location-paths.ts:trimText(agency.canonicalPath ?? agency.canonical_path)]

### personnel-education.ts

- The set of people with education rows is loaded once per process; a person not in the set returns `[]` with no query. The file throws nothing. [personnel-education.ts:let educatedPersonnelPromise]

### personnel.ts

- A person is left out, with no error, when there is no `public.personnel` row. [personnel.ts:if (!officer) {]
- A person is left out when there is no assignment without an end date. [personnel.ts:if (activeAssignments.length === 0)]
- The summary's `title` and agency come from the last open assignment in the order returned by `normalizeAgencyHistory` (defined outside this directory in `src/lib/data.js`). [personnel.ts:activeAssignments[activeAssignments.length - 1]]
- A person is left out when the agency of the chosen assignment was not loaded. [personnel.ts:if (!agency) {]
- Report and civil case counts cover every assignment of the person, not only the current one or the requested agency. [personnel.ts:from public.review_personnel ro]
- Summaries are sorted by last name, first name, suffix, then `id` with `Intl.Collator("en", { sensitivity: "base" })`. [personnel.ts:const nameCollator]
- `agencyState` is lower-cased; missing counts are 0. [personnel.ts:agencyState: String(agency.state || "").toLowerCase()]

### release-news.ts

- `selectCoverageLink` throws `No supporting occurrence for {url}` when an assignment's occurrence is not on the article. [release-news.ts:No supporting occurrence for]
- `selectCoverageLink` throws `No preferred occurrence for {url}`. [release-news.ts:No preferred occurrence for]
- `selectCoverageLink` throws `Unknown assignment {id}` when an assignment is not in the `officers` map. [release-news.ts:Unknown assignment]
- The preferred URL's occurrence is used when there are no assignments or when a supporting occurrence is at the preferred URL. Otherwise candidates are ranked: cited publisher first, then lowest `domainRank`, then earliest `publishedAt`, then `url`. [release-news.ts:(a.domainRank ?? Infinity) - (b.domainRank ?? Infinity)]
- Publisher URLs are compared after dropping the scheme, a leading `www.`, trailing slashes, the fragment and tracking query keys. [release-news.ts:function publisherAddress]
- Output `officers` are sorted by last name, first name, then `assignmentId`. [release-news.ts:a.assignmentId.localeCompare(b.assignmentId)]
- `releaseAliases` considers only occurrences in the namespace `com/serpapi/landing-page-search`. [release-news.ts:com/serpapi/landing-page-search]
- `releaseAliases` throws `Missing publisher URL source ID`. [release-news.ts:Missing publisher URL source ID]
- `releaseAliases` throws `Publisher URL belongs to multiple articles: {id}`. [release-news.ts:Publisher URL belongs to multiple articles: ]
- The replacement source id for an article is the article's own `sourceId` when the article is in that namespace and the id is among its occurrences; otherwise it is the first occurrence source id in sorted order. [release-news.ts:[...keys].sort()[0]!]
- `pageNews` includes `ranking` in `data` only when one is passed. [release-news.ts:...(ranking && { ranking })]

### report-archives.ts

- Each report creates archive entries at four levels: no date, year, year and month, and full date. [report-archives.ts:[date.year, date.month, date.day]]
- `pagePath` is `/{state}/reports/` for the state scope, `/{state}/{administrativeArea}/reports/` for the county scope, and the report's location path plus `reports/` for the place scope, followed by the date parts. [report-archives.ts:const pathFor]
- The title is `Reports for {location}` with the date parts added when present. [report-archives.ts:Reports for ${locationLabel}]
- Breadcrumbs start at `Home`. [report-archives.ts:{ label: "Home", href: "/" }]
- Every archive's breadcrumbs include a `Reports` crumb for its scope, so the archive with no date parts ends with a crumb for its own page. A dated archive adds the year and month crumbs above it and leaves out its own, deepest date part. [report-archives.ts:items.push({ label: "Reports", href: reportsPath });]
- Each archive keeps reports in input order; archives with no reports are removed. [report-archives.ts:.filter((archive) => archive.reports.length)]
- Every report needs a complete date and a three-segment location path for every scope, because the helpers in `report-paths.ts` throw otherwise. [report-archives.ts:parseLocationPathParts]

### report-paths.ts

- Throws `Report {id} is missing a complete incident date.` [report-paths.ts:is missing a complete incident date.]
- Throws `Report {id} is missing location_path.path.` [report-paths.ts:is missing location_path.path.]
- Throws `Report {id} location path must end with "/".` [report-paths.ts:location path must end with]
- Throws `Report {id} is missing slug.` [report-paths.ts:is missing slug.]
- Throws `Report {id} must use a place-level location path for report URLs.` unless the path has exactly three segments. [report-paths.ts:must use a place-level location path for report URLs.]
- A string already shaped `YYYY-MM-DD` is returned as it is; other values use the UTC day. [report-paths.ts:parsed.toISOString().slice(0, 10)]

### reports.ts

- Reports are sorted newest incident date first; when dates are equal or cannot be read, by `id` with `Intl.Collator("en", { sensitivity: "base" })`. The file throws nothing and filters nothing. [reports.ts:return dateB.getTime() - dateA.getTime()]

## Side Effects

- Database reads: every loader file queries Postgres through `withDb`. Most import it from `#src/lib/db.js`. [agencies.ts:#src/lib/db.js]
- `coverage.ts` imports the same helper by relative path. [coverage.ts:import { withDb } from "../db.js"]
- `collectDataAnnotations` runs its queries one at a time on the client it is given. [data-annotations.ts:import type { PoolClient } from "pg"]
- No file in this directory writes to the database; every statement is a `select`. [civil-cases.ts:from public.civil_cases]
- Environment variable `NODE_ENV`: `loadAgencyDetail` caches results only when it is `production`. [agency-detail.ts:process.env.NODE_ENV]
- Environment variable `NO_PERSONNEL`: when it is non-blank, `collectDataAnnotations` leaves out annotations owned by a person. [data-annotations.ts:process.env.NO_PERSONNEL]
- No other environment variable is read in this directory, and no file uses `import.meta.env`. Database connection settings are read inside `withDb`, outside this directory. [build-payloads.ts:#src/lib/db.js]
- Console output: `loadAgencyDetail` writes one `console.warn` for each report id that has no build projection. No other file logs. [agency-detail.ts:console.warn]
- File access: no file reads or writes files at run time. `annotation-values.js` and `data-annotations.ts` import `annotation-contract.json` as a JSON module. [annotation-values.js:with { type: "json" }]
- Network: no file makes a network call other than the database connection. `ai-complaint-summary.ts` and `release-news.ts` only parse URLs. [release-news.ts:new URL(]
- System clock: `getAssignmentStatus` reads the current time when `options.now` is not given. [assignment-status.js:new Date()]
- Process-wide cache in `build-payloads.ts`: location payloads. [build-payloads.ts:locationPayloadCache]
- Process-wide cache in `build-payloads.ts`: report summary payloads. [build-payloads.ts:reportSummaryPayloadCache]
- Process-wide caches in `arrest-profiles.ts`: profiles by person and by agency. [arrest-profiles.ts:profilesByAgency]
- Process-wide cache in `coverage.ts`: the full coverage load. [coverage.ts:cached ??= loadCoverage()]
- Process-wide cache in `data-annotations.ts`: the collected annotations. [data-annotations.ts:collected ??= withDb(collectDataAnnotations)]
- Process-wide caches in `licensing.ts`: all licensing, and the set of disciplined people. [licensing.ts:let disciplinedPersonnelPromise]
- Process-wide cache in `personnel-education.ts`: the set of people with education rows. [personnel-education.ts:let educatedPersonnelPromise]
- Process-wide cache in `agency-detail.ts`: agency details by id, in production only. [agency-detail.ts:agencyDetailCache.set]
- These files have no side effects at all: `agency-civil-case-rows.ts`, `ai-complaint-summary.ts`, `annotation-access.js`, `annotation-values.js`, `annotation-views.ts`, `arrest-beats.ts`, `arrest-income.js`, `civic-index.ts`, `location-paths.ts`, `personnel-topic-config.ts`, `release-news.ts`, `report-archives.ts`, `report-paths.ts`, `types.ts`, `constants.ts`. [location-paths.ts:const trimText]

## Verification

Commands are defined in the repository root `package.json`.

- Run: `npm run test:data`. It runs `src/lib/data/assignment-status.test.mjs` (covers `assignment-status.js`) and `scripts/release-news.test.mjs` (covers `release-news.ts`). `scripts/verify-employment-claims.test.mjs` does not import from this directory.
- In the same group, `scripts/report-detail.test.mjs` loads `src/lib/report-detail.ts`, which imports `location-paths.ts` and `report-paths.ts` from this directory. [../../../scripts/report-detail.test.mjs:"./data/location-paths.js", "./data/report-paths.js"]
- Run: `npm test`. It runs every test group. The groups that reference files in this directory are:
  - `test:data`, as above.
  - `test:annotations`: `tests/unit/data-annotations.test.mjs` covers `annotation-values.js`.
  - `test:client`: `scripts/ai-complaint-summary.test.mjs` covers `ai-complaint-summary.ts`.
  - `test:redirects`: `scripts/generate-redirect-map.test.mjs` references `annotation-access.js`.
  - `test:personal-data`: `scripts/scan-personal-data.test.mjs` references `summaries.ts`.
  - `test:e2e`: Playwright specs under `tests/e2e/` reference `agency-detail`, `annotation-access.js`, `annotation-values.js`, `arrest-beats`, `arrest-income.js`, `arrest-profiles`, `build-payloads`, `data-annotations`, `federal-agencies`, `licensing`, `licensing-authority` and `personnel-education`.
