# Agency profile page

## Overview

Static Astro page for the route `/[category]/[administrativeArea]/[place]/[agencySlug]/`. It reloads one agency from its route params and renders the department profile: status, contact details, prefilled action links, record totals, arrest beat maps, recent reports, recent civil cases, coverage links and schema.org structured data. Topic pages for the same agency live in the subdirectories.

## Interface

- Route `/[category]/[administrativeArea]/[place]/[agencySlug]/`; route params: `category`, `administrativeArea`, `place`, `agencySlug`. No props are read. `[index.astro:Astro.params]`
- `getStaticPaths()` returns `loadAgencyLocationStaticPaths()` from `#src/lib/data/agency-detail.js` unchanged. `[index.astro:return loadAgencyLocationStaticPaths();]`
- The agency is reloaded on every render with `loadAgencyDetailByRouteParams(Astro.params)`. `[index.astro:const data = await loadAgencyDetailByRouteParams(Astro.params);]`
- `loadAgencyDetailByRouteParams` finds the agency by its `location_path` path and its slug. It throws when no agency matches, or when the found agency's canonical path differs from the request path. `[../../../../../lib/data/agency-detail.ts:did not resolve.]` `[../../../../../lib/data/agency-detail.ts:resolved to ${detail.agencyPath}.]`
- Arrest profiles are loaded with `loadArrestProfilesForAgency(data.agency.id)` (`#src/lib/data/arrest-profiles.js`). Each profile that has a `beatMap` renders an `ArrestBeatMap` with `data`, `agencyName`, `firstMonth`, `lastMonth` and `source`. `[index.astro:<ArrestBeatMap]`
- `PageShell` (`#src/layouts/PageShell.astro`) props: `title`, `description`, `pagePath` and `canonicalUrl` (both `agencyPath`), `structuredData`, `breadcrumbs` (Home, category at `data.categoryPath`, administrative area at `data.administrativeAreaPath`, place, agency), `eyebrow="Department profile"`, `heading` (the stored agency name). `[index.astro:eyebrow="Department profile"]`
- Title is the agency name, then ` | PoliceConduct.org`; it carries no status qualifier. ``[index.astro:const pageTitle = `${agencyName} | PoliceConduct.org`;]``
- Status comes from `agencyStatusPresentation(data.agency.status, data.agency.status_date)` (`#src/lib/agency-status`). The header shows `Status: <stored status>` and `Status date: <dateLabel>` when present, with the same styling for every status. `[index.astro:const status = agencyStatusPresentation(]`
- Header slot also shows: a link to `/federal/<slug>/` when `data.federalAgency` exists; the address line; phone numbers; `Contact name`; email links from `contactEmailsForDisplay(data.agency.contact_email)`; and `Updated <date>` when `updated_at` exists. `[index.astro:const contactEmails = contactEmailsForDisplay(data.agency.contact_email);]`
- Actions slot: an `EntityActionBar` with three `PrefillNavButton` links, to `/report/new/`, `/agency/suggest-edit/` and `/civil-cases/new/`, each with a JSON string payload. `[index.astro:to="/agency/suggest-edit/"]`
- Aside slot: three `PrefillNavButton` links, to `/personnel/new/` and twice to `/about/contact/` (test ids `agency-subscribe-link` and `agency-claim-profile-link`). `[index.astro:data-testid="agency-claim-profile-link"]`
- Payload fields: report `{ officer: { department } }`; civil case `defendants`, `summary`, `links`; suggest edit `agencyPath`, `agencyName`, `departmentHead`, `civilLitigation`; personnel `currentAgency`, `currentAgencyCity`, `currentAgencyState`, `civilLitigation`, `reportLinks`; contact `whoami` and `message`. `[index.astro:departmentHead: data.agency.contact_name || "",]`
- `StatStrip` with `columns="five"` holds five `StatCell`s: Personnel, Reports, Civil Cases, Budget, Liability Costs. Personnel links to `<agencyPath>personnel/`, Reports to `<agencyPath>reports/` and Civil Cases to `<agencyPath>civil-cases/` only when their shown counts are above zero; the Personnel link and value both use `counts.currentPersonnel`. `[index.astro:href: `${agencyPath}personnel/`,]`
- When `counts.discipline` is above zero, a note links the discipline record count to `<agencyPath>personnel/`. `[index.astro:{counts.discipline > 0 && (]`
- "Recent experience reports" and "Recent civil cases" sections each render up to six links, newest first, and are omitted when empty. `[index.astro:<h2>Recent experience reports</h2>]`
- After `CoverageLinks`, a fixed note reads `Counts show items available on this site. They are not a rating.` `[index.astro:Counts show items available on this site. They are not a rating.]`
- `CoverageLinks` receives `links={data.coverageLinks}`; `RecordDataNotes` receives `recordPath={agencyPath}`. `[index.astro:<CoverageLinks links={data.coverageLinks} />]`
- Structured data is one `@graph` with `buildWebSite`, `buildContentPageNode` of type `ProfilePage` (id `<pageUrl>#profilepage`), `buildPublisherOrganization`, and a node from `buildGovernmentOrganizationNode` extended with `description`. Helpers come from `#src/lib/structured-data.js`. `[index.astro:type: "ProfilePage",]`
- Subdirectories: [civil-cases](./civil-cases/EGM.md) and [reports](./reports/EGM.md) - paginated topic pages for the same agency; [personnel](./personnel/EGM.md) - personnel topic page.

## Invariants

- Throws `Agency path <agencyPath> is missing a slug segment.` when `agencyPath` has no non-empty last segment. `[index.astro:is missing a slug segment.]`
- Experience reports and civil cases are always separate sections and are never merged into one list. `[index.astro:always rendered as separate sections]`
- The Civil Cases cell shows `counts.civilCases`: the distinct cases linked to this agency's own assignment rows. A person's cases from other agencies do not count. The recent case list uses the same `civilCases`. `[index.astro:counts.civilCases > 0 ? formatCount(counts.civilCases) : null]`
- Civil case links always use `/civil-cases/<slug>/`. `[index.astro:/civil-cases/${record.slug}/]`
- Recent lists are sorted by date, newest first, and cut to six items; a case with no `filed_date` sorts with date value 0. `[index.astro:[...items].sort((left, right) => right.sortDate - left.sortDate).slice(0, 6);]`
- A case with no title is shown as `Civil case`; a report with no title is shown as `Public report`. `[index.astro:title: report.title || "Public report",]`
- The Budget and Liability Costs cells always render with `empty`. `[index.astro:role="liability"]`
- The Personnel cell has three forms. `counts.currentPersonnel` and `counts.formerPersonnel` come from the intake view `site_agency_count` through `loadAgencyDetail`. With current personnel, its value is `counts.currentPersonnel` and its meta text is `N former on record` when former personnel exist, else `Currently serving`. With no current but some former personnel, it shows `--`, the text `No current personnel on record.`, and a link `See N former on record →` to `<agencyPath>personnel/` in place of the help-collect link. Otherwise it shows `--` and the help-collect link. `[index.astro:counts.currentPersonnel > 0]` `[index.astro:former on record]`
- The Reports cell uses `/report/new/` as its help link with the label `Share an experience →`; the other cells use `buildHelpCollectHref(agencyPath, "agency", agencySlugSegment)`. `[index.astro:helpCollectLabel="Share an experience →"]`
- Agency, city and contact names are shown as stored. Prefill payloads use the upper-cased agency name. `[index.astro:agencyName.toLocaleUpperCase("en-US")]`
- Every phone renders as a `tel:` link, labelled with its stored `description` when one exists. `[index.astro:href={`tel:${phone.phone_number}`}]`
- Dates are formatted with `en-US`, short month, in UTC. `[index.astro:timeZone: "UTC",]`
- The `PostalAddress` node is built only when at least one of address, city, state or zip code exists, and always has `addressCountry: "US"`. `[index.astro:addressCountry: "US",]`
- The civil case prefill `links` field holds the agency path plus at most the first three report URLs. `[index.astro:.slice(0, 3)]`

## Side Effects

- Imports the global stylesheet `#src/styles/civic-ledger.css`. `[index.astro:import "#src/styles/civic-ledger.css";]`
- Ships a component-scoped `<style>` block for `.agency-status`. `[index.astro:.agency-status p {]`
- Build-time data loading only, through `loadAgencyLocationStaticPaths`, `loadAgencyDetailByRouteParams` and `loadArrestProfilesForAgency`. No writes or network calls in this file; client behaviour is limited to what `PrefillBootstrap`, `PrefillNavButton` and `ArrestBeatMap` provide. `[index.astro:<PrefillBootstrap />]`

## Verification

- Run: `npm run test:e2e`
