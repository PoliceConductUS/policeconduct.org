# Personnel profile page (`src/pages/personnel/[slug]`)

## Overview

Astro dynamic page for the routes `/personnel/{slug}/`. It shows one person's profile: the headline agency assignment and status, metric cards, arrest records, coverage links, licenses, license history, discipline, education, civil cases and assignment history, plus buttons that carry prefill data to the site's forms. The page has no form of its own, no pagination and no client script of its own. The subdirectories hold the per-person topic pages.

## Interface

- Route `/personnel/{slug}/`: the profile path is built from the slug stored on the loaded row. ``[index.astro:const officerPath = `/personnel/${data.officer.slug}/`;]``
- `getStaticPaths` returns an empty list when the environment variable `NO_PERSONNEL` is set to a non-blank value. `[index.astro:if ((process.env.NO_PERSONNEL || "").trim() !== "") {]`
- `getStaticPaths` runs a SQL query through `withDb` from `src/lib/db.js` that selects distinct personnel slugs. ``[index.astro:`select distinct o.slug]``
- The `getStaticPaths` query inner-joins `public.agency_personnel`, so only personnel with at least one agency assignment get a page. ``[index.astro:join public.agency_personnel ao on ao.personnel_id = o.id`,]``
- Each emitted path has the single param `slug` and no props. `[index.astro:params: { slug: officer.slug },]`
- The only route param is `slug`. `[index.astro:const { slug } = Astro.params;]`
- The render reloads the person with a SQL query on `public.personnel` by `slug`. `[index.astro:await client.query("select * from public.personnel where slug = $1", [slug])]`
- The render loads all of the person's rows from `public.agency_personnel`. `[index.astro:"select * from public.agency_personnel where personnel_id = $1",]`
- The render loads the assigned agencies from `public.agency` joined to `public.location_path` on `location_path_id`, adding `location_path`. `[index.astro:select a.*, lp.path as location_path, bpp.page_type]`
- The agency query left-joins `public.build_page_payload` for page type `agency`, adding `page_type`. `[index.astro:on bpp.page_type = 'agency']`
- The render loads `public.review_personnel` rows for the person's assignment ids. `[index.astro:"select * from public.review_personnel where agency_personnel_id = any($1)",]`
- The render loads the linked reports from `public.reviews` joined to `public.location_path`. `[index.astro:select r.*, lp.path as location_path]`
- The render loads distinct civil case ids from `public.civil_case_personnel` joined to `public.agency_personnel` for the person. ``[index.astro:`select distinct cco.civil_case_id]``
- The render loads the linked civil cases from `public.civil_cases`, ordered by filed date (newest first), title, then cause number. ``[index.astro:order by filed_date desc, title asc, cause_number asc`,]``
- Coverage links come from `loadCoverageLinksForOfficer` in `src/lib/data/coverage.js`. `[index.astro:const coverageLinks = await loadCoverageLinksForOfficer(data.officer.id);]`
- Arrest profiles come from `loadArrestProfilesForPersonnel` in `src/lib/data/arrest-profiles.js`. `[index.astro:const arrestProfiles = await loadArrestProfilesForPersonnel(data.officer.id);]`
- Licensing data comes from `loadLicensingForPersonnel` in `src/lib/data/licensing.js`. `[index.astro:const licensing = await loadLicensingForPersonnel(data.officer.id);]`
- Discipline records come from `loadDisciplineForPersonnel` in `src/lib/data/licensing.js`. `[index.astro:const discipline = await loadDisciplineForPersonnel(data.officer.id);]`
- Education records come from `loadEducationForPersonnel` in `src/lib/data/personnel-education.js`. `[index.astro:const education = await loadEducationForPersonnel(data.officer.id);]`
- Agencies are indexed by id with `mapBy` from `src/lib/data.js`. `[index.astro:const agenciesById = mapBy(data.agencies, "id");]`
- Assignment history is produced by `normalizeAgencyHistory` from `src/lib/data.js`. `[index.astro:const history = normalizeAgencyHistory(data.agencyOfficers);]`
- The headline assignment is chosen by `selectHeadlineAssignment` from `src/lib/data/assignment-status.js`. `[index.astro:const headline = selectHeadlineAssignment(history);]`
- The page uses the headline result fields `assignment`, `isCurrent`, `isEnded`, `endDate` and `hasUncertainHistory`. `[index.astro:const hasCurrentAssignment = headline.isCurrent;]`
- The headline end date is formatted with `formatAssignmentDate` from `src/lib/data/assignment-status.js` only when the headline is ended and has an end date. `[index.astro:? formatAssignmentDate(headline.endDate)]`
- The agency name used in prefill payloads is the headline agency name upper-cased for `en-US`. `[index.astro:const currentAgencyPrefillName = currentAgency.name.toLocaleUpperCase("en-US");]`
- The displayed name joins prefix, first name, middle name, last name and suffix, skipping empty parts. `[index.astro:data.officer.prefix,]`
- Each civil case gets the link `/civil-cases/{slug}/`. ``[index.astro:caseUrl: `/civil-cases/${caseItem.slug}/`,]``
- Each report gets a link from `buildReportCanonicalPath` (`src/lib/data/report-paths.js`), which receives `id`, `incidentDate`, `locationPath` and `slug`. `[index.astro:url: buildReportCanonicalPath({]`
- The person is treated as deceased when `deceased_on` has a value. `[index.astro:const isDeceased = Boolean(deceasedOnValue);]`
- The deceased message is `deceased_message` when non-blank, else "Reported deceased on" plus the date, else "This individual is reported deceased." `[index.astro:: "This individual is reported deceased.");]`
- The assignment label is "Current agency" for a current headline, "Recorded agency" when history is uncertain, otherwise "Most recent agency". `[index.astro:? "Recorded agency"]`
- The page title starts with "Deceased: " for a deceased person, then "Personnel" and the name, then the agency name (prefixed "Recorded:" or "Most recent:" when not current), then the site name. ``[index.astro:const pageTitle = `${isDeceased ? "Deceased: " : ""}Personnel ${officerName} | ${hasCurrentAssignment ? currentAgency.name : `${headline.hasUncertainHistory ? "Recorded" : "Most recent"}: ${currentAgency.name}`} | PoliceConduct.org`;]``
- For a deceased person the page description names the profile and, when known, the reported date of death. ``[index.astro:? `${officerName} personnel profile with agency assignments, public reports, and civil litigation records${deceasedOnDisplay ? `; reported deceased on ${deceasedOnDisplay}` : ""}.`]``
- Otherwise the page description includes the assignment label, the agency name and, for a non-current headline with an end date, "(assignment ended ...)". ``[index.astro:? ` (assignment ended ${headlineEndDateDisplay})`]``
- The past employer summary lists ended assignments (per `getAssignmentStatus` from `src/lib/data/assignment-status.js`) as agency name, date range and badge number. `[index.astro:.filter((entry) => getAssignmentStatus(entry).isEnded)]`
- The civil litigation summary lists each case as title (or "Civil case"), cause number, court and case link. `[index.astro:caseItem.title || "Civil case",]`
- The report links summary is the report links joined by newlines. `[index.astro:const reportLinksSummary = reportItems.map((report) => report.url).join("\n");]`
- The `/report/new/` prefill payload is JSON with `officer.department` (upper-cased agency name) and `officer.name`, typed as `ReportNewPrefill` from `src/lib/forms/prefill`. `[index.astro:} satisfies ReportNewPrefill);]`
- The `/civil-cases/new/` prefill payload is JSON with `jurisdiction` (lower-cased agency state), `defendants`, `summary` and `links` (the profile path plus up to three report links). `[index.astro:jurisdiction: String(currentAgency.state || "").toLowerCase(),]`
- The `/personnel/new/` prefill payload is JSON with `firstName`, `lastName`, `suffix`, `badgeNumber`, `currentAgency`, `currentAgencyCity`, `currentAgencyState`, `pastEmployers`, `civilLitigation` and `reportLinks`. `[index.astro:const pastEmployerPrefillPayload = JSON.stringify({]`
- In that payload the three current agency fields are empty strings unless the headline assignment is current. `[index.astro:currentAgency: hasCurrentAssignment ? currentAgencyPrefillName : "",]`
- The `/personnel/suggest-edit/` prefill payload is JSON with `officerPath`, `officerName`, `badgeNumber`, `currentEmployer` (empty unless current), `pastEmployers` and `civilLitigation`. `[index.astro:currentEmployer: hasCurrentAssignment ? currentAgencyPrefillName : "",]`
- The claim profile prefill payload for `/about/contact/` is JSON with `whoami: "Profile Owner"` and a message that names the profile path. `[index.astro:whoami: "Profile Owner",]`
- The portrait comes from `getPersonnelPhotoById` in `src/lib/personnel-photos.js`; when it returns nothing the image is `/img/personnel/default.webp`. `[index.astro:const personnelImageSrc = personnelPhoto || "/img/personnel/default.webp";]`
- The status label is "Deceased", "Active" (current headline), "Former" (ended and not uncertain) or "Status uncertain". `[index.astro:: "Status uncertain";]`
- The agencies metric card shows the count of distinct agencies in the assignment history and links to `#agency-assignments`. `[index.astro:href: "#agency-assignments",]`
- The current salary metric card always shows `--`. `[index.astro:label: metricVisuals.currentSalary.label,]`
- The civil cases metric card shows "active / total", where active means no `date_terminated`, with the detail `metricLabels.activeTotal`. ``[index.astro:value: `${formatCount(activeCivilCaseCount)} / ${formatCount(civilCaseCount)}`,]``
- The civil cases metric card links to `/personnel/{slug}/civil-cases/` only when the person has at least one civil case. ``[index.astro:href: `${officerPath}civil-cases/`,]``
- The liability costs metric card always shows `--`. `[index.astro:label: metricVisuals.liabilityCosts.label,]`
- The arrests metric card shows "Available" and links to `#arrest-records` when there are arrest profiles; otherwise it shows `--`. `[index.astro:value: arrestProfiles.length ? "Available" : unavailableValue,]`
- When there are arrest profiles, the arrests metric card also carries the detail "Recorded counts by agency assignment". `[index.astro:detail: "Recorded counts by agency assignment",]`
- The reports metric card shows the report count and links to `/personnel/{slug}/reports/` only when the person has at least one report. ``[index.astro:href: `${officerPath}reports/`,]``
- Metric labels, icons and accents come from `metricVisuals` and `metricLabels` in `src/lib/metric-vocabulary.js`; the card type is `MetricCardItem` from `src/components/metric-card-types.js`. `[index.astro:const personnelMetricCards: MetricCardItem[] = []`
- Counts are formatted with `Intl.NumberFormat("en-US")`. `[index.astro:new Intl.NumberFormat("en-US").format(value);]`
- Structured data is a schema.org `@graph` built with `buildWebSite`, `buildContentPageNode`, `buildPublisherOrganization`, `buildGovernmentOrganizationNode` and `buildPersonNode` from `src/lib/structured-data.js`. `[index.astro:buildWebSite(siteUrl),]`
- The content page node has the type `ProfilePage`, the id page URL plus `#profilepage`, and `dateModified` from the person's `updated_at`. `[index.astro:dateModified: String(data.officer.updated_at),]`
- The government organization node is built only when the headline agency has `page_type` equal to `agency`. `[index.astro:currentAgency.page_type === "agency"]`
- The person node gets `image` only when a mapped photo exists. `[index.astro:image: hasPersonnelPhoto]`
- The person node gets `deathDate` only for a deceased person. `[index.astro:deathDate: isDeceased ? String(deceasedOnValue) : undefined,]`
- The person node gets `worksForId` only when the organization node exists and the headline assignment is current. `[index.astro:organization && hasCurrentAssignment ? organization["@id"] : undefined,]`
- `PageShell` (`src/layouts/PageShell.astro`) receives `title`, `description`, `pagePath`, `canonicalUrl`, `structuredData`, `searchable` and `breadcrumbs`. ``[index.astro:canonicalUrl={`/personnel/${data.officer.slug}/`}]``
- `PageShell` prop `searchable` is `false`. `[index.astro:searchable={false}]`
- `PageShell` prop `breadcrumbs` is Home, Personnel (`/personnel/`), then the person's name. `[index.astro:{ label: officerName, href: officerPath },]`
- Renders `PrefillBootstrap` (`src/components/PrefillBootstrap.astro`). `[index.astro:<PrefillBootstrap />]`
- The `hero` slot holds the page `h1` with the person's name. `[index.astro:<h1 class="ipc-page-title">{officerName}</h1>]`
- The hero line shows the assignment label and the agency name; the name is a link to the agency's canonical path (from `requireAgencyCanonicalPath` in `src/lib/data/location-paths.js`) only when the agency `page_type` is `agency`. `[index.astro:<a href={currentAgencyPath}>{currentAgency.name}</a>]`
- The hero line shows the agency city and state. `[index.astro:{currentAgencyLocation}]`
- The hero line shows "assignment ended" plus the date for a non-current headline with an end date. `[index.astro:assignment ended {headlineEndDateDisplay}]`
- The hero shows the fixed note "Combined career data aggregated across all known agencies." `[index.astro:Combined career data aggregated across all known agencies.]`
- For a deceased person the hero renders `PersonnelDeceasedNotice` (`src/components/PersonnelDeceasedNotice.astro`) with the props `message` and `source` (`deceased_source`). `[index.astro:source={data.officer.deceased_source}]`
- The hero `EntityActionBar` (`src/components/EntityActionBar.astro`) holds `HelpCollectDataButton` (`src/components/HelpCollectDataButton.astro`) with `context` (name), `sourcePage` (profile path) and `topic="Personnel"`. `[index.astro:topic="Personnel"]`
- The hero action bar holds a `PrefillNavButton` (`src/components/PrefillNavButton.astro`) "Suggest edit" to `/personnel/suggest-edit/` with the suggest-edit payload. `[index.astro:payload={suggestEditPrefillPayload}]`
- The hero action bar holds a `PrefillNavButton` "Share an experience" to `/report/new/` with the report payload. `[index.astro:payload={reportNewPrefillPayload}]`
- The portrait image has the alt text "Portrait of" plus the name. ``[index.astro:<img src={personnelImageSrc} alt={`Portrait of ${officerName}`} />]``
- The hero aside always shows "Status" with the status label. `[index.astro:<span class="personnel-status-pill">{statusLabel}</span>]`
- The hero aside shows "Badge Number" only when the headline assignment has a badge number. `[index.astro:<dt>Badge Number</dt>]`
- The hero aside always shows the assignment label with the agency name, linked to the agency's canonical path only when the agency `page_type` is `agency`. `[index.astro:<dt>{assignmentStatusLabel}</dt>]`
- The hero aside shows "Assignment ended" only for a non-current headline with an end date. `[index.astro:<dt>Assignment ended</dt>]`
- The hero aside always shows "Updated" with `updated_at` formatted by `formatShortDate` from `src/lib/format.js`. `[index.astro:<dd>{formatShortDate(data.officer.updated_at)}</dd>]`
- Renders `MetricGrid` (`src/components/MetricGrid.astro`) with the prop `metrics`. `[index.astro:<MetricGrid metrics={personnelMetricCards} />]`
- Renders `PersonnelArrestProfiles` (`src/components/PersonnelArrestProfiles.astro`) with the prop `profiles`. `[index.astro:<PersonnelArrestProfiles profiles={arrestProfiles} />]`
- For each arrest profile that has a `beatMap`, renders `ArrestBeatMap` (`src/components/ArrestBeatMap.astro`) with the props `data`, `agencyName`, `firstMonth`, `lastMonth`, `source` and `scope="personnel"`. `[index.astro:scope="personnel"]`
- Renders `CoverageLinks` (`src/components/CoverageLinks.astro`) with the prop `links`. `[index.astro:<CoverageLinks links={coverageLinks} />]`
- The "Licenses & certification" section renders only when `licensing.licenses` is not empty; each card has the id `license-{id}` and shows the license type. ``[index.astro:id={`license-${license.id}`}]``
- A license card shows "Status", "First awarded" and "Issued by" only when the matching value is present; "Issued by" links to `license.authority.href` and shows the abbreviation or the name. `[index.astro:<a href={license.authority.href}>]`
- The "License history" section renders only when `licensing.timeline` is not empty, using `LicenseTimeline` (`src/components/LicenseTimeline.astro`) with the prop `entries`. `[index.astro:<LicenseTimeline entries={licensing.timeline} />]`
- The "Discipline" section (id `discipline`) renders only when there are discipline records, using `PersonnelDiscipline` (`src/components/PersonnelDiscipline.astro`) with the prop `records`. `[index.astro:<PersonnelDiscipline records={discipline} />]`
- The "Education & training" section renders only when there are education records, using `PersonnelEducation` (`src/components/PersonnelEducation.astro`) with the prop `records`. `[index.astro:<PersonnelEducation records={education} />]`
- The "Civil Cases" section always renders its heading; its table renders only when there are civil cases and shows at most the first four. `[index.astro:{civilCasesWithPaths.slice(0, 4).map((caseItem) => (]`
- The civil case table columns are case name (link, "Civil case" when the title is empty), filed date, court and cause number. `[index.astro:{caseItem.title || "Civil case"}]`
- Renders `PersonnelAssignments` (`src/components/PersonnelAssignments.astro`) with the props `assignmentHistory` and `licensing`. `[index.astro:<PersonnelAssignments]`
- The footer holds a `PrefillNavButton` "Add a civil case" to `/civil-cases/new/` with the civil case payload. `[index.astro:payload={addCivilCasePrefillPayload}]`
- The footer holds a `PrefillNavButton` "Submit past employer" to `/personnel/new/` with the past employer payload. `[index.astro:payload={pastEmployerPrefillPayload}]`
- The footer holds a `PrefillNavButton` "Notify Me" to `/about/contact/` with an object payload (`whoami: "Subscriber"` and a message naming the profile path) and `data-testid="personnel-subscribe-link"`. `[index.astro:data-testid="personnel-subscribe-link"]`
- The footer holds a `PrefillNavButton` "Claim Profile" to `/about/contact/` with the claim payload and `data-testid="personnel-claim-profile-link"`. `[index.astro:data-testid="personnel-claim-profile-link"]`
- Renders `RecordDataNotes` (`src/components/RecordDataNotes.astro`) with `recordPath` set to the profile path. ``[index.astro:<RecordDataNotes recordPath={`/personnel/${data.officer.slug}/`} />]``
- Imports the shared stylesheet `src/styles/civic-ledger.css`. `[index.astro:import "#src/styles/civic-ledger.css";]`
- The page `<style>` block declares the panel, table and status-pill classes as `:global()` because `PersonnelAssignments.astro` also uses them. `[index.astro::global(.personnel-panel) {]`
- [Personnel topic pages (`[topic]`)](./[topic]/EGM.md): routes `/personnel/{slug}/reports/` and `/personnel/{slug}/civil-cases/`.

## Invariants

- The render throws when the `slug` param is missing. `[index.astro:throw new Error("Personnel route requires a slug.");]`
- The render throws when no personnel row matches the slug, or when the loaded row's slug differs from the param. `[index.astro:if (!officer || officer.slug !== slug) {]`
- The render throws when any assignment references an agency that the agency query did not return; that query joins `public.location_path`, so an agency without a location path is also missing. `[index.astro:which the agency query did not return with a location path.]`
- The render throws when the person has no headline assignment. ``[index.astro:`Personnel ${data.officer.slug} is missing required agency assignment history.`,]``
- The render throws when the headline assignment's agency is missing. ``[index.astro:`Personnel ${data.officer.slug} assignment ${currentAssignment.id} is missing required agency ${currentAssignment.agency_id}.`,]``
- `requireAgencyCanonicalPath` runs for the headline agency only when its `page_type` is `agency`, the only case where the page links to it; it throws when that agency has no `location_path_id`-backed canonical path. `[index.astro:? requireAgencyCanonicalPath(currentAgency)]`
- The render throws when the headline assignment has no title, unless the person is the placeholder record. `[index.astro:if (!isPlaceholderPersonnel && !currentTitle) {]`
- The placeholder record is the slug `unknown-personnel-935d1d`, or first name "Unknown" with last name "Personnel". `[index.astro:data.officer.slug === "unknown-personnel-935d1d" ||]`
- The headline assignment comes from `selectHeadlineAssignment`: the last open assignment (no end date and no uncertain start date) when one exists; otherwise, when any assignment has an uncertain status, the last entry of the start-date-sorted history; otherwise the assignment with the latest end date. `[../../../lib/data/assignment-status.js:? entries.at(-1)]`
- `worksFor` is a present-tense employment claim and is emitted only for an assignment still recorded as open. ``[index.astro:// `worksFor` is a present-tense employment assertion, so it is emitted only]``
- The default portrait is never included in structured data. `[index.astro:const hasPersonnelPhoto = Boolean(personnelPhoto);]`
- Agency location identity comes from `public.agency.location_path_id` joined to `public.location_path`. `[index.astro:on lp.location_path_id = a.location_path_id]`
- Reports and civil cases are reached only through the person's `agency_personnel` assignments. `[index.astro:join public.agency_personnel ao on ao.id = cco.agency_personnel_id]`
- Route identity is carried only by the `slug` param; `getStaticPaths` passes no props. `[index.astro:return officers.map((officer: { slug: string }) => ({]`
- Page path and canonical URL both come from the loaded row's stored slug. ``[index.astro:pagePath={`/personnel/${data.officer.slug}/`}]``

## Side Effects

- `getStaticPaths` reads `process.env.NO_PERSONNEL`. `[index.astro:process.env.NO_PERSONNEL]`
- `getStaticPaths` reads the database tables `public.personnel` and `public.agency_personnel` through `withDb`. `[index.astro:const officers = await withDb(async (client) => {]`
- Each rendered page reads `public.personnel`, `public.agency_personnel`, `public.agency`, `public.location_path`, `public.build_page_payload`, `public.review_personnel`, `public.reviews`, `public.civil_case_personnel` and `public.civil_cases` through `withDb`. `[index.astro:const data = await withDb(async (client) => {]`
- Each rendered page calls the coverage, arrest profile, licensing, discipline and education loaders and `getPersonnelPhotoById`; any data or file access happens inside them. `[index.astro:const personnelPhoto = await getPersonnelPhotoById(data.officer.id);]`

## Verification

- Run: `npm run test:e2e`
