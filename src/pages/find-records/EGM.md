# Find Records page and data endpoint

## Overview

Two files serve the record finder. `index.astro` is the static page for the route `/find-records/`: a search box that filters places, agencies and federal agencies in the browser. `data.json.ts` is the static endpoint for `/find-records/data.json`: the full finder data set, built once and fetched by the page on first use so the page HTML stays small.

## Interface

### `index.astro` (page)

- Route `/find-records/`; no `getStaticPaths`, no route params and no loaders. `[index.astro:const pagePath = "/find-records/";]`
- Layout: `PageShell` from `#src/layouts/PageShell.astro`, with props `title`, `description`, `pagePath`, `canonicalUrl`, `structuredData`, `breadcrumbs`, `heading` and `lede`. `[index.astro:import PageShell from "#src/layouts/PageShell.astro";]`
- Page metadata: title `Find Records | PoliceConduct.org`; the canonical URL is the page path. `[index.astro:title="Find Records | PoliceConduct.org"]`
- Structured data: `buildWebPage({ siteUrl, pageUrl, name, description, type: "SearchResultsPage" })`, with `siteUrl` from `getSiteUrl(Astro.site)` (both from `#src/lib/structured-data.js`). `[index.astro:type: "SearchResultsPage",]`
- Breadcrumbs: `Home` (`/`) then `Find records` (current). `[index.astro:{ label: "Find records", href: pagePath, current: true },]`
- Server-rendered groups: `finderGroups` holds only `type` and `label` for `place`, `agency` and `federal-agency`; each becomes a hidden `section[data-result-group]` with an empty `[data-result-list]` and a hidden `button[data-show-all]`. `[index.astro:{ type: "federal-agency", label: "Federal agencies" },]`
- Search input `#recordFinder` (`type="search"`, `data-record-finder-input`), inside `[data-record-finder]`; it is not inside a form. `[index.astro:data-record-finder-input]`
- Status line `#recordFinderStatus` (`data-finder-status`, `role="status"`, `aria-live="polite"`), named by the input's `aria-describedby`. `[index.astro:aria-describedby="recordFinderStatus"]`
- Three states: start (`[data-finder-start]`), no results (`[data-finder-no-results]`, with links to `/report/new/` and `/volunteer/`) and results (`[data-finder-results]`). `[index.astro:<div class="finder-empty-state d-none" data-finder-no-results>]`
- Inline client script (`is:inline`): loads the data, matches the query and draws the results. `[index.astro:const updateResults = async () => {]`
- Query parameter `q`: seeds the input on load. `[index.astro:new URLSearchParams(window.location.search).get("q");]`
- History state field `finderQuery`: written on each input event and preferred over `q` on load. `[index.astro:{ ...window.history.state, finderQuery: input.value },]`
- Each result is an `a.finder-result` with the label in a `span` and, when present, the `meta` text in a `small`. `[index.astro:link.className = "finder-result";]`
- Analytics events sent through `window.__IPC_ANALYTICS__.track`: `search_results` (`search_source`, `result_count`), `coverage_search_no_results` (`page_path`, `query_length`, `result_count`) and `search_result_selected` (`search_source`, `result_category`). `[index.astro:window.__IPC_ANALYTICS__?.track?.("coverage_search_no_results", {]`
- Page-local styles for the finder; `.finder-result` rules are `:global` because the script creates those elements. `[index.astro::global(.finder-result) {]`
- The layout and the structured-data helpers are the only imports: no components from `src/components/`. `[index.astro:import { buildWebPage, getSiteUrl } from "#src/lib/structured-data.js";]`

### `data.json.ts` (endpoint)

- `GET` (`APIRoute`): route `/find-records/data.json`; no route params, no `getStaticPaths`, and the request is not read. `[data.json.ts:export const GET: APIRoute = async () => {]`
- Loaders, called together with `Promise.all`: `loadLocationBuildPayloads()` (`#src/lib/data/build-payloads.js`), `loadFederalAgencySummaries()` (`#src/lib/data/federal-agencies.js`) and `loadAgencyFinderResults()` (`#src/lib/data/agencies.js`). `[data.json.ts:const [locations, federalAgencies, agencies] = await Promise.all([]`
- Response: `new Response(JSON.stringify(finderGroups), { headers })` with `Content-Type: application/json; charset=utf-8`. No explicit status is set. `[data.json.ts:"Content-Type": "application/json; charset=utf-8",]`
- Response shape: an array of three groups in this order, each `{ type, label, results }`: `place` / `Places`, `agency` / `Agencies`, `federal-agency` / `Federal agencies`. `[data.json.ts:{ type: "agency", label: "Agencies", results: agencyResults },]`
- Every result is `{ href, label, meta, searchText }`, all strings. `[data.json.ts:searchText: agency.name,]`
- Place results come from locations with `level === "place"`: `href` is `place.path`; `label` joins `displayName`, `administrativeArea` and `stateLabel` with commas; `meta` is the agency count with `agency` or `agencies`; `searchText` joins `displayName`, `administrativeArea`, `administrativeAreaSlug`, `state` and `stateLabel` with spaces. `[data.json.ts:.filter((location) => location.level === "place")]`
- Agency results: `href` is `agency.canonicalPath`; `label` is `agency.name`; `meta` joins `city`, `administrativeArea` and the state label; `searchText` joins `name`, `city`, `administrativeArea`, `state`, the state label, `zipCode` and `canonicalPath`. `[data.json.ts:href: agency.canonicalPath,]`
- Federal agency results: `href` is `agency.path`; `label` and `searchText` are `agency.name`; `meta` is `branchCount` with `location` or `locations`. `[data.json.ts:const federalAgencyResults = federalAgencies.map((agency) => ({]`

## Invariants

- The endpoint throws `Record finder cannot render: no state location for` an agency whose `state` has no location with `level === "state"`. `[data.json.ts:no state location for "${state}" (agency ${agencyPath}).]`
- State labels are looked up by lower-cased state code, from the `stateLabel` of the state-level locations. `[data.json.ts:const label = stateLabels.get(state.toLowerCase());]`
- A place with no `agencies` array counts as zero agencies. `[data.json.ts:(place.agencies?.length ?? 0) === 1 ? "agency" : "agencies"]`
- Empty parts are dropped before joining labels, meta text and search text. `[data.json.ts:.filter(Boolean)]`
- The group `type` values in the page and in the endpoint must match: the script finds each list and section by the `type` of the fetched group. `[index.astro:const list = resultLists.get(group.type);]`
- The page HTML carries no results; the data is fetched from `/find-records/data.json` at most once per successful load, on first focus of the input or on the first search. `[index.astro:loadPromise = fetch("/find-records/data.json")]`
- A failed or non-OK fetch clears the stored promise, so the next keystroke tries again, and the status line reports that records could not be loaded. `[index.astro:"Unable to load records. Check your connection and try again.",]`
- A search that finished loading after the input changed is dropped. `[index.astro:if (normalize(input?.value) !== query) return;]`
- The query is trimmed, lower-cased and has runs of white space collapsed; its terms are the runs of letters and digits. `[index.astro:query.split(/[^\p{L}\p{N}]+/u).filter(Boolean);]`
- A query with no terms shows the start state and clears the completed search. `[index.astro:if (terms.length === 0) {]`
- A result matches when its normalized `searchText` contains the whole query, or contains every term. Whole-query matches are listed before every-term matches. `[index.astro:} else if (terms.every((term) => searchText.includes(term))) {]`
- Within each of those two sets, results whose label starts with the first term come first. `[index.astro:normalize(result.label).startsWith(terms[0]),]`
- Each group shows at most 12 results until its "Show all" button is used. `[index.astro:const maxVisiblePerGroup = 12;]`
- A "Show all" choice lasts only for the current query; a new query clears it. `[index.astro:if (query !== expandedQuery) {]`
- After "Show all", focus moves to the first newly shown result. `[index.astro:resultLists.get(type)?.children[maxVisiblePerGroup]?.focus();]`
- `search_results` is sent 750 ms after a completed search, or at once when a result is clicked, and is not sent twice in a row for the same query. `[index.astro:noResultTimer = window.setTimeout(reportSearchResults, 750);]`
- `coverage_search_no_results` is sent at most once per distinct query, and carries the query length, not the query text. `[index.astro:if (!query || reportedNoResultQueries.has(query)) {]`
- No search is recorded as completed while the data has not loaded. `[index.astro:completedSearch = finderDataLoaded]`
- The remembered search is kept in history state and is not written to the URL. `[index.astro:window.history.replaceState(]`
- Result text is set with `textContent`; data is never inserted as HTML. `[index.astro:label.textContent = result.label;]`
- `pagePath` is the single source for the `pagePath` prop, the `canonicalUrl` prop, the breadcrumb `href` and the structured-data `pageUrl`. `[index.astro:canonicalUrl={pagePath}]`

## Side Effects

- Build-time data loading in the endpoint through the three loaders; the endpoint writes nothing and makes no network call. `[data.json.ts:loadAgencyFinderResults(),]`
- Browser network call: `fetch("/find-records/data.json")`. `[index.astro:input?.addEventListener("focus", loadFinderData, { once: true });]`
- Rewrites the current history entry's state with `finderQuery` on every input event. `[index.astro:window.history.state?.finderQuery ??]`
- Sends analytics events through `window.__IPC_ANALYTICS__.track` when present. `[index.astro:window.__IPC_ANALYTICS__?.track?.("search_results", {]`
- Replaces the children of the result lists and toggles the `hidden` attribute and `d-none` class of the groups and states. `[index.astro:list.replaceChildren();]`

## Verification

- Run: `npm run test:e2e`
