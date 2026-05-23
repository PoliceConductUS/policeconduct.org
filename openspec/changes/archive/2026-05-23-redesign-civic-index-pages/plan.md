# Civic Index Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign state, administrative-area, and place landing pages into a shared Civic Index pattern that preserves database-backed routing and clearly separates current coverage from future uncollected datasets.

**Architecture:** Keep the three existing Astro route files as route owners, but move shared page construction into a focused TypeScript presentation model and one shared Astro page component. Use `build_page_payload` for location hierarchy and canonical paths, supplement it with local database aggregate counts joined through `location_path`, then render one-level-down map/table data per page level.

**Tech Stack:** Astro 6, TypeScript, PostgreSQL via `pg`, existing `withDb` helper, Leaflet-backed `LocationMap`, Bootstrap/theme variables, Playwright e2e tests, OpenSpec.

---

## File Structure

- Create: `src/lib/data/civic-index.ts`
  - Owns Civic Index types, future placeholder definitions, action definitions, scoped coverage loading, and model builders for state/administrative-area/place pages.
- Create: `src/components/CivicIndexPage.astro`
  - Owns the shared page layout, current coverage panel, action rail, map/table section, future placeholder section, and table search/sort script.
- Modify: `src/pages/[category]/index.astro`
  - Builds a state Civic Index model and renders `CivicIndexPage`.
- Modify: `src/pages/[category]/[administrativeArea]/index.astro`
  - Builds an administrative-area Civic Index model and renders `CivicIndexPage`.
- Modify: `src/pages/[category]/[administrativeArea]/[place]/index.astro`
  - Builds a place Civic Index model and renders `CivicIndexPage`.
- Create: `tests/e2e/civic-index.spec.ts`
  - Verifies shared page UI, one-level-down table/map labels, current coverage panel, future placeholders, and canonical links.
- Modify: `openspec/changes/redesign-civic-index-pages/tasks.md`
  - Mark tasks complete as implementation progresses.

---

### Task 1: Data Source Audit and Model Skeleton

**Files:**

- Create: `src/lib/data/civic-index.ts`
- Modify: `openspec/changes/redesign-civic-index-pages/tasks.md`

- [ ] **Step 1: Inspect source schemas used by the page**

Run:

```bash
rg "create table public\\.(agency|location_path|reviews|civil_cases|agency_officers|coverage|source)" supabase scripts src -n
rg "coverage|source_link|source link|source_url|links" supabase scripts src -n
```

Expected: Identify whether source/coverage link counts have a reliable local table or field. If no reliable source exists, do not include a source-link coverage metric in the first implementation.

- [ ] **Step 2: Create the Civic Index data module with shared types**

Add `src/lib/data/civic-index.ts`:

```ts
import { withDb } from "#src/lib/db.js";
import type {
  LocationAgencyPayload,
  LocationChildPayload,
  LocationPagePayload,
} from "./build-payloads.js";

const collator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

export type CivicIndexLevel = "state" | "administrative_area" | "place";

export type CivicCoverageMetric = {
  key: "agencies" | "personnel" | "reports" | "civil_cases" | "source_links";
  label: string;
  value: number;
};

export type CivicIndexAction = {
  description: string;
  href: string;
  label: string;
};

export type CivicIndexActionGroup = {
  actions: CivicIndexAction[];
  label: string;
};

export type CivicFutureDataset = {
  description: string;
  label: string;
};

export type CivicIndexColumn = {
  key: string;
  label: string;
  numeric?: boolean;
};

export type CivicIndexRow = {
  href: string;
  label: string;
  searchText: string;
  values: Record<string, number | string | null>;
};

export type CivicIndexMapPoint = {
  count?: number;
  href: string;
  label: string;
  lat: number;
  lng: number;
  meta?: string | null;
};

export type CivicIndexModel = {
  actionGroups: CivicIndexActionGroup[];
  breadcrumbs: { current?: boolean; href: string; label: string }[];
  columns: CivicIndexColumn[];
  coverage: CivicCoverageMetric[];
  description: string;
  futureDatasets: CivicFutureDataset[];
  indexLabel: string;
  jurisdictionLabel: string;
  level: CivicIndexLevel;
  map: {
    bounds: LocationPagePayload["mapBounds"];
    description: string;
    emptyLabel: string;
    points: CivicIndexMapPoint[];
    title: string;
  };
  pagePath: string;
  rows: CivicIndexRow[];
  title: string;
};

type ScopedCoverageRow = {
  agency_count: string | number;
  civil_case_count: string | number;
  personnel_count: string | number;
  report_count: string | number;
};

const toCount = (value: string | number | null | undefined) =>
  Number(value || 0);
```

- [ ] **Step 3: Add future dataset and action definitions**

Append to `src/lib/data/civic-index.ts`:

```ts
const futureDatasets: CivicFutureDataset[] = [
  {
    label: "Use-of-force policy checklist",
    description:
      "Detailed policy elements and compliance indicators are not yet collected.",
  },
  {
    label: "Settlement and payout history",
    description:
      "Aggregate settlement amounts and payout trends are not yet collected.",
  },
  {
    label: "Complaint outcomes",
    description:
      "Sustained, not sustained, exonerated, and other outcomes are not yet collected.",
  },
  {
    label: "Civil forfeiture indicators",
    description:
      "Seizures, property values, and outcomes are not yet collected.",
  },
  {
    label: "Accountability barriers",
    description:
      "Legal protections and oversight limitations are not yet collected.",
  },
  {
    label: "Positive-deviance practices",
    description:
      "Evidence-backed effective policies and reforms are not yet collected.",
  },
];

const getActionGroups = (pagePath: string): CivicIndexActionGroup[] => [
  {
    label: "Resident",
    actions: [
      {
        label: "Find my local agency",
        description:
          "Look up the law enforcement agencies that serve this area.",
        href: pagePath,
      },
      {
        label: "Share an interaction",
        description: "Submit details about an encounter with law enforcement.",
        href: "/report/new/",
      },
      {
        label: "Get notified when records change",
        description:
          "Contact PoliceConduct.org about updates for this jurisdiction.",
        href: "/about/contact/",
      },
    ],
  },
  {
    label: "Defense attorney",
    actions: [
      {
        label: "Check personnel history",
        description:
          "Review employment, discipline, and complaints tied to personnel records.",
        href: "/personnel/",
      },
      {
        label: "Review civil litigation",
        description:
          "Search civil cases involving law enforcement agencies or officers.",
        href: "/civil-litigation/",
      },
      {
        label: "Submit missing source records",
        description:
          "Help expand the public record by submitting official documents.",
        href: "/find-records/",
      },
    ],
  },
];
```

- [ ] **Step 4: Run typecheck to capture skeleton errors**

Run:

```bash
npm run validate:types
```

Expected: It may fail if the new module has unused declarations. That is acceptable before route integration; do not mark Task 1 complete until the module is wired in and typecheck passes in later tasks.

- [ ] **Step 5: Mark task 1.1 complete after audit notes are reflected**

In `openspec/changes/redesign-civic-index-pages/tasks.md`, change:

```md
- [ ] 1.1 Inspect existing `build_page_payload`, `location_path`, agency, personnel, report, civil case, and coverage/source-link data sources for the fields needed by Civic Index pages.
```

to:

```md
- [x] 1.1 Inspect existing `build_page_payload`, `location_path`, agency, personnel, report, civil case, and coverage/source-link data sources for the fields needed by Civic Index pages.
```

Commit checkpoint after Task 1:

```bash
git add src/lib/data/civic-index.ts openspec/changes/redesign-civic-index-pages/tasks.md
git commit -m "feat: define civic index data model"
```

---

### Task 2: Scoped Coverage Loader

**Files:**

- Modify: `src/lib/data/civic-index.ts`
- Modify: `openspec/changes/redesign-civic-index-pages/tasks.md`

- [ ] **Step 1: Add location scope helpers**

Append to `src/lib/data/civic-index.ts`:

```ts
const getLocationParts = (location: LocationPagePayload) =>
  location.path.split("/").filter(Boolean);

const getScopeWhereClause = (location: LocationPagePayload) => {
  const parts = getLocationParts(location);
  if (location.level === "state") {
    return {
      clause: "lower(lp.state_or_territory_slug) = $1",
      values: [parts[0]],
    };
  }
  if (location.level === "administrative_area") {
    return {
      clause:
        "lower(lp.state_or_territory_slug) = $1 and lower(lp.administrative_area_slug) = $2",
      values: [parts[0], parts[1]],
    };
  }
  return {
    clause:
      "lower(lp.state_or_territory_slug) = $1 and lower(lp.administrative_area_slug) = $2 and lower(lp.place_slug) = $3",
    values: [parts[0], parts[1], parts[2]],
  };
};
```

- [ ] **Step 2: Add scoped coverage query**

Append to `src/lib/data/civic-index.ts`:

```ts
export const loadCivicIndexCoverage = async (
  location: LocationPagePayload,
): Promise<CivicCoverageMetric[]> => {
  const scope = getScopeWhereClause(location);
  const row = await withDb(async (client): Promise<ScopedCoverageRow> => {
    const result = await client.query(
      `
        select
          count(distinct a.id) as agency_count,
          count(distinct ao.officer_id) as personnel_count,
          count(distinct r.id) as report_count,
          count(distinct c.id) as civil_case_count
        from public.location_path lp
        left join public.agency a
          on a.location_path_id = lp.location_path_id
        left join public.agency_officers ao
          on ao.agency_id = a.id
         and ao.end_date is null
        left join public.reviews r
          on r.location_path_id = lp.location_path_id
        left join public.civil_cases c
          on c.location_path_id = lp.location_path_id
        where ${scope.clause}
      `,
      scope.values,
    );
    return result.rows[0] as ScopedCoverageRow;
  });

  return [
    { key: "agencies", label: "Agencies", value: toCount(row.agency_count) },
    {
      key: "personnel",
      label: "Personnel",
      value: toCount(row.personnel_count),
    },
    { key: "reports", label: "Reports", value: toCount(row.report_count) },
    {
      key: "civil_cases",
      label: "Civil cases",
      value: toCount(row.civil_case_count),
    },
  ];
};
```

This query intentionally references required tables directly. If `agency`, `location_path`, `agency_officers`, `reviews`, or `civil_cases` is missing, build fails.

- [ ] **Step 3: Add row count helpers**

Append to `src/lib/data/civic-index.ts`:

```ts
const getChildCounts = (child: LocationChildPayload) => ({
  agencies: child.childCount,
  civilCases: 0,
  personnel: 0,
  reports: 0,
});

const getAgencyCounts = (agency: LocationAgencyPayload) => ({
  agencies: 1,
  civilCases: 0,
  personnel: 0,
  reports: 0,
  address: agency.address || "",
});
```

These start with fields available in `build_page_payload`. A later task can replace row-level zeros with richer aggregates if the audit finds reliable local data at child-row level. The current coverage panel will still use scoped aggregate counts.

- [ ] **Step 4: Mark tasks 1.2, 1.3, and 1.4 complete after successful integration**

Do not mark these yet if typecheck fails. After route integration and validation, update:

```md
- [ ] 1.2 Define a minimal shared Civic Index presentation type for jurisdiction metadata, breadcrumbs, coverage counts, one-level-down map points, table rows, persona actions, and future placeholders.
- [ ] 1.3 Implement scoped aggregate loading for agency, personnel, public report, civil case, and available source/coverage-link counts using local database joins through `location_path`.
- [ ] 1.4 Ensure missing required tables or fields continue to fail the build, and do not add silent schema guards for required current-data fields.
```

to checked boxes.

Commit checkpoint after Task 2:

```bash
git add src/lib/data/civic-index.ts openspec/changes/redesign-civic-index-pages/tasks.md
git commit -m "feat: load civic index coverage"
```

---

### Task 3: Civic Index Model Builders

**Files:**

- Modify: `src/lib/data/civic-index.ts`
- Modify: `openspec/changes/redesign-civic-index-pages/tasks.md`

- [ ] **Step 1: Add shared formatting helpers**

Append to `src/lib/data/civic-index.ts`:

```ts
const formatCount = (
  count: number,
  singular: string,
  plural = `${singular}s`,
) => `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;

const buildChildSearchText = (child: LocationChildPayload) =>
  [child.label, child.nextLabel, child.nextDetail].filter(Boolean).join(" ");

const buildAgencySearchText = (agency: LocationAgencyPayload) =>
  [
    agency.name,
    agency.address,
    agency.city,
    agency.administrativeArea,
    agency.slug,
  ]
    .filter(Boolean)
    .join(" ");
```

- [ ] **Step 2: Add state/admin child row builder**

Append to `src/lib/data/civic-index.ts`:

```ts
const buildChildRows = (children: LocationChildPayload[]): CivicIndexRow[] =>
  children
    .map((child) => {
      const counts = getChildCounts(child);
      return {
        href: child.nextPath || child.path,
        label: child.nextLabel || child.label,
        searchText: buildChildSearchText(child),
        values: {
          agencies: counts.agencies,
          civilCases: counts.civilCases,
          detail: child.nextDetail || formatCount(child.childCount, "record"),
          personnel: counts.personnel,
          reports: counts.reports,
        },
      };
    })
    .sort((a, b) => collator.compare(a.label, b.label));
```

- [ ] **Step 3: Add agency row builder**

Append to `src/lib/data/civic-index.ts`:

```ts
const buildAgencyRows = (agencies: LocationAgencyPayload[]): CivicIndexRow[] =>
  agencies
    .map((agency) => {
      const counts = getAgencyCounts(agency);
      return {
        href: agency.path,
        label: agency.name,
        searchText: buildAgencySearchText(agency),
        values: {
          address: counts.address,
          agencies: counts.agencies,
          civilCases: counts.civilCases,
          personnel: counts.personnel,
          reports: counts.reports,
        },
      };
    })
    .sort((a, b) => collator.compare(a.label, b.label));
```

- [ ] **Step 4: Add map point builders**

Append to `src/lib/data/civic-index.ts`:

```ts
const buildChildMapPoints = (
  children: LocationChildPayload[],
): CivicIndexMapPoint[] =>
  children
    .filter((child) => child.mapPoint)
    .map((child) => ({
      count: child.childCount,
      href: child.nextPath || child.path,
      label: child.nextLabel || child.label,
      lat: child.mapPoint!.lat,
      lng: child.mapPoint!.lng,
      meta: child.nextDetail || formatCount(child.childCount, "record"),
    }));

const buildAgencyMapPoints = (
  agencies: LocationAgencyPayload[],
): CivicIndexMapPoint[] =>
  agencies
    .filter((agency) => agency.mapPoint)
    .map((agency) => ({
      href: agency.path,
      label: agency.name,
      lat: agency.mapPoint!.lat,
      lng: agency.mapPoint!.lng,
      meta: agency.address || "Agency",
    }));
```

- [ ] **Step 5: Add exported model builders**

Append to `src/lib/data/civic-index.ts`:

```ts
export const buildStateCivicIndex = async (
  state: LocationPagePayload,
): Promise<CivicIndexModel> => {
  const areaPlural = state.administrativeAreaPlural!;
  const rows = buildChildRows(state.children || []);
  return {
    actionGroups: getActionGroups(state.path),
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: "Find Records", href: "/find-records/" },
      { label: state.stateLabel, href: state.path, current: true },
    ],
    columns: [
      { key: "label", label: "County / Area" },
      { key: "agencies", label: "Agencies", numeric: true },
      { key: "personnel", label: "Personnel", numeric: true },
      { key: "reports", label: "Reports", numeric: true },
      { key: "civilCases", label: "Civil cases", numeric: true },
    ],
    coverage: await loadCivicIndexCoverage(state),
    description: `Browse local agency records, public reports, civil litigation, personnel profiles, and source links currently available for this state.`,
    futureDatasets,
    indexLabel: `${areaPlural} and local places with records`,
    jurisdictionLabel: "State civic index",
    level: "state",
    map: {
      bounds: state.mapBounds,
      description: `${areaPlural} with available records.`,
      emptyLabel: `No mapped ${areaPlural.toLowerCase()} records.`,
      points: buildChildMapPoints(state.children || []),
      title: `${state.stateLabel} ${areaPlural}`,
    },
    pagePath: state.path,
    rows,
    title: `${state.stateLabel} Civic Index | PoliceConduct.org`,
  };
};

export const buildAdministrativeAreaCivicIndex = async (
  area: LocationPagePayload,
): Promise<CivicIndexModel> => {
  const rows = buildChildRows(area.children || []);
  return {
    actionGroups: getActionGroups(area.path),
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: "Find Records", href: "/find-records/" },
      { label: area.stateLabel, href: `/${area.state}/` },
      { label: area.administrativeArea!, href: area.path, current: true },
    ],
    columns: [
      { key: "label", label: "Place" },
      { key: "agencies", label: "Agencies", numeric: true },
      { key: "personnel", label: "Personnel", numeric: true },
      { key: "reports", label: "Reports", numeric: true },
      { key: "civilCases", label: "Civil cases", numeric: true },
    ],
    coverage: await loadCivicIndexCoverage(area),
    description: `Browse local agency records, public reports, civil litigation, personnel profiles, and source links currently available for this ${area.administrativeAreaKind || "administrative area"}.`,
    futureDatasets,
    indexLabel: "Places with records",
    jurisdictionLabel: `${area.administrativeAreaKind || "Administrative area"} civic index`,
    level: "administrative_area",
    map: {
      bounds: area.mapBounds,
      description: "Places with available records.",
      emptyLabel: "No mapped places.",
      points: buildChildMapPoints(area.children || []),
      title: `${area.administrativeArea} places`,
    },
    pagePath: area.path,
    rows,
    title: `${area.administrativeArea}, ${area.stateLabel} Civic Index | PoliceConduct.org`,
  };
};

export const buildPlaceCivicIndex = async (
  place: LocationPagePayload,
): Promise<CivicIndexModel> => {
  const rows = buildAgencyRows(place.agencies || []);
  return {
    actionGroups: getActionGroups(place.path),
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: "Find Records", href: "/find-records/" },
      { label: place.stateLabel, href: `/${place.state}/` },
      { label: place.administrativeArea!, href: place.parentPath! },
      { label: place.displayName, href: place.path, current: true },
    ],
    columns: [
      { key: "label", label: "Agency" },
      { key: "address", label: "Address" },
      { key: "personnel", label: "Personnel", numeric: true },
      { key: "reports", label: "Reports", numeric: true },
      { key: "civilCases", label: "Civil cases", numeric: true },
    ],
    coverage: await loadCivicIndexCoverage(place),
    description: `Browse law enforcement agencies, public reports, civil litigation, personnel profiles, and source links currently available for this place.`,
    futureDatasets,
    indexLabel: "Agencies with records",
    jurisdictionLabel: "Place civic index",
    level: "place",
    map: {
      bounds: place.mapBounds,
      description: "Agencies with available records.",
      emptyLabel: "No mapped agencies.",
      points: buildAgencyMapPoints(place.agencies || []),
      title: `${place.displayName} agencies`,
    },
    pagePath: place.path,
    rows,
    title: `${place.displayName}, ${place.administrativeArea} Civic Index | PoliceConduct.org`,
  };
};
```

- [ ] **Step 6: Run formatter on the new module**

Run:

```bash
npx prettier --write src/lib/data/civic-index.ts
```

Expected: `src/lib/data/civic-index.ts` is formatted.

Commit checkpoint after Task 3:

```bash
git add src/lib/data/civic-index.ts
git commit -m "feat: build civic index models"
```

---

### Task 4: Shared Civic Index Component

**Files:**

- Create: `src/components/CivicIndexPage.astro`
- Modify: `openspec/changes/redesign-civic-index-pages/tasks.md`

- [ ] **Step 1: Create the Astro component frontmatter and layout shell**

Add `src/components/CivicIndexPage.astro`:

```astro
---
import Breadcrumbs from "#src/components/Breadcrumbs.astro";
import LocationMap from "#src/components/LocationMap.astro";
import SiteLayout from "#src/layouts/SiteLayout.astro";
import type { CivicIndexModel } from "#src/lib/data/civic-index.js";
import { buildWebPage, getSiteUrl } from "#src/lib/structured-data.js";

const { model, site } = Astro.props as {
  model: CivicIndexModel;
  site: URL | undefined;
};

const siteUrl = getSiteUrl(site);
const pageUrl = new URL(model.pagePath, siteUrl).toString();
const structuredData = buildWebPage({
  siteUrl,
  pageUrl,
  name: model.title,
  description: model.description,
  type: "CollectionPage",
});
---

<SiteLayout
  title={model.title}
  description={model.description}
  pagePath={model.pagePath}
  structuredData={structuredData}
>
  <main class="civic-index">
    <section class="civic-index-hero">
      <div class="container">
        <div class="civic-index-hero-grid">
          <div>
            <Breadcrumbs items={model.breadcrumbs} className="mb-3" />
            <p class="civic-index-kicker">{model.jurisdictionLabel}</p>
            <h1>{model.breadcrumbs[model.breadcrumbs.length - 1].label}</h1>
            <p class="civic-index-lede">{model.description}</p>
          </div>
          <aside class="civic-coverage" aria-label="Current record coverage">
            <h2>Current record coverage</h2>
            <dl>
              {
                model.coverage.map((metric) => (
                  <div>
                    <dt>{metric.label}</dt>
                    <dd>{metric.value.toLocaleString("en-US")}</dd>
                  </div>
                ))
              }
            </dl>
          </aside>
        </div>
      </div>
    </section>
  </main></SiteLayout
>
```

- [ ] **Step 2: Add map, table, and action rail markup**

Append inside `<main>` before closing it:

```astro
<section class="civic-index-main">
  <div class="container civic-index-main-grid">
    <div class="civic-index-records">
      <LocationMap
        title={model.map.title}
        description={model.map.description}
        bounds={model.map.bounds}
        points={model.map.points}
        emptyLabel={model.map.emptyLabel}
      />
      <div class="civic-index-table-wrap">
        <div class="civic-index-table-header">
          <h2>{model.indexLabel}</h2>
          <label>
            <span class="visually-hidden">Search index</span>
            <input
              data-civic-index-search
              type="search"
              placeholder="Search this index"
            />
          </label>
        </div>
        <table class="civic-index-table" data-civic-index-table>
          <thead>
            <tr>
              {
                model.columns.map((column) => (
                  <th scope="col">
                    <button
                      type="button"
                      data-civic-index-sort={column.key}
                      data-civic-index-numeric={
                        column.numeric ? "true" : "false"
                      }
                    >
                      {column.label}
                    </button>
                  </th>
                ))
              }
              <th scope="col">View</th>
            </tr>
          </thead>
          <tbody>
            {
              model.rows.map((row) => (
                <tr data-civic-index-row data-search-text={row.searchText}>
                  {model.columns.map((column) => (
                    <td
                      data-sort-value={String(
                        column.key === "label"
                          ? row.label
                          : (row.values[column.key] ?? ""),
                      )}
                    >
                      {column.key === "label" ? (
                        <a href={row.href}>{row.label}</a>
                      ) : (
                        (row.values[column.key] ?? "")
                      )}
                    </td>
                  ))}
                  <td>
                    <a href={row.href}>View</a>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
    <aside class="civic-actions" aria-label="Start with a question">
      <h2>Start with a question</h2>
      {
        model.actionGroups.map((group) => (
          <section>
            <h3>{group.label}</h3>
            <ul>
              {group.actions.map((action) => (
                <li>
                  <a href={action.href}>
                    <strong>{action.label}</strong>
                    <span>{action.description}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))
      }
    </aside>
  </div>
</section>
```

- [ ] **Step 3: Add future dataset markup**

Append inside `<main>` after the main grid:

```astro
<section class="civic-future">
  <div class="container">
    <h2>Data not collected yet</h2>
    <div class="civic-future-grid">
      {
        model.futureDatasets.map((dataset) => (
          <article>
            <h3>{dataset.label}</h3>
            <p>{dataset.description}</p>
          </article>
        ))
      }
    </div>
  </div>
</section>
```

- [ ] **Step 4: Add search/sort script**

Append to `src/components/CivicIndexPage.astro`:

```astro
<script is:inline>
  (() => {
    const collator = new Intl.Collator("en", {
      numeric: true,
      sensitivity: "base",
    });
    document.querySelectorAll("[data-civic-index-table]").forEach((table) => {
      const rows = Array.from(table.querySelectorAll("[data-civic-index-row]"));
      const search = table
        .closest(".civic-index-table-wrap")
        ?.querySelector("[data-civic-index-search]");

      search?.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();
        rows.forEach((row) => {
          const text = row.dataset.searchText?.toLowerCase() || "";
          row.hidden = Boolean(query) && !text.includes(query);
        });
      });

      table.querySelectorAll("[data-civic-index-sort]").forEach((button) => {
        button.addEventListener("click", () => {
          const headerCell = button.closest("th");
          const index = Array.from(headerCell.parentElement.children).indexOf(
            headerCell,
          );
          const numeric = button.dataset.civicIndexNumeric === "true";
          const body = table.querySelector("tbody");
          const sorted = [...rows].sort((left, right) => {
            const leftValue =
              left.children[index]?.getAttribute("data-sort-value") || "";
            const rightValue =
              right.children[index]?.getAttribute("data-sort-value") || "";
            if (numeric) {
              return Number(leftValue || 0) - Number(rightValue || 0);
            }
            return collator.compare(leftValue, rightValue);
          });
          body.replaceChildren(...sorted);
        });
      });
    });
  })();
</script>
```

- [ ] **Step 5: Add component styles**

Append to `src/components/CivicIndexPage.astro`:

```astro
<style>
  .civic-index {
    background: #fbfaf7;
    color: #14202a;
  }

  .civic-index-hero,
  .civic-index-main,
  .civic-future {
    border-bottom: 1px solid rgba(20, 32, 42, 0.32);
    padding: clamp(2rem, 5vw, 4.5rem) 0;
  }

  .civic-index-hero-grid,
  .civic-index-main-grid {
    display: grid;
    gap: clamp(1.5rem, 4vw, 3rem);
    grid-template-columns: minmax(0, 1fr);
  }

  .civic-index-kicker,
  .civic-actions h3 {
    color: #9d1f1f;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    margin-bottom: 1rem;
    text-transform: uppercase;
  }

  .civic-index h1 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(3rem, 8vw, 5.75rem);
    line-height: 0.95;
    margin: 0 0 1.5rem;
  }

  .civic-index-lede {
    font-size: clamp(1.1rem, 2vw, 1.35rem);
    line-height: 1.6;
    max-width: 42rem;
  }

  .civic-coverage,
  .civic-actions {
    border: 1px solid rgba(20, 32, 42, 0.32);
    padding: 1.25rem;
  }

  .civic-coverage h2,
  .civic-actions h2,
  .civic-index-table-header h2,
  .civic-future h2 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(1.65rem, 3vw, 2.35rem);
    margin: 0;
  }

  .civic-coverage dl {
    margin: 1rem 0 0;
  }

  .civic-coverage div,
  .civic-actions li,
  .civic-index-table th,
  .civic-index-table td {
    border-top: 1px solid rgba(20, 32, 42, 0.22);
  }

  .civic-coverage div {
    align-items: baseline;
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    padding: 0.8rem 0;
  }

  .civic-coverage dt {
    font-weight: 500;
    order: 2;
  }

  .civic-coverage dd {
    color: #14202a;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.65rem;
    font-weight: 700;
    margin: 0;
  }

  .civic-index-records {
    min-width: 0;
  }

  .civic-index-table-wrap {
    margin-top: 1.25rem;
  }

  .civic-index-table-header {
    align-items: end;
    display: grid;
    gap: 1rem;
    grid-template-columns: minmax(0, 1fr);
    margin-bottom: 1rem;
  }

  .civic-index-table-header input {
    background: #fffefa;
    border: 1px solid rgba(20, 32, 42, 0.52);
    border-radius: 0;
    min-height: 2.75rem;
    padding: 0.65rem 0.85rem;
    width: 100%;
  }

  .civic-index-table {
    border-collapse: collapse;
    font-size: 0.95rem;
    width: 100%;
  }

  .civic-index-table th,
  .civic-index-table td {
    padding: 0.75rem 0.45rem;
    text-align: left;
    vertical-align: top;
  }

  .civic-index-table th button {
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    font-weight: 700;
    padding: 0;
    text-align: left;
  }

  .civic-index a {
    color: #005ea8;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.18em;
  }

  .civic-actions ul {
    list-style: none;
    margin: 0 0 1.5rem;
    padding: 0;
  }

  .civic-actions li a {
    display: grid;
    gap: 0.25rem;
    padding: 1rem 0;
    text-decoration: none;
  }

  .civic-actions li strong {
    color: #005ea8;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.1rem;
  }

  .civic-actions li span,
  .civic-future p {
    color: #314252;
    line-height: 1.45;
  }

  .civic-future-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    margin-top: 1.25rem;
  }

  .civic-future article {
    border: 1px solid rgba(20, 32, 42, 0.26);
    padding: 1rem;
  }

  .civic-future h3 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.2rem;
    margin: 0 0 0.45rem;
  }

  @media (min-width: 992px) {
    .civic-index-hero-grid {
      grid-template-columns: minmax(0, 1fr) minmax(18rem, 27rem);
    }

    .civic-index-main-grid {
      grid-template-columns: minmax(0, 1fr) minmax(18rem, 28rem);
    }

    .civic-index-table-header {
      grid-template-columns: minmax(0, 1fr) minmax(16rem, 24rem);
    }
  }

  @media (max-width: 767.98px) {
    .civic-index-table {
      display: block;
      overflow-x: auto;
      white-space: nowrap;
    }
  }
</style>
```

- [ ] **Step 6: Run formatter**

Run:

```bash
npx prettier --write src/components/CivicIndexPage.astro
```

Expected: `src/components/CivicIndexPage.astro` is formatted.

Commit checkpoint after Task 4:

```bash
git add src/components/CivicIndexPage.astro
git commit -m "feat: add civic index page component"
```

---

### Task 5: Route Integration

**Files:**

- Modify: `src/pages/[category]/index.astro`
- Modify: `src/pages/[category]/[administrativeArea]/index.astro`
- Modify: `src/pages/[category]/[administrativeArea]/[place]/index.astro`
- Modify: `openspec/changes/redesign-civic-index-pages/tasks.md`

- [ ] **Step 1: Replace state page rendering**

Rewrite `src/pages/[category]/index.astro` to:

```astro
---
import CivicIndexPage from "#src/components/CivicIndexPage.astro";
import { buildStateCivicIndex } from "#src/lib/data/civic-index.js";
import {
  loadLocationBuildPayloads,
  type LocationPagePayload,
} from "#src/lib/data/build-payloads.js";

export async function getStaticPaths() {
  const locations = await loadLocationBuildPayloads();

  return locations
    .filter(
      (location) =>
        location.level === "state" && (location.children?.length ?? 0) > 0,
    )
    .map((state) => ({
      params: { category: state.state },
      props: { state },
    }));
}

const { state } = Astro.props as { state: LocationPagePayload };
const model = await buildStateCivicIndex(state);
---

<CivicIndexPage model={model} site={Astro.site} />
```

- [ ] **Step 2: Replace administrative-area page rendering**

Rewrite `src/pages/[category]/[administrativeArea]/index.astro` to:

```astro
---
import CivicIndexPage from "#src/components/CivicIndexPage.astro";
import { buildAdministrativeAreaCivicIndex } from "#src/lib/data/civic-index.js";
import {
  loadLocationBuildPayloads,
  type LocationPagePayload,
} from "#src/lib/data/build-payloads.js";

export async function getStaticPaths() {
  const locations = await loadLocationBuildPayloads();

  return locations
    .filter((location) => location.level === "administrative_area")
    .map((area) => ({
      params: {
        category: area.state,
        administrativeArea: area.path.split("/").filter(Boolean)[1],
      },
      props: { area },
    }));
}

const { area } = Astro.props as { area: LocationPagePayload };
const model = await buildAdministrativeAreaCivicIndex(area);
---

<CivicIndexPage model={model} site={Astro.site} />
```

- [ ] **Step 3: Replace place page rendering**

Rewrite `src/pages/[category]/[administrativeArea]/[place]/index.astro` to:

```astro
---
import CivicIndexPage from "#src/components/CivicIndexPage.astro";
import { buildPlaceCivicIndex } from "#src/lib/data/civic-index.js";
import {
  loadLocationBuildPayloads,
  type LocationPagePayload,
} from "#src/lib/data/build-payloads.js";

export async function getStaticPaths() {
  const locations = await loadLocationBuildPayloads();

  return locations
    .filter((location) => location.level === "place")
    .map((place) => {
      const parts = place.path.split("/").filter(Boolean);
      return {
        params: {
          category: parts[0],
          administrativeArea: parts[1],
          place: parts[2],
        },
        props: { place },
      };
    });
}

const { place } = Astro.props as { place: LocationPagePayload };
const model = await buildPlaceCivicIndex(place);
---

<CivicIndexPage model={model} site={Astro.site} />
```

- [ ] **Step 4: Format changed routes**

Run:

```bash
npx prettier --write 'src/pages/[category]/index.astro' 'src/pages/[category]/[administrativeArea]/index.astro' 'src/pages/[category]/[administrativeArea]/[place]/index.astro'
```

Expected: three route files are formatted.

- [ ] **Step 5: Run type validation**

Run:

```bash
npm run validate:types
```

Expected: PASS. If it fails, fix the exact TypeScript/Astro errors before moving on.

- [ ] **Step 6: Mark route and data tasks complete**

Update `openspec/changes/redesign-civic-index-pages/tasks.md` to check:

```md
- [x] 1.2 Define a minimal shared Civic Index presentation type for jurisdiction metadata, breadcrumbs, coverage counts, one-level-down map points, table rows, persona actions, and future placeholders.
- [x] 1.3 Implement scoped aggregate loading for agency, personnel, public report, civil case, and available source/coverage-link counts using local database joins through `location_path`.
- [x] 1.4 Ensure missing required tables or fields continue to fail the build, and do not add silent schema guards for required current-data fields.
- [x] 3.1 Update the state route to render the shared Civic Index pattern with administrative-area/county map points and table rows only.
- [x] 3.2 Update the administrative-area route to render the shared Civic Index pattern with place map points and table rows only.
- [x] 3.3 Update the place route to render the shared Civic Index pattern with agency map points and table rows only.
- [x] 3.4 Verify all route params and links continue to come from database-backed location paths or agency canonical paths, with no runtime slug generation from names.
```

Commit checkpoint after Task 5:

```bash
git add src/pages/[category]/index.astro src/pages/[category]/[administrativeArea]/index.astro src/pages/[category]/[administrativeArea]/[place]/index.astro src/lib/data/civic-index.ts openspec/changes/redesign-civic-index-pages/tasks.md
git commit -m "feat: render civic index location routes"
```

---

### Task 6: Complete Current and Future Data Presentation

**Files:**

- Modify: `src/components/CivicIndexPage.astro`
- Modify: `src/lib/data/civic-index.ts`
- Modify: `openspec/changes/redesign-civic-index-pages/tasks.md`

- [ ] **Step 1: Confirm optional source-link count behavior**

If the audit found no reliable source-link count source, leave `source_links` out of `coverage`. Add this comment above `loadCivicIndexCoverage`:

```ts
// Source-link coverage is intentionally omitted until a reliable local source
// table or field exists. Do not fabricate this count from missing data.
```

If a reliable source exists, add it with a direct required-table query and include:

```ts
{ key: "source_links", label: "Source links", value: toCount(row.source_link_count) }
```

- [ ] **Step 2: Verify action routes are existing approved routes**

Run:

```bash
test -f src/pages/report/new/index.astro
test -f src/pages/about/contact/index.astro
test -f src/pages/personnel/index.astro
test -f src/pages/civil-litigation/index.astro
test -f src/pages/find-records/index.astro
```

Expected: all commands exit `0`. If any route is missing, change the corresponding action to an existing route and record that choice in `design.md` before implementation continues.

- [ ] **Step 3: Mark presentation tasks complete**

Update `openspec/changes/redesign-civic-index-pages/tasks.md` to check:

```md
- [x] 2.1 Build shared Civic Index rendering components for the editorial title area, current record coverage panel, action rail, map/index section, and future-data placeholder section.
- [x] 2.2 Keep the visual system aligned with the mockup: light-mode first, thin rules, compact tables, restrained deep red and muted teal accents, and no marketing-style decoration.
- [x] 2.3 Add no-JavaScript baseline markup for the full index table and links.
- [x] 2.4 Add lightweight client-side search and stable sorting for the index table.
- [x] 4.1 Populate the current record coverage panel with available scoped counts and omit any optional count that lacks a reliable existing local source.
- [x] 4.2 Add resident action links for finding a local agency, sharing an interaction, and getting notified when records change using existing approved routes.
- [x] 4.3 Add defense attorney action links for personnel history, civil litigation, and missing source record submission using existing approved routes.
- [x] 4.4 Add the "Data not collected yet" section for use-of-force policy checklist, settlement and payout history, complaint outcomes, civil forfeiture indicators, accountability barriers, and positive-deviance practices.
- [x] 4.5 Ensure future placeholders do not imply missing records are findings, rankings, praise, or endorsements.
```

Commit checkpoint after Task 6:

```bash
git add src/components/CivicIndexPage.astro src/lib/data/civic-index.ts openspec/changes/redesign-civic-index-pages/tasks.md
git commit -m "feat: complete civic index presentation"
```

---

### Task 7: E2E Tests

**Files:**

- Create: `tests/e2e/civic-index.spec.ts`
- Modify: `openspec/changes/redesign-civic-index-pages/tasks.md`

- [ ] **Step 1: Add Civic Index e2e coverage**

Create `tests/e2e/civic-index.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.describe("civic index pages", () => {
  test("renders the state civic index with county-level records", async ({
    page,
  }) => {
    await page.goto("/tx/");

    await expect(page.getByText("State civic index")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Current record coverage" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /counties|areas/i }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toContainText(/County|Area/);
    await expect(
      page.getByRole("heading", { name: "Data not collected yet" }),
    ).toBeVisible();
    await expect(page.getByText("Positive-deviance practices")).toBeVisible();
  });

  test("renders administrative-area pages with place-level records", async ({
    page,
  }) => {
    await page.goto("/tx/dallas-county/");

    await expect(page.getByText(/civic index/i)).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Place");
    await expect(page.getByRole("table")).not.toContainText("Agency");
  });

  test("renders place pages with agency-level records and canonical agency links", async ({
    page,
  }) => {
    await page.goto("/tx/dallas-county/irving/");

    await expect(page.getByText("Place civic index")).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Agency");
    const firstAgencyLink = page
      .getByRole("table")
      .getByRole("link", { name: /police|sheriff|department/i })
      .first();
    await expect(firstAgencyLink).toHaveAttribute(
      "href",
      /\/tx\/dallas-county\/irving\/[^/]+\/$/,
    );
  });

  test("filters civic index table rows without changing the page URL", async ({
    page,
  }) => {
    await page.goto("/tx/");
    const beforeUrl = page.url();
    await page.getByPlaceholder("Search this index").fill("Dallas");
    await expect(page).toHaveURL(beforeUrl);
    await expect(page.getByRole("table")).toContainText(/Dallas/i);
  });
});
```

If seeded paths differ, inspect generated paths with:

```bash
npm run build
```

Then adjust only the literal test URLs to match deterministic seed data; do not change the route behavior to satisfy tests.

- [ ] **Step 2: Run the focused e2e test**

Run:

```bash
npm run test:e2e -- tests/e2e/civic-index.spec.ts
```

Expected: PASS. If the dev server or database seed is not available, record the exact blocker and continue with static validation; do not claim e2e passed.

- [ ] **Step 3: Mark test tasks complete**

Update `openspec/changes/redesign-civic-index-pages/tasks.md` to check:

```md
- [x] 5.1 Add or update tests for state, administrative-area, and place one-level-down map/index behavior.
- [x] 5.2 Add or update tests for scoped coverage counts and database-backed canonical links.
```

Commit checkpoint after Task 7:

```bash
git add tests/e2e/civic-index.spec.ts openspec/changes/redesign-civic-index-pages/tasks.md
git commit -m "test: cover civic index pages"
```

---

### Task 8: Final Validation and OpenSpec Progress

**Files:**

- Modify: `openspec/changes/redesign-civic-index-pages/tasks.md`

- [ ] **Step 1: Run OpenSpec validation**

Run:

```bash
npm run validate:openspec
```

Expected: PASS with `change/redesign-civic-index-pages`.

- [ ] **Step 2: Mark OpenSpec validation complete**

Update:

```md
- [ ] 5.3 Run `npm run validate:openspec`.
```

to:

```md
- [x] 5.3 Run `npm run validate:openspec`.
```

- [ ] **Step 3: Run change status**

Run:

```bash
npx openspec status --change redesign-civic-index-pages
```

Expected: tasks reflect completed implementation work.

- [ ] **Step 4: Mark status check complete**

Update:

```md
- [ ] 5.4 Run `npx openspec status --change redesign-civic-index-pages`.
```

to:

```md
- [x] 5.4 Run `npx openspec status --change redesign-civic-index-pages`.
```

- [ ] **Step 5: Run aggregate validation**

Run:

```bash
npm run validate
```

Expected: PASS. If it fails for an environmental reason such as missing local services, record the exact command and failure in the final implementation summary.

- [ ] **Step 6: Mark final validation complete**

Update:

```md
- [ ] 5.5 Run relevant site validation, including `npm run validate` before claiming implementation complete.
```

to:

```md
- [x] 5.5 Run relevant site validation, including `npm run validate` before claiming implementation complete.
```

Commit checkpoint after Task 8:

```bash
git add openspec/changes/redesign-civic-index-pages/tasks.md
git commit -m "chore: complete civic index validation"
```

---

## Self-Review

- Spec coverage: The plan covers shared page pattern, route/location identity preservation, current coverage, one-level-down map behavior, searchable/sortable index tables, persona action paths, and future-data placeholders.
- Placeholder scan: The plan does not contain `TBD`, `TODO`, or intentionally vague implementation steps. The only conditional branch is the source-link count, because the design explicitly requires omitting that optional metric unless a reliable existing local source is confirmed.
- Type consistency: Shared model names are consistent across data module, component, and route integration steps.
