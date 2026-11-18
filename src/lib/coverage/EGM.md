# Agency Coverage (`src/lib/coverage`)

## Overview

Modules that measure how many agencies the database holds and compare those counts with dated, cited national and state denominators from the Bureau of Justice Statistics (BJS). `held-counts.js` reads the counts from the database through an injected client. `agency-types.js` and `classify-held-agencies.js` assign each held agency a BJS category from a sourced type roster, or mark it unclassified with a reason. `denominators.js` is the registry of denominators and the only place a coverage percentage is produced. `report.js` composes these into a report object and renders it as Markdown. None of the files is a command-line script; the caller supplies the database client and the roster. The clock can be injected through `now` and `asOf`; otherwise each defaults to the current time. The caller in this repository is `scripts/coverage-report.mjs`, run by `npm run report:coverage`; it passes neither `now` nor `asOf`. `[../../../scripts/coverage-report.mjs:measureHeldAgencies(client, { connectionTarget })]` `[../../../scripts/coverage-report.mjs:corpusCrossChecks: options.crossChecks,]` `[../../../package.json:"report:coverage": "node scripts/coverage-report.mjs"]`

The `data/` subfolder holds one JSON data file, `tcole-department-types.json`. No module in this directory reads it; only the test `agency-types.test.mjs` loads it. The caller parses it and passes it to `classifyHeldAgencies` as the `roster` argument, which reads only its `departments` array. `[classify-held-agencies.js:roster.departments]` `[agency-types.test.mjs:./data/tcole-department-types.json]`

## Interface

### `agency-types.js`

- The file has no imports and only declares exports. `[agency-types.js:export const BJS_CATEGORY]`
- `BJS_CATEGORY` is a frozen enum-like object with ten values: `local_police`, `sheriff`, `primary_state`, `constable_marshal`, `special_jurisdiction`, `tribal`, `federal`, `not_in_csllea_universe`, `out_of_state`, `unclassified`. `[agency-types.js:not_in_csllea_universe]`
- `GENERAL_PURPOSE_CATEGORIES` is a frozen array: local police, sheriff, primary state. It is the set summed into `generalPurposeHeld`. `[agency-types.js:GENERAL_PURPOSE_CATEGORIES]`
- `ALL_AGENCY_CATEGORIES` is a frozen array: the three general-purpose categories plus constable/marshal, special jurisdiction and tribal. It is the set summed into `allAgencyHeld`. `[agency-types.js:ALL_AGENCY_CATEGORIES]`
- `AgencyTypeProvenanceError` extends `Error` and is thrown by `assertClassificationPublishable`. `[agency-types.js:AgencyTypeProvenanceError]`
- `UnknownSourceTypeError` extends `Error` and is thrown by `classifyTcoleDepartmentType`. `[agency-types.js:UnknownSourceTypeError]`
- `CLASSIFICATION_SOURCE` is a frozen object with one member, `TCOLE_PIA_2025_02_10`, carrying `id`, `sourceDataset`, `recordsRequestId`, `sourceUrl` (null), `retrievedOn`, `sourceField` (`DEPARTMENT_TYPE`), `confidence` and `note`. `[agency-types.js:tcole_pia_2025_02_10]`
- `TCOLE_DEPARTMENT_TYPE_MAP` is a frozen object keyed by the verbatim source type string. Each value is a frozen `{ category, why }`; the `State of Texas` entry is `{ category: null, requiresPerAgencyReview: true, why }`. It covers municipal, sheriff, constable, city marshal, state, out-of-state, federal, tribal, special-jurisdiction and outside-the-census types, and maps `UNKNOWN` to unclassified. `[agency-types.js:TCOLE_DEPARTMENT_TYPE_MAP]`
- `PRIMARY_STATE_AGENCY` is a frozen object keyed by state code with one key, `TX`, giving the name of the primary state agency and a rationale. `[agency-types.js:Texas Department of Public Safety]`
- `classifyTcoleDepartmentType(departmentType, context = {})` looks up the exact source type and returns a frozen `{ category, why, resolvedPerAgency }`. For the per-agency entry it returns `primary_state` when the normalised `context.agencyName` equals the normalised primary agency name for `context.state`, else `special_jurisdiction`. `[agency-types.js:classifyTcoleDepartmentType]`
- `normalizeAgencyName(value)` returns a string: lower-cased, straight and curly apostrophes deleted, every run of characters other than ASCII `a-z` and `0-9` (including accented letters) replaced by one space, trimmed. Null and undefined give an empty string. `[agency-types.js:export const normalizeAgencyName]`
- `assertClassificationPublishable(classification)` returns `true` or throws `AgencyTypeProvenanceError`. `[agency-types.js:assertClassificationPublishable]`
- `summarizeClassifications(classifications)` validates every item and returns a frozen array with one frozen object per state: `{ code, held, byCategory, generalPurposeHeld, allAgencyHeld, unclassifiedHeld, numeratorComplete }`. `[agency-types.js:summarizeClassifications]`

### `classify-held-agencies.js`

- Imports only from `./agency-types.js`. `[classify-held-agencies.js:./agency-types.js]`
- `UNCLASSIFIED_REASON` is a frozen object with four prose values: `NO_TYPED_SOURCE_FOR_STATE`, `NOT_IN_SOURCE_ROSTER`, `SOURCE_TYPE_UNKNOWN`, `AMBIGUOUS_SOURCE_MATCH`. `[classify-held-agencies.js:AMBIGUOUS_SOURCE_MATCH]`
- `classifyHeldAgencies(heldAgencies, roster)` takes an array of `{ id, name, state }` and a roster `{ departments: [{ n, t, s, a }] }`, and returns an array of frozen classification objects of the same length and order. Every result has `agencyId`, `agencyName`, `state` (trimmed, upper-cased), `category`, `sourceType`, `provenance`, `unclassifiedReason`. `[classify-held-agencies.js:classifyHeldAgencies]`
- An unclassified result has `category: "unclassified"`, `provenance: null` and a reason; `sourceType` is null except in the `SOURCE_TYPE_UNKNOWN` case, where it keeps the verbatim source value. `[classify-held-agencies.js:SOURCE_TYPE_UNKNOWN]`
- A classified result adds `mappingRationale` and `resolvedPerAgency`, has `unclassifiedReason: null`, and carries a frozen `provenance` of `{ sourceDataset, recordsRequestId, sourceUrl, retrievedOn, sourceField, confidence, joinedOn }`. `[classify-held-agencies.js:mappingRationale]`
- Module-private: `TYPED_SOURCE_BY_STATE` (only `TX`) and `buildSourceIndex`. `[classify-held-agencies.js:TYPED_SOURCE_BY_STATE]`

### `held-counts.js`

- The file has no imports; the database client is injected. `[held-counts.js:export const measureHeldAgencies]`
- `measureHeldAgencies(client, { now = new Date(), connectionTarget = null } = {})` is async and is the only export. `client` must expose a pg-style `query(sql, params)`. It resolves to a frozen `{ measuredAt, database, fingerprint, totalHeld, federalHeld, projectedAgencyPages, byState, limitations }`. `[held-counts.js:connectionTarget = null]`
- `database` is a frozen `{ database, host, port, connectedTo }`; `fingerprint` is a frozen `{ rows, newest_updated_at, oldest_created_at }`; `measuredAt` is `now.toISOString()`. `[held-counts.js:connectedTo]`
- `byState` is a frozen array of frozen `{ code, held }`; `totalHeld` is their sum; `federalHeld` and `projectedAgencyPages` are integers, or null when the optional column or table is absent; `limitations` is a frozen array of `{ missing, consequence }`. `[held-counts.js:projectedAgencyPages]`
- Module-private: `OPTIONAL`, `columnExists`, `tableExists`, `describeDatabase`, `asIso`, `fingerprintCorpus`. `[held-counts.js:agency.parent_federal_agency_id]`

### `denominators.js`

- `UNIVERSE` is a frozen object: `GENERAL_PURPOSE` (`general_purpose`) and `ALL_AGENCY` (`all_agency`). `[denominators.js:general_purpose]`
- `CITATION_STATUS` is a frozen object: `confirmed`, `pending`, `superseded`. `[denominators.js:CITATION_STATUS]`
- `AUDIENCE` is a frozen object: `public`, `internal`. `[denominators.js:export const AUDIENCE]`
- `GAP_KIND` is a frozen object with ten values: `no_state_denominator`, `held_not_in_roster`, `in_roster_not_held`, `no_usable_source`, `denominator_stale`, `citation_unconfirmed`, `held_exceeds_denominator`, `no_records_held`, `numerator_universe_unverified`, `corpus_count_disputed`. `held_not_in_roster`, `in_roster_not_held` and `no_usable_source` are declared but not produced in this directory. `[denominators.js:held_not_in_roster]`
- `CoverageProvenanceError` extends `Error`; it is the only error this file throws on purpose. `[denominators.js:CoverageProvenanceError]`
- `STALENESS_THRESHOLD_YEARS` is the number 5. `[denominators.js:STALENESS_THRESHOLD_YEARS]`
- `PRIMARY_NATIONAL_DENOMINATOR_ID` is `csllea_2018_general_purpose`. `[denominators.js:PRIMARY_NATIONAL_DENOMINATOR_ID]`
- `SECONDARY_NATIONAL_DENOMINATOR_ID` is `csllea_2018_all_agency`. `[denominators.js:SECONDARY_NATIONAL_DENOMINATOR_ID]`
- `DENOMINATOR_LINEAGE` is a frozen array of two frozen `{ universe, fromId, toId, changedOn, issue, reason }` records. `[denominators.js:DENOMINATOR_LINEAGE]`
- `DEFINITIONAL_CONFLICTS` is a frozen array of three frozen `{ id, detail }` records describing source disagreements that are carried, not resolved. `[denominators.js:local_police_count_lear_vs_csllea]`
- `getDenominator(id)` returns the frozen national record for a registered id. Registered ids: `csllea_2018_general_purpose`, `csllea_2018_all_agency`, `lear_2016_general_purpose` (superseded), `csllea_2008_all_agency` (superseded). `[denominators.js:getDenominator]`
- `getStateDenominator(stateCode, universe = UNIVERSE.GENERAL_PURPOSE)` returns the frozen state record for the upper-cased code and universe, or null. The general-purpose record is a derived subtotal with `components` and `componentStandardErrors`; the all-agency record is the published value with its `standardError`. `[denominators.js:getStateDenominator]`
- `listStateDenominatorCodes()` returns a new frozen, sorted array of the codes that have a state denominator (the 50 states and DC). `[denominators.js:listStateDenominatorCodes]`
- `assertPublishable(denominator, audience)` returns `true` or throws `CoverageProvenanceError`. `[denominators.js:assertPublishable]`
- `formatDenominator(denominator, { audience = AUDIENCE.PUBLIC } = {})` returns `<value> <noun> (<source>, <year>)`, with `~` before an approximate value. It runs `assertPublishable` first, so with the default public audience it throws `CoverageProvenanceError` for a superseded denominator. `[denominators.js:formatDenominator]` `[denominators.js:assertPublishable(denominator, audience);]`
- `formatCoverage({ held, denominator, asOfYear, audience = AUDIENCE.PUBLIC })` returns a frozen `{ held, denominatorId, denominatorValue, denominatorSource, denominatorYear, denominatorDerived, percent, stale, denominatorAgeYears, sentence }`. It is the only function that produces a coverage percentage. `[denominators.js:formatCoverage]`
- `formatCoverageCeiling({ held, denominator, asOfYear, audience = AUDIENCE.INTERNAL })` returns the `formatCoverage` fields plus `isCeiling: true` and a sentence that states the figure is a ceiling, not a coverage figure. `[denominators.js:formatCoverageCeiling]`
- `nationalCoverage({ heldGeneralPurpose, heldAllAgency, asOfYear, audience = AUDIENCE.INTERNAL })` returns a frozen `{ primary, secondary, gaps, lineage, conflicts }`; `primary` and `secondary` are `formatCoverage` results or null. `[denominators.js:nationalCoverage]`
- `stateCoverage({ stateCode, held, asOfYear, audience = AUDIENCE.INTERNAL, universe = UNIVERSE.GENERAL_PURPOSE })` returns a frozen `{ stateCode, universe, held, coverage, gap }`, with exactly one of `coverage` and `gap` non-null. `[denominators.js:stateCoverage]`
- Module-private: `PUBLICATION`, `NATIONAL_DENOMINATORS`, `STATE_ROWS`, `STATE_DENOMINATORS`, `isPositiveInteger`, `stalenessYears`, `staleGap`, `exceedsGap`. `[denominators.js:STATE_ROWS]`

### `report.js`

- Two exports, `buildCoverageReport` and `renderCoverageReportMarkdown`. The file imports from `./denominators.js` and `BJS_CATEGORY` from `./agency-types.js`, and measures nothing itself. `[report.js:BJS_CATEGORY]`
- `buildCoverageReport({ measurement, asOf = new Date(), corpusCrossChecks = [], classification = [] })` returns a frozen report: `{ asOf, asOfYear, measurement, corpusCrossChecks, national, states, classification, summary, gaps, lineage, conflicts }`. `measurement` is a `measureHeldAgencies` result; `classification` rows are `summarizeClassifications` results; `corpusCrossChecks` rows are `{ store, count, note? }`. `[report.js:buildCoverageReport]`
- `national` is `{ held, primary: { denominator, ceiling }, secondary: { denominator, ceiling }, gaps }`. Each `states` entry is `{ code, held, generalPurpose, allAgency, gaps }`, and each reading is a frozen `{ universe, denominator, coverage, ceiling, gap }` with at most one of `coverage`, `ceiling`, `gap` non-null. `summary` is `{ jurisdictionsWithRecords, jurisdictionsWithoutRecords, jurisdictionsWithDenominator, universeMismatches, achievedPercentagesReported, jurisdictionsFullyClassified, unclassifiedHeld }`. `[report.js:achievedPercentagesReported]`
- `renderCoverageReportMarkdown(report)` returns one Markdown string ending in a single newline, titled "Agency coverage report v1". Sections: what we hold, the denominators, why there are (or are not) percentages, an optional agency-type table, by state, named gaps by state, optional national gaps, denominator changes, source conflicts, optional measurement limitations, optional cross-checks. `[report.js:renderCoverageReportMarkdown]`
- The Markdown also prints `measurement.database`, `measurement.fingerprint`, `measurement.projectedAgencyPages`, `measurement.federalHeld` and `measurement.limitations` from the pass-through measurement. `[report.js:newest_updated_at]`
- Module-private: `numeratorUniverseGap`, `disputedCountGap`, `noRecordsGap`, `readState`, `GAP_LABEL`, `num`, `renderPercent`, `stateReading`. `[report.js:const readState]`

## Invariants

### `agency-types.js`

- `classifyTcoleDepartmentType` throws `UnknownSourceTypeError` when the source type is not an exact, case-sensitive key of `TCOLE_DEPARTMENT_TYPE_MAP`. There is no default bucket. `[agency-types.js:it must not be bucketed by default]`
- Only an entry with `requiresPerAgencyReview` is resolved per agency. A missing state, a state with no primary agency on file, or a different name gives `special_jurisdiction` without throwing. `[agency-types.js:requiresPerAgencyReview]`
- `assertClassificationPublishable` throws when `category` is undefined (message ends "has no BJS category."). `[agency-types.js:has no BJS category.]`
- For an unclassified row it throws when `unclassifiedReason` is falsy, and otherwise returns true without checking provenance. `[agency-types.js:is unclassified without a reason]`
- For any other category it throws when `provenance` is falsy. `[agency-types.js:has a category but no provenance]`
- It requires truthy `provenance.sourceDataset`, `retrievedOn`, `confidence` and `sourceField`, checked in that order. `[agency-types.js:is missing provenance.]`
- It requires `provenance.recordsRequestId` or `provenance.sourceUrl`. `[agency-types.js:needs provenance.recordsRequestId or provenance.sourceUrl]`
- It requires a truthy `sourceType`, checked last. `[agency-types.js:does not record the verbatim source value]`
- It does not check that `category` is a `BJS_CATEGORY` value. `[agency-types.js:Object.values(BJS_CATEGORY)]`
- `summarizeClassifications` validates every item before counting, so one invalid item aborts the whole summary. `[agency-types.js:assertClassificationPublishable(classification);]`
- Unclassified rows count toward `held` and `byCategory.unclassified` and are never moved to another category. `[agency-types.js:unclassifiedHeld]`
- Output order is `held` descending, then `code` ascending by `localeCompare`. `[agency-types.js:a.code.localeCompare(b.code)]`
- `numeratorComplete` is true only when the unclassified count is zero. Federal, out-of-state and outside-the-census rows count toward `held` but toward neither subtotal. `[agency-types.js:numeratorComplete]`
- Exported constants and returned results are frozen. `[agency-types.js:Object.freeze(bucket.byCategory)]`

### `classify-held-agencies.js`

- Precedence per held agency, first match wins: no typed source for the state; no roster row with the same state and normalised name; matching rows disagree about the type; the mapped category is unclassified; otherwise classified with provenance. `[classify-held-agencies.js:NO_TYPED_SOURCE_FOR_STATE]`
- Only `TX` has a typed source. Every other state, including a missing state, is unclassified and the roster is not consulted. `[classify-held-agencies.js:TX: CLASSIFICATION_SOURCE.TCOLE_PIA_2025_02_10]`
- The join is exact, never fuzzy: upper-cased state plus `normalizeAgencyName(name)`, within the same state. `[classify-held-agencies.js:normalizeAgencyName(department.n)]`
- The held-agency state is trimmed and upper-cased; the roster state is upper-cased but not trimmed. `[classify-held-agencies.js:String(department.s ?? "").toUpperCase()]`
- Several roster rows with the same state and name are accepted when they share one type, and become `AMBIGUOUS_SOURCE_MATCH` only when the types differ. The roster's `a` field plays no part. `[classify-held-agencies.js:distinctTypes.size > 1]`
- The file has no `throw`, but an unmapped roster type makes `classifyTcoleDepartmentType` throw `UnknownSourceTypeError`, which aborts the whole call. `[classify-held-agencies.js:classifyTcoleDepartmentType(sourceType, {]`
- A missing `roster.departments` is treated as an empty array, so every `TX` agency becomes `NOT_IN_SOURCE_ROSTER`. `[classify-held-agencies.js:roster.departments ?? []]`
- `joinedOn` is a fixed literal on every classified result. `[classify-held-agencies.js:joinedOn]`

### `held-counts.js`

- The file has no `throw` and no try/catch. A rejected `client.query` (for example a missing `public.agency` table) propagates. `[held-counts.js:from public.agency]`
- `now` must be a `Date`. `[held-counts.js:now.toISOString()]`
- The optional column `agency.parent_federal_agency_id` and optional table `build_page_payload` are probed first. When one is missing, its figure is null and a limitation is recorded; nothing is thrown. `[held-counts.js:hasFederalParent]`
- The limitation order is fixed: federal-parent first, page-payload second. `[held-counts.js:hasPagePayload]`
- States are grouped by `upper(btrim(state))` and ordered by count descending, then code ascending, in SQL. `[held-counts.js:upper(btrim(state))]`
- `totalHeld` is the sum of the per-state counts; `fingerprint.rows` is a separate `count(*)`. `[held-counts.js:const totalHeld = stateRows.reduce]`
- `federalHeld` counts rows with a non-null federal parent; those rows stay in `byState` and `totalHeld`. `[held-counts.js:where parent_federal_agency_id is not null]`
- `projectedAgencyPages` counts join rows of agencies to payload rows with page type `agency`. `[held-counts.js:bpp.page_type = 'agency']`
- The connection string is never captured; the host falls back to `local-socket`. `[held-counts.js:local-socket]`
- Queries run one at a time, with no transaction opened here. `[held-counts.js:describeDatabase(client)]`

### `denominators.js`

- `getDenominator` throws `CoverageProvenanceError` for an unregistered id. `[denominators.js:Unknown coverage denominator]`
- `assertPublishable` throws "Coverage denominator is missing." for a falsy or non-object denominator. `[denominators.js:Coverage denominator is missing.]`
- For the `public` audience only, it throws when the citation status is not confirmed (superseded or unconfirmed). Any other audience value skips this check. `[denominators.js:may not be published to a public audience]`
- It throws when `value` is not a positive integer. `[denominators.js:has no usable value]`
- It throws when `source` is falsy. `[denominators.js:has no source]`
- It throws when `year` is not an integer. `[denominators.js:has no year]`
- It throws when `derived` is truthy and `derivedFrom` is falsy. The checks run in the order listed here. `[denominators.js:is derived but does not record]`
- `formatCoverage` throws when `held` is not a non-negative integer. `[denominators.js:Coverage numerator must be]`
- `formatCoverage` throws when `asOfYear` is not an integer, then runs `assertPublishable`. `[denominators.js:Coverage reporting requires the year]`
- `formatCoverage` does not reject a held count above the denominator; `nationalCoverage`, `stateCoverage` and `report.js` guard against it by returning a `held_exceeds_denominator` gap. `[denominators.js:held > denominator.value]`
- Percent rendering: 10 or more with no decimals, below 10 with one decimal. The unrounded `percent` is also returned. `[denominators.js:percent.toFixed(0)]`
- Staleness: age is `asOfYear` minus the denominator year; stale at `STALENESS_THRESHOLD_YEARS` or more. A stale denominator still yields a percentage with a note. `[denominators.js:stalenessYears]`
- `nationalCoverage` always uses the primary and secondary national ids; the caller cannot choose. `[denominators.js:secondaryDenominator]`
- `nationalCoverage` converts every `CoverageProvenanceError` from `formatCoverage` into a `citation_unconfirmed` gap and a null figure; other errors are rethrown. `[denominators.js:error instanceof CoverageProvenanceError]`
- National gap order: primary measurement gap, secondary measurement gap, then a `denominator_stale` gap for each stale denominator. `[denominators.js:years before this report]`
- The `held_exceeds_denominator` detail states the count exceeds the dated estimate and names no cause; no percentage above 100 and no clamped value is produced. `[denominators.js:The held count exceeds the dated estimate]`
- `stateCoverage` precedence: no state denominator gives a `no_state_denominator` gap; a held count above the denominator gives a `held_exceeds_denominator` gap; otherwise `formatCoverage`. A national denominator is never apportioned to a state. `[denominators.js:A national denominator is not apportioned]`
- `getStateDenominator` returns null for an unknown state or universe. `[denominators.js:?? null]`
- Source citations are fixed in `PUBLICATION` (source name, year, document number, publication date, retrieval date, reference period, source URL). The URLs are data and are never fetched. `[denominators.js:NCJ 302187]`
- National values are fixed; the general-purpose value is a derived subtotal and the all-agency value is published directly. `[denominators.js:14924]`
- State denominators are hard-coded rows; the general-purpose state value is local police plus sheriffs plus primary state. `[denominators.js:seSheriff]`
- State codes are upper-cased but not trimmed. `[denominators.js:toUpperCase]`
- Results are frozen (shallow). `[denominators.js:Object.freeze(gaps)]`
- Default audience differs: `formatDenominator` and `formatCoverage` default to public; `formatCoverageCeiling`, `nationalCoverage` and `stateCoverage` default to internal. `[denominators.js:audience = AUDIENCE.INTERNAL]`

### `report.js`

- The file has no `throw`. Errors come from `denominators.js` or from missing input fields, and are not caught. `[report.js:formatCoverageCeiling]`
- Per-state reading precedence for each universe: zero held with a denominator gives a `no_records_held` gap; no denominator gives a `no_state_denominator` gap; a numerator above the denominator gives a `held_exceeds_denominator` gap; a classified numerator gives an achieved coverage; otherwise a ceiling from the raw held count. `[report.js:const isClassified]`
- A classified numerator is used only for a state whose classification row has a truthy `numeratorComplete`. `[report.js:numeratorComplete]`
- Every reading is computed with the internal audience. `[report.js:AUDIENCE.INTERNAL]`
- The zero-held gap cites the state's all-agency denominator and states it is a complete gap. `[report.js:This is a complete gap]`
- The `held_exceeds_denominator` gap uses one of two fixed wordings, by whether the numerator was classified. `[report.js:The classified count still exceeds the 2018 estimate]`
- The report covers the sorted union of codes with a state denominator and codes in `measurement.byState`. `[report.js:allCodes]`
- Per-state gaps are de-duplicated: `no_records_held` once per state, other kinds once per universe. `[report.js:seenKinds]`
- `nationalCoverage` is called with `measurement.totalHeld` for both universes; only its gaps are kept. `[report.js:heldAllAgency: measurement.totalHeld]`
- National gaps with the same kind and detail are reported once, so the staleness gap that both national denominators raise appears a single time. `[report.js:One finding, reported once.]`
- National readings are never achieved percentages: each is a ceiling, or null when the total held exceeds that denominator. `[report.js:nationalCeiling]`
- A state with no classification row counts as fully unclassified. `[report.js:unclassifiedByCode]`
- Report-level gaps: a `numerator_universe_unverified` gap when any held agency is unclassified, then a `corpus_count_disputed` gap when a cross-check disagrees. `[report.js:carry no sourced agency type]`
- The `numerator_universe_unverified` detail names the MN POST source only when `MN` is an unclassified state and the Oregon DPSST source only when `OR` is; with neither, that sentence is left out. `[report.js:unclassifiedStates.includes("MN")]` `[report.js:unclassifiedStates.includes("OR")]`
- Only cross-checks with an integer count that differs from `measurement.totalHeld` count as disagreement. No count is preferred or corrected. `[report.js:disagreeing]`
- `jurisdictionsFullyClassified` is the number of classification rows with `numeratorComplete`; `achievedPercentagesReported` counts non-null coverage readings across both universes. `[report.js:jurisdictionsFullyClassified]`
- The reporting year is taken in UTC. `[report.js:getUTCFullYear]`
- `GAP_LABEL` gives fixed reader text for every gap kind. `[report.js:held count exceeds estimate]`
- Table cells: a gap shows its label; an achieved coverage is bold with `=`; a ceiling shows `≤`; nothing shows an em dash. `[report.js:renderPercent]`
- `num()` renders integers with `en-US` grouping and any non-integer as an em dash. `[report.js:Number.isInteger(value) ? value.toLocaleString]`
- When no achieved percentage exists the Markdown says so in bold and uses the heading "Why there are no percentages". Otherwise it states the number of achieved percentages in bold and uses the heading "Where percentages come from, and why most readings still are not one". `[report.js:Why there are no percentages]` `[report.js:Where percentages come from, and why most readings still are not one]`
- `connectedTo` falls back to the text "an unrecorded address". `[report.js:an unrecorded address]`
- The agency-type section is printed only when a classification row has held agencies. A fixed paragraph about the Texas row follows only when one of those rows has the code `TX`; its figures are fixed text. `[report.js:NOT_IN_CSLLEA_UNIVERSE]` `[report.js:classified.some((row) => row.code === "TX")]`
- The by-state table has fixed columns for held, both denominators and both readings. `[report.js:general-purpose denom.]`
- Named gaps are split into states with nothing held and states with records and an unresolved gap. `[report.js:Nothing held]`
- Measurement limitations and cross-checks are printed only when non-empty. `[report.js:Measurement limitations]`
- The Markdown includes a fixed corpus-fingerprint line. Rendering throws when the fingerprint has no `newest_updated_at`. `[report.js:Corpus fingerprint]` `[report.js:fingerprint is missing newest_updated_at]`
- The report and its parts are frozen (shallow); the caller's `corpusCrossChecks` and `classification` arrays are frozen in place. `[report.js:Object.freeze(classification)]`

## Side Effects

- `held-counts.js` reads the database through the injected client and writes nothing. It reads `information_schema.columns`, `information_schema.tables`, `public.agency` and, when present, `public.build_page_payload`. `[held-counts.js:information_schema.columns]`
- `held-counts.js` calls the server functions `current_database()`, `inet_server_addr()` and `inet_server_port()`. `[held-counts.js:inet_server_port()]`
- `held-counts.js` reads the system clock only through the default `now`. `[held-counts.js:now = new Date()]`
- `held-counts.js` reads no environment variables and has no file access, console output or module-level mutable state. `[held-counts.js:const limitations = [];]`
- `agency-types.js` is pure: no environment variables, database, network, file access, console output or mutable state. `[agency-types.js:const byState = new Map();]`
- `classify-held-agencies.js` is pure: it builds a fresh index on each call and does not change its inputs. `[classify-held-agencies.js:buildSourceIndex(roster.departments ?? [])]`
- `denominators.js` is pure: it builds its registries once at import, reads no clock, and its source URLs are inert data. The national registry and every denominator record are frozen; the module-private state registry is a plain `Map` of frozen records. `[denominators.js:sourceUrl]` `[denominators.js:const STATE_DENOMINATORS = new Map(]`
- `denominators.js` and `report.js` number formatting depends on the runtime's `en-US` locale data. `[denominators.js:toLocaleString]`
- `report.js` reads the system clock only through the default `asOf`. `[report.js:asOf = new Date()]`
- `report.js` freezes the caller's `corpusCrossChecks` and `classification` arrays in place. `[report.js:Object.freeze(corpusCrossChecks)]`
- `report.js` has no database, network, file or console access; the Markdown is returned as a string. `[report.js:lines.join]`

## Verification

- Run: `npm run test:coverage` (runs `src/lib/coverage/*.test.mjs`)
