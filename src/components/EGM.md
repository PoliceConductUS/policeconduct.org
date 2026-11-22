# components

## Overview

Shared Astro components for PoliceConduct.org pages, plus one TypeScript type
module. Components receive already-loaded data through props; a small number
load data themselves at build time (listed under Side Effects). Several
components ship a client `<script>` that enhances server-rendered markup in the
browser. Whole-page components (`*Page.astro`) wrap their output in
`#src/layouts/PageShell.astro`, directly or through another whole-page
component: `AgencyCivilCasesPage` and `AgencyReportsPage` through
`AgencyTopicPage`, and `CivicScopedIndexPage` through
`CivicScopedOverviewPage`. `[AgencyReportsPage.astro:<AgencyTopicPage]`
`[CivicScopedIndexPage.astro:CivicScopedOverviewPage]`

Citations use the form `[file:text]`, where `text` appears verbatim in that file
of this directory.

## Interface

### Type module

- `MetricCardAction`: discriminated union on `kind` (`"link"` or `"button"`),
  each with `href` and `label`. `[metric-card-types.ts:export type MetricCardAction]`
- `MetricCardItem`: `{ accent?, action?, detail?, icon?, label, value }`, with
  `accent` and `icon` typed from `#src/lib/metric-vocabulary.js`.
  `[metric-card-types.ts:export type MetricCardItem]`

### Whole-page components

- `AgencyCivilCasesPage`: props `currentPage`, `data` (the `AgencyTopicPage`
  data) and `rows: CivilCaseRow[]`; shows one page of `rows`, `PAGE_SIZE`
  (50) rows per page. `[AgencyCivilCasesPage.astro:PAGE_SIZE]`
- `AgencyReportsPage`: props `currentPage`, `data` (the `AgencyTopicPage` data
  plus `reportedReports`), `lastPage`, `pageReports`; each report needs `title`
  and a `canonicalPath` or `url`. `[AgencyReportsPage.astro:pageReports]`
- `AgencyTopicPage`: props optional `currentPage` (default 1), `data`
  (`agencyName`, `agencyPath`, `administrativeArea`, `administrativeAreaSlug`,
  `categoryLabel`, `categorySlug`, `placeLabel`, `placePath`), `description`,
  `topicLabel`, `topicSlug`; renders a default slot. The page path is
  `${data.agencyPath}${topicSlug}/` on page 1 and adds `page/${currentPage}/`
  after it; the structured data uses that path.
  `[AgencyTopicPage.astro:topicSlug]`
  `[AgencyTopicPage.astro:currentPage > 1 ? `${topicPath}page/${currentPage}/` : topicPath;]`
- `CivicAgencyHierarchyPage`: props `model: FederalAgencyIndexModel` and
  `site: URL | undefined`; renders a default slot.
  `[CivicAgencyHierarchyPage.astro:FederalAgencyIndexModel]`
- `CivicChildIndexPage`: props `currentPage`, `label`,
  `model: CivicIndexModel`, `pagePath`; shows `PAGE_SIZE` rows of
  `model.rows` per page and groups that page's rows by first letter.
  `[CivicChildIndexPage.astro:alphaGroups]`
  `[CivicChildIndexPage.astro:model.rows.slice(]`
- `CivicIndexPage`: props `model: CivicIndexModel` and `site: URL | undefined`;
  renders a default slot and builds prefill payloads for the add-agency,
  add-civil-case and get-updates actions.
  `[CivicIndexPage.astro:addAgencyPrefill]`
- `CivicScopedIndexPage`: props `model: CivicIndexModel` and
  `kind: CivicTopicKind`; composes `CivicScopedOverviewPage` with
  `CivicScopedRowsTable`. `[CivicScopedIndexPage.astro:CivicTopicKind]`
- `CivicScopedOverviewPage`: props `model`, `kind`, optional
  `records: CivicTopicRecords`; `kind` selects one of `budget`, `civil-cases`,
  `fatal-force-incidents`, `liability-costs`, `outcomes-by-income`; renders a
  default slot. `[CivicScopedOverviewPage.astro:pageConfig]`
- `ReportArchivePage`: props `breadcrumbs`, `pagePath`,
  `reports: ReportSummary[]`, `title`; derives the location label by removing
  the `Reports for ` prefix from `title`.
  `[ReportArchivePage.astro:locationLabel]`
- `WatchPage`: props `video: VideoLink`, `videos: VideoLink[]`, `parentTitle`,
  `parentPath`, `watchPath`; emits `VideoObject` structured data and
  previous/next links from the position of `video` in `videos`.
  `[WatchPage.astro:VideoObject]`

### Navigation and layout components

- `Breadcrumb`: props `items` (`label`, optional `href`, optional `current`)
  and optional `className`; emits `BreadcrumbList` JSON-LD.
  `[Breadcrumb.astro:BreadcrumbItem]`
- `DataPanel`: props optional `id`, `title`, optional `description`, optional
  `className`; default slot. `[DataPanel.astro:className]`
- `EntityActionBar`: props optional `primary`, `actions`, `more` (each item
  `{ label, href }`); default slot between the prop-driven actions and the
  "More actions" menu. `[EntityActionBar.astro:ActionItem]`
- `MastheadSearch`: no props; a `role="search"` form that submits `q` by GET to
  `/find-records/`. `[MastheadSearch.astro:data-site-search-input]`
- `PageHeader`: props `title`, optional `eyebrow`, optional `description`;
  default slot and a named `actions` slot. `[PageHeader.astro:hasActions]`
- `Pagination`: props `basePath`, `currentPage`, `lastPage`; shows a window of
  page numbers from `currentPage - 2` to `currentPage + 2`.
  `[Pagination.astro:windowStart]`
- `TableScroll`: no props; default slot wrapping a wide table.
  `[TableScroll.astro:Purely structural: no props]`

### Metric and statistic components

- `MetricCard`: prop `metric: MetricCardItem`; maps `accent` to a role and
  treats `--`, `$--` and the empty string as empty values.
  `[MetricCard.astro:roleByAccent]`
- `MetricCardButton`: prop `href`; default slot.
  `[MetricCardButton.astro:href]`
- `MetricCardLink`: prop `href`; default slot. `[MetricCardLink.astro:href]`
- `MetricGrid`: props `metrics: MetricCardItem[]` and optional `columns`
  (`"auto"`, `"four"`, `"five"`; default `"auto"`).
  `[MetricGrid.astro:columns = "auto"]`
- `OutcomesByIncomePanel`: props optional `href`, optional `className`,
  optional `variant` (`"summary"` or `"detail"`; default `"summary"`); rows are
  fixed placeholder values. `[OutcomesByIncomePanel.astro:outcomeRows]`
- `SampleMeasurementChart`: props `ariaLabel`, `rows` (`label`, `value`,
  optional `width`, optional `segments`), optional `legend`.
  `[SampleMeasurementChart.astro:ChartRow]`
- `StatCell`: exports type `StatCellRole`; props are a union of `MetricProps`
  (`label`, optional `variant` `"strip"` or `"topic"`, `value`, `meta`, `gloss`,
  `href`, `actionLabel`, `empty`, `currency`, `role`, `helpCollectHref`,
  `helpCollectLabel`) and `DrillProps` (`drill: true`, `childCount`,
  `childLabel`, `jumpOptions`, `placeholder`, `selectLabel`, `browseHref`,
  `browseLabel`, optional `id`). `[StatCell.astro:type Props = MetricProps | DrillProps]`
- `StatStrip`: props `ariaLabel`, optional `drillFirst` (default `false`),
  optional `columns` (`"four-plus-jump"`, `"three-plus-jump"`, `"five"`,
  `"four"`); default slot. `[StatStrip.astro:drillFirst = false]`

### Agency, personnel and record components

- `AgencyPersonnelList`: prop `employees` (each with optional `entry`,
  `officer`, `reportCount`, `license`, and required `disciplineCount` and
  `personnelDisciplineCount`); renders the whole agency roster grouped by
  first letter. `[AgencyPersonnelList.astro:EmployeeLike]`
- `ArrestBeatMap`: props `data: BeatMap`, `agencyName`, `firstMonth`,
  `lastMonth`, `source`, `scope` (`"agency"` or `"personnel"`).
  `[ArrestBeatMap.astro:scope: "agency" | "personnel"]`
- `LicenseTimeline`: props `entries: LicenseTimelineEntry[]` and optional
  `initialCount` (default 8). `[LicenseTimeline.astro:initialCount = 8]`
- `LicensingAuthorityRecords`: props are the fields of `AuthorityRecords`:
  `licenses`, `actions`, `discipline`.
  `[LicensingAuthorityRecords.astro:AuthorityRecords]`
- `PersonnelArrestProfiles`: prop `profiles: ArrestProfileRecord[]`; named
  slot `introduction`; renders one table per present entry of `dimensions`,
  plus an income table when a `by_income_status` breakdown exists.
  `[PersonnelArrestProfiles.astro:slot name="introduction"]`
- `PersonnelAssignments`: props `assignmentHistory` (each with `id`, optional
  `title`, `license_id`, `start_date`, `end_date`, and an `agency` with `id`,
  `name`, `slug`, `location_path`, optional `page_type`) and
  `licensing: PersonnelLicensing`.
  `[PersonnelAssignments.astro:assignmentHistory]`
- `PersonnelAssignments` leaves the Role cell empty when an assignment has no
  `title`, and shows the status `Completed`, `Active` or `Status uncertain`
  from `getAssignmentStatus`. `[PersonnelAssignments.astro:<td>{entry.title}</td>]`
- `PersonnelDeceasedNotice`: props `message` and optional `source`.
  `[PersonnelDeceasedNotice.astro:message: string]`
- `PersonnelDiscipline`: prop `records: DisciplineRecord[]`.
  `[PersonnelDiscipline.astro:DisciplineRecord]`
- `PersonnelEducation`: prop `records: EducationRecord[]`.
  `[PersonnelEducation.astro:EducationRecord]`
- `UsaChoroplethMap`: props `stats` (`code`, `count`, optional `href`,
  `hoverLabel`), optional `title`, `subtitle`, `emptyLabel`,
  `interactionLabel`, `federalPanel`, `headerAction`.
  `[UsaChoroplethMap.astro:FederalPanel]`

### Report, civil case and data-note components

- `AiComplaintSummary`: prop `summary: AiComplaintSummary`.
  `[AiComplaintSummary.astro:summary: AiComplaintSummary]`
- `CivicScopedRowsTable`: prop `records: CivicTopicRecords`; renders a table
  only when `records.kind` is `civil-cases` and `records.rows` is not empty,
  headed by `records.totalCount` cases.
  `[CivicScopedRowsTable.astro:renderTable && !empty]`
  `[CivicScopedRowsTable.astro:records.totalCount.toLocaleString("en-US")]`
- `ComplaintSummaryUnavailable`: prop
  `unavailability: ComplaintSummaryUnavailability | null`; the message depends
  on `reason` (`missing_copy`, `available_unsummarized`, or anything else).
  `[ComplaintSummaryUnavailable.astro:available_unsummarized]`
- `CoverageLinks`: prop `links: CoverageLink[]`.
  `[CoverageLinks.astro:CoverageLink]`
- `DataAnnotationIndex`: props `base`, `view` (one element of the
  `annotationPages` result), `filters` (the `annotationFilters` result).
  `[DataAnnotationIndex.astro:view.filterParts]`
- `DataAnnotations`: props `annotations: unknown` and optional `field`; labels
  entries of type `warning`, `error` and `correction` as "Our warning", "Data
  error" and "Our correction". `[DataAnnotations.astro:parseAnnotations]`
  `[DataAnnotations.astro:correction: "Our correction"]`
- `RecordDataNotes`: prop `recordPath`; shows the data notes whose
  `record_url` equals `recordPath`. `[RecordDataNotes.astro:recordPath]`
- `ReportDisclaimer`: no props; fixed text linking to
  `/legal-notice/terms-of-service`.
  `[ReportDisclaimer.astro:/legal-notice/terms-of-service]`
- `ReportNarrative`: props `description: string | null` and
  `facts: ReportDetailFacts`; reads `whatHappened`, `feelings`,
  `desiredOutcome`, `whatElse` and `purpose`.
  `[ReportNarrative.astro:ReportDetailFacts]`

### Action, analytics and prefill components

- `AnalyticsConsent`: no props; renders a hidden `<dialog>` with analytics and
  advertising checkboxes, three buttons, and a hidden Global Privacy Control
  note (`[data-gpc-note]`).
  `[AnalyticsConsent.astro:data-analytics-consent]`
- `GoogleAnalytics`: no props; script only.
  `[GoogleAnalytics.astro:initializeAnalytics]`
- `HelpCollectDataButton`: props `context`, `sourcePage`, optional `topic`;
  builds a message and passes it to `PrefillNavButton`.
  `[HelpCollectDataButton.astro:sourcePage]`
- `PrefillBootstrap`: no props; loads `/prefill-bootstrap.js`.
  `[PrefillBootstrap.astro:/prefill-bootstrap.js]`
- `PrefillNavButton`: props `payload` (object or string), `to`, optional
  `variant` (`"button"` or `"link"`), plus any `<button>` attribute; default
  slot. `[PrefillNavButton.astro:data-prefill-payload]`

### Composition, slots and rendered output

- `AgencyCivilCasesPage` wraps `AgencyTopicPage` with `topicSlug="civil-cases"`,
  renders columns Case, Cause number, Court, Filed (formatted in UTC) and
  Outcome inside `TableScroll`, and adds `Pagination` when there is more than
  one page. `[AgencyCivilCasesPage.astro:topicSlug="civil-cases"]`
  `[AgencyCivilCasesPage.astro:timeZone: "UTC"]`
- `AgencyCivilCasesPage` describes the page with the total count of `rows` as
  civil cases tied to the agency's personnel records.
  `[AgencyCivilCasesPage.astro:civil cases tied to this agency's personnel records.]`
- `AgencyReportsPage` wraps `AgencyTopicPage` with `topicSlug="reports"`, lists
  `pageReports` with a `formatShortDate` incident date when the report has
  one, and adds `Pagination`
  when `lastPage > 1`. `[AgencyReportsPage.astro:topicSlug="reports"]`
- `AgencyTopicPage` passes a six-item breadcrumb trail (Home, category,
  administrative area, place, agency, topic) to `PageShell` and upper-case
  agency names are converted to title case for display.
  `[AgencyTopicPage.astro:agencyDisplayName]`
- `CivicAgencyHierarchyPage` composes `HelpCollectDataButton` and a filter
  input in the `actions` slot, `MetricGrid` (five columns),
  `OutcomesByIncomePanel`, `DataPanel` with `SampleMeasurementChart`, and a row
  table; with `model.isFieldOfficesTable` it uses `TableScroll` and renders no
  section when `model.rows` is empty; otherwise it adds a `View` column.
  `[CivicAgencyHierarchyPage.astro:model.isFieldOfficesTable]`
- `CivicChildIndexPage` sets the canonical URL to
  `${pagePath}page/${page.currentPage}/` for pages after the first and adds
  `Pagination` when `page.lastPage > 1`.
  `[CivicChildIndexPage.astro:canonicalPath]`
- `CivicChildIndexPage` and `AgencyCivilCasesPage` throw when `currentPage` is
  not a whole number from 1 to the last page.
  `[CivicChildIndexPage.astro:has no page]`
  `[AgencyCivilCasesPage.astro:has no page]`
- `CivicIndexPage` renders a `StatStrip` led by a drill `StatCell` built from
  `model.jumpCell`, one `StatCell` per `model.statCells`, a topic row from
  `model.pendingTopics`, an `aside` slot with a link to `/report/new/` and
  three `PrefillNavButton` buttons (`/agency/new/`, `/civil-cases/new/`,
  `/about/contact/`), and a "Licensing authority" link in the `actions` slot
  when a state authority link exists. `[CivicIndexPage.astro:model.pendingTopics]`
- `CivicScopedOverviewPage` renders its slot only when `records` has rows;
  otherwise it renders one empty topic `StatCell` with a help-collect link from
  `buildHelpCollectHref`. `[CivicScopedOverviewPage.astro:hasRows]`
- `CivicScopedRowsTable` renders columns Case, Court, Filed and Agencies
  inside `TableScroll`.
  `[CivicScopedRowsTable.astro:<th scope="col">Agencies</th>]`
- `ReportArchivePage` puts `HelpCollectDataButton` in the `actions` slot,
  renders `MetricGrid` with four columns, two sample charts, and one link per
  report with its `incidentDate` and optional `address`.
  `[ReportArchivePage.astro:report-archive-list]`
- `WatchPage` fills the `header` slot of `PageShell` with a link to the parent
  record and embeds the video in an `iframe` whose `src` is
  `getVideoEmbedUrl(video.url)`; previous/next links use
  `${parentPath}watch/${id}/`. `[WatchPage.astro:slot="header"]`
- `AgencyTopicPage` and `ReportArchivePage` pass `buildCollectionPage`
  structured data to `PageShell` (`ReportArchivePage` lists one item per
  report), and `CivicIndexPage` and `CivicAgencyHierarchyPage` pass
  `buildWebPage` structured data with `type: "CollectionPage"`.
  `[AgencyTopicPage.astro:buildCollectionPage]`
  `[ReportArchivePage.astro:items: reports.map]`
  `[CivicIndexPage.astro:type: "CollectionPage"]`
  `[CivicAgencyHierarchyPage.astro:type: "CollectionPage"]`
- `MetricCard` renders `MetricCardLink` when `action.kind` is `link` and
  `MetricCardButton` otherwise; both render an `<a>`.
  `[MetricCard.astro:action.kind === "link"]`
- `MetricGrid` renders one `MetricCard` per metric. `[MetricGrid.astro:<MetricCard metric={metric} />]`
- `OutcomesByIncomePanel` renders `SampleMeasurementChart` with the legend
  Dismissed, Plea deal, Other outcomes, and a "View details" link only when
  `href` is set. `[OutcomesByIncomePanel.astro:View details]`
- `HelpCollectDataButton` renders a `PrefillNavButton` to `/volunteer/` with a
  payload of `interest`, `skills`, `source_page`, `context` and `topic`.
  `[HelpCollectDataButton.astro:source_page: sourcePage]`
- `EntityActionBar` always renders a "More actions" `<details>` menu holding
  "Copy link" (`data-copy-link`, with a `data-copy-link-status` live region)
  and a link to `/data-and-methods/`, followed by any `more` items.
  `[EntityActionBar.astro:data-copy-link-status]`
- `StatCell` drill shape renders a GET `<form data-jump-form>` whose action is
  `browseHref`, a `<select data-jump-select>` of `jumpOptions`, a
  `data-jump-status` live region and a browse link; the select id defaults to
  `civic-jump`. `[StatCell.astro:data-jump-form]`
- `AiComplaintSummary` splits `summary.summary` into paragraphs on blank lines
  and links to `summary.source.sourcePage`.
  `[AiComplaintSummary.astro:summary.source.sourcePage]`
- `ComplaintSummaryUnavailable` links to `unavailability.sourceUrl` only for
  `available_unsummarized`, and always links to `/donate/`.
  `[ComplaintSummaryUnavailable.astro:unavailability.sourceUrl]`
- `CoverageLinks` renders a `data-page-part="news"` section with one list item
  per link (title, `source_name`, `published_at`, `summary`, `notes`, officers)
  carrying `data-source-namespace` and `data-source-id`, plus a
  `<template data-template="coverage-item">`.
  `[CoverageLinks.astro:data-template="coverage-item"]`
- `DataAnnotationIndex` renders type and source filter links, a count, a CSV
  download link to `${annotationHref(base, view.filterParts)}data.csv`, a table
  of `view.rows` (Record, Field and value, Note, Source), and page links when
  `view.pageCount > 1`. `[DataAnnotationIndex.astro:Download all matching notes (CSV)]`
- `DataAnnotations` shows each entry's label, message, source namespace and
  record id, and optional supporting evidence as JSON; the reported value (and
  the replacement value for corrections) appears only when
  `annotationDisplay` sets `showValues`. `[DataAnnotations.astro:Supporting evidence]`
  `[DataAnnotations.astro:display.showValues]`
- `RecordDataNotes` passes `field`, `value`, `type`, `message`,
  `source_namespace`, `source_record_id` (plus `replacement_value` for
  corrections and `evidence` when defined) to `DataAnnotations`.
  `[RecordDataNotes.astro:source_record_id]`
- `ReportNarrative` renders `description` as HTML with `set:html` under a
  "What happened" heading, and omits both when `description` is null; it
  renders each remaining fact as plain text.
  `[ReportNarrative.astro:set:html={description}]`
- `LicenseTimeline` shows the first `initialCount` entries and puts the rest in
  a `<details>`; an entry with no `actionDate` shows no date, and adverse
  entries get an "Adverse action" flag.
  `[LicenseTimeline.astro:Show all {entries.length} license events]`
  `[LicenseTimeline.astro:formatShortDate(entry.actionDate) : null]`
- `LicensingAuthorityRecords` renders a section nav plus up to three sections:
  a licenses table (type, status, count), a license actions table (action,
  count, latest date) and discipline record cards linking to
  `/personnel/${record.personnelSlug}/`.
  `[LicensingAuthorityRecords.astro:record.personnelSlug]`
- `PersonnelDiscipline` renders one card per record with the authority link,
  effective date, case number, linked agencies, allegation, and a details
  block (end date, rule violation, finding, chief's action, penalty, source
  document). `[PersonnelDiscipline.astro:data-personnel-discipline-id]`
- `PersonnelEducation` renders one card per record (name, completion date,
  credits, sponsor, instructor) under controls that start `hidden`.
  `[PersonnelEducation.astro:data-education-controls hidden]`
- `PersonnelAssignments` renders columns Agency, Role, License, Start Date,
  End Date and Status; a null `end_date` shows `Present`; `DataAnnotations` is
  rendered for the `start_date` and `end_date` fields.
  `[PersonnelAssignments.astro:field="end_date"]`
- `PersonnelArrestProfiles` renders one `<article data-arrest-profile-id>` per
  profile; the year, month, ISO week and day-of-week tables always render, and
  the other dimensions render only when the breakdown key exists.
  `[PersonnelArrestProfiles.astro:Object.hasOwn(profile.breakdowns, key)]`
- `UsaChoroplethMap` renders one SVG path per entry of `USA_STATE_PATHS`,
  seven small-state pills (MA, CT, RI, NJ, DE, MD, DC), an optional header
  action (a `PrefillNavButton` when `prefillPayload` is set), an optional
  federal panel, and a help-collect link to `/volunteer/?source=<path>`.
  `[UsaChoroplethMap.astro:SMALL_STATE_CHIPS]`

## Invariants

- `Pagination` renders nothing when `lastPage` is 1 or less;
  `DataAnnotations` and `RecordDataNotes` render nothing when there are no
  entries; `LicenseTimeline` renders nothing when `entries` is empty.
  `[Pagination.astro:lastPage > 1]`
  `[DataAnnotations.astro:entries.length > 0]`
  `[RecordDataNotes.astro:recordAnnotations.length > 0]`
- `CoverageLinks` keeps its section in the page but sets `hidden` when there
  are no links. `[CoverageLinks.astro:hidden={!links.length}]`
- `StatCell` treats a cell as empty when `empty` is set, or when `value` is
  null or the empty string; an empty cell is never a link and shows the
  help-collect link only when `helpCollectHref` is given.
  `[StatCell.astro:props.empty ?? (value == null || value === "")]`
- `DataAnnotationIndex` does not link the record label when the entry field is
  `excluded_records`. `[DataAnnotationIndex.astro:excluded_records]`
- `AgencyPersonnelList` renders a name without a link when the officer has no
  `slug`, and labels a record with no name `Unnamed record`.
  `[AgencyPersonnelList.astro:Unnamed record]`
- `CivicAgencyHierarchyPage` renders the linked `OutcomesByIncomePanel` summary
  only when the page is not a federal topic page, and on an
  `/outcomes-by-income/` page it renders an unlinked `OutcomesByIncomePanel`
  in place of the `model.charts` panels; `MetricGrid` renders only when
  `model.metrics` is not empty.
  `[CivicAgencyHierarchyPage.astro:isFederalTopicPage]`
  `[CivicAgencyHierarchyPage.astro:isOutcomesByIncomePage ? (]`
- `AgencyReportsPage` throws when a report has neither `canonicalPath` nor
  `url`. `[AgencyReportsPage.astro:is missing a canonical path.]`
- `Pagination` throws when `basePath` does not end with `/`.
  `[Pagination.astro:Pagination basePath must end with '/']`
- `Pagination` links page 1 to `basePath` itself and later pages to
  `${basePath}page/${n}/`. `[Pagination.astro:page/${pageNumber}/]`
- `PersonnelArrestProfiles` throws when a profile has a `by_income_status`
  breakdown but no `incomeRows`.
  `[PersonnelArrestProfiles.astro:Missing income comparison for arrest profile]`
- `PersonnelArrestProfiles` renders nothing when `profiles` is empty, and
  shows `--` for a percentage whose total is zero.
  `[PersonnelArrestProfiles.astro:profiles.length > 0]`
  `[PersonnelArrestProfiles.astro:total === 0 ? "--"]`
- `PersonnelAssignments` throws when an assignment's `license_id` is not in
  `licensing.licenses`. `[PersonnelAssignments.astro:references missing license]`
- `PersonnelAssignments` links an agency name only when
  `entry.agency.page_type` is `agency`, using `requireAgencyCanonicalPath`.
  `[PersonnelAssignments.astro:requireAgencyCanonicalPath]`
- `AgencyPersonnelList` takes assignment status from `getAssignmentStatus`, the
  same function the personnel profile uses, and sorts rows by surname with a
  first-name fallback using `civicIndexCollator`.
  `[AgencyPersonnelList.astro:getAssignmentStatus]`
  `[AgencyPersonnelList.astro:civicIndexCollator.compare(a.sortKey, b.sortKey)]`
- `AgencyPersonnelList` always renders the "With discipline actions" checkbox;
  it filters on `personnelDisciplineCount`, while the per-row discipline link
  uses `disciplineCount` and appears only for linked rows.
  `[AgencyPersonnelList.astro:data-discipline-count={row.personnelDisciplineCount}]`
  `[AgencyPersonnelList.astro:row.disciplineCount > 0 && row.href]`
- `AgencyPersonnelList` shows the search, facet and jump tools only when the
  roster has 15 or more rows. `[AgencyPersonnelList.astro:showTools = total >= 15]`
- `Breadcrumb` adds a `Home` item when the trail does not start with it, marks
  the last item current when none is flagged, and emits JSON-LD only when the
  trail has at least two items and every non-current item has an `href`.
  `[Breadcrumb.astro:hasValidTrail]`
- `Breadcrumb` escapes `<` in the serialized JSON-LD.
  `[Breadcrumb.astro:serializedBreadcrumbData]`
- `CivicScopedRowsTable` shows at most the first 50 civil case rows.
  `[CivicScopedRowsTable.astro:records.rows.slice(0, 50)]`
- `ReportArchivePage` reads `reports[0]!.year`, so `reports` must not be
  empty. `[ReportArchivePage.astro:reports[0]!.year]`
- `ReportNarrative` omits the "What happened" section when its visible text
  equals the visible text of `description`.
  `[ReportNarrative.astro:existingText !== visibleText(text)]`
- `SampleMeasurementChart` accepts `width` and `segments` but does not render
  them. `[SampleMeasurementChart.astro:intentionally not rendered]`
- `StatCell` never renders a numeric zero for an unavailable metric; it shows
  `--`, or `$--` when `currency` is set.
  `[StatCell.astro:an unavailable metric never renders a]`
- `ArrestBeatMap` renders the map container only when `data.beats` is not
  empty. `[ArrestBeatMap.astro:data.beats.length > 0]`
- `UsaChoroplethMap` fills states on a log scale of `count`, and a state is
  interactive only when its stat has an `href`.
  `[UsaChoroplethMap.astro:isInteractive]`
- `PrefillNavButton` uses the pathname of `to` as the storage key.
  `[PrefillNavButton.astro:storageKey]`
- `CivicIndexPage` loads a state authority link only when `model.level` is
  `state`. `[CivicIndexPage.astro:loadStateAuthorityLink]`
- `CoverageLinks` renders officer names as `span` instead of `a` when the
  `NO_PERSONNEL` environment variable is set to a non-blank value at build
  time. `[CoverageLinks.astro:process.env.NO_PERSONNEL?.trim()]`
- `MastheadSearch`, `AnalyticsConsent`, `Breadcrumb` and `EntityActionBar`
  mark their markup `data-pagefind-ignore` so it stays out of the search index.
  `[MastheadSearch.astro:data-pagefind-ignore]`
  `[AnalyticsConsent.astro:data-pagefind-ignore]`
  `[Breadcrumb.astro:<nav aria-label="Breadcrumb" data-pagefind-ignore>]`
  `[EntityActionBar.astro:<div class="entity-actions" data-pagefind-ignore>]`
- `PersonnelAssignments` always renders its section heading and renders the
  assignment table only when `assignmentHistory` is not empty.
  `[PersonnelAssignments.astro:{assignmentHistory.length ? (]`

## Side Effects

- `PersonnelAssignments` queries `public.data_annotation` at build time through
  `withDb`, for active rows with `subject_kind = 'AgencyPersonnel'`.
  `[PersonnelAssignments.astro:from public.data_annotation]`
- `RecordDataNotes` calls `loadDataAnnotations()` at build time.
  `[RecordDataNotes.astro:loadDataAnnotations]`
- `CivicScopedIndexPage` calls `loadCivicTopicRecords(model, kind)` at build
  time. `[CivicScopedIndexPage.astro:loadCivicTopicRecords]`
- `CivicIndexPage` calls `loadStateAuthorityLink(model.pagePath)` at build
  time. `[CivicIndexPage.astro:loadStateAuthorityLink]`
- `CoverageLinks` reads `process.env.NO_PERSONNEL` at build time.
  `[CoverageLinks.astro:process.env.NO_PERSONNEL]`
- `PrefillNavButton` binds one delegated document click handler per page
  (guarded by `__ipcPrefillBound`), sends `prefill_link_click` (and
  `map_header_action_clicked` for header actions) to
  `window.__IPC_ANALYTICS__`, writes the payload to `sessionStorage`, then
  navigates with `window.location.assign`.
  `[PrefillNavButton.astro:window.sessionStorage.setItem]`
- `PrefillBootstrap` loads the external script `/prefill-bootstrap.js`.
  `[PrefillBootstrap.astro:is:inline]`
- `AnalyticsConsent` runs `initializeConsentControls()` from
  `../lib/client/analytics-consent.js` in the browser.
  `[AnalyticsConsent.astro:initializeConsentControls]`
- `GoogleAnalytics` runs `initializeAnalytics()` from
  `../lib/client/analytics.js` in the browser.
  `[GoogleAnalytics.astro:initializeAnalytics]`
- `ArrestBeatMap` creates a Leaflet map in the browser from the `data-beats`
  attribute and repositions labels on `zoomend moveend resize`; it adds no tile
  layer. `[ArrestBeatMap.astro:arrangeLabels]`
- `AgencyPersonnelList` filters roster items in the browser by name, status
  facet and discipline checkbox, and rewrites the summary text.
  `[AgencyPersonnelList.astro:data-roster-input]`
- `LicensingAuthorityRecords` filters and pages discipline records in the
  browser, 10 per page. `[LicensingAuthorityRecords.astro:data-discipline-browser]`
- `PersonnelEducation` filters and pages education records in the browser, 10
  per page. `[PersonnelEducation.astro:data-education-browser]`
- `CivicAgencyHierarchyPage` hides hierarchy items that do not match the
  filter input in the browser.
  `[CivicAgencyHierarchyPage.astro:data-civic-hierarchy-filter-input]`
- `UsaChoroplethMap` toggles the `is-linked-active` class on matching state
  nodes on pointer and focus events. `[UsaChoroplethMap.astro:is-linked-active]`
- `ArrestBeatMap` imports `leaflet/dist/leaflet.css`;
  `AgencyPersonnelList`, `AgencyTopicPage`, `CivicAgencyHierarchyPage`,
  `CivicChildIndexPage`, `CivicIndexPage`, `CivicScopedOverviewPage`,
  `EntityActionBar`, `PageHeader` and `WatchPage` import
  `#src/styles/civic-ledger.css`.
  `[ArrestBeatMap.astro:leaflet/dist/leaflet.css]`
  `[PageHeader.astro:#src/styles/civic-ledger.css]`

## Verification

- Run: `npm run test:client` (`scripts/ai-complaint-render.test.mjs` renders
  `AiComplaintSummary` and `ComplaintSummaryUnavailable`;
  `scripts/public-claims.test.mjs` renders `AgencyReportsPage` and
  `ReportDisclaimer`).
- Run: `npm run test:e2e` (specs under `tests/e2e/` exercise the rendered
  components in the browser).
- Run: `npm test` for the full chain.
