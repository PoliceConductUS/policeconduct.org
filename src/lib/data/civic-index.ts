import { withDb } from "#src/lib/db.js";
import type {
  LocationAgencyPayload,
  LocationChildPayload,
  LocationPagePayload,
} from "./build-payloads.js";
import {
  getStateDecertificationContext,
  type StateDecertificationContext,
} from "./state-decertification-context.js";

export const civicIndexCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

export type CivicIndexLevel = "state" | "administrative_area" | "place";

export type CivicCoverageMetric = {
  key: "agencies" | "personnel" | "reports" | "civil_cases";
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

export type CivicIndexGuidanceItem = {
  detail: string;
  label: string;
};

export type CivicIndexTrendPanel = {
  label: string;
  points: number[];
};

export type CivicIndexDataBar = {
  detail: string;
  label: string;
  value: number;
};

export type CivicIndexDataPanel = {
  bars: CivicIndexDataBar[];
  description: string;
  title: string;
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
  actionCenter: CivicIndexAction[];
  breadcrumbs: { current?: boolean; href: string; label: string }[];
  columns: CivicIndexColumn[];
  coverage: CivicCoverageMetric[];
  dataPanels: CivicIndexDataPanel[];
  description: string;
  drilldownLabel: string;
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
  stateDecertificationContext: StateDecertificationContext | null;
  thingsToKnow: CivicIndexGuidanceItem[];
  title: string;
  trendPanels: CivicIndexTrendPanel[];
  volunteerCta: CivicIndexAction;
};

export type ScopedCoverageRow = {
  agency_count: string | number;
  civil_case_count: string | number;
  personnel_count: string | number;
  report_count: string | number;
};

export type CivicIndexCounts = {
  agencies: number;
  civilCases: number;
  personnel: number;
  reports: number;
};

type LocationRowCountRow = ScopedCoverageRow & {
  path: string;
};

type AgencyRowCountRow = Omit<ScopedCoverageRow, "agency_count"> & {
  agency_id: string;
};

export const toCount = (value: string | number) => {
  if (value == null) {
    throw new Error(
      "Expected numeric aggregate count, received nullish value.",
    );
  }

  const count = Number(value);

  if (Number.isNaN(count)) {
    throw new Error(`Expected numeric aggregate count, received ${value}.`);
  }

  return count;
};

export const getActionGroups = (pagePath: string): CivicIndexActionGroup[] => [
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

export const getVolunteerCta = (pagePath: string): CivicIndexAction => ({
  label: "Volunteer to request and analyze records",
  description:
    "Help request source documents, review official records, and turn them into usable public information for this jurisdiction.",
  href: `/volunteer/?ref=${encodeURIComponent(pagePath)}`,
});

export const getActionCenter = (pagePath: string): CivicIndexAction[] => [
  {
    label: "Share an interaction",
    description: "Add a firsthand account or source document to the record.",
    href: "/report/new/",
  },
  {
    label: "Request public records",
    description:
      "Volunteer to help request source records and review what comes back.",
    href: `/volunteer/?ref=${encodeURIComponent(pagePath)}`,
  },
  {
    label: "Submit a correction",
    description:
      "Flag incorrect, incomplete, or outdated public-record information.",
    href: "/about/contact/",
  },
  {
    label: "Review civil litigation",
    description:
      "Inspect civil cases already connected to agencies or personnel here.",
    href: "/civil-litigation/",
  },
];

const getLocationParts = (location: LocationPagePayload) =>
  location.path.split("/").filter(Boolean);

const getStateSlug = (location: LocationPagePayload) => {
  const stateSlug = getLocationParts(location)[0];

  if (!stateSlug) {
    throw new Error(
      `Expected state path segment for location ${location.path}.`,
    );
  }

  return stateSlug;
};

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

const loadLocationRowCounts = async (
  children: LocationChildPayload[],
): Promise<Map<string, CivicIndexCounts>> => {
  if (children.length === 0) {
    return new Map();
  }

  const paths = children.map((child) => child.path);

  const rows = await withDb(async (client): Promise<LocationRowCountRow[]> => {
    const result = await client.query(
      `
        with target(path) as (
          select unnest($1::text[])
        )
        select
          target.path,
          count(distinct a.id) as agency_count,
          count(distinct ao.officer_id) as personnel_count,
          count(distinct r.id) as report_count,
          count(distinct c.id) as civil_case_count
        from target
        join public.location_path lp
          on lp.path like target.path || '%'
        left join public.agency a
          on a.location_path_id = lp.location_path_id
        left join public.agency_officers ao
          on ao.agency_id = a.id
         and ao.end_date is null
        left join public.reviews r
          on r.location_path_id = lp.location_path_id
        left join public.civil_cases c
          on c.location_path_id = lp.location_path_id
        group by target.path
      `,
      [paths],
    );

    return result.rows as LocationRowCountRow[];
  });

  return new Map(
    rows.map((row) => [
      row.path,
      {
        agencies: toCount(row.agency_count),
        civilCases: toCount(row.civil_case_count),
        personnel: toCount(row.personnel_count),
        reports: toCount(row.report_count),
      },
    ]),
  );
};

const loadAgencyRowCounts = async (
  agencies: LocationAgencyPayload[],
): Promise<Map<string, CivicIndexCounts>> => {
  if (agencies.length === 0) {
    return new Map();
  }

  const agencyIds = agencies.map((agency) => agency.id);

  const rows = await withDb(async (client): Promise<AgencyRowCountRow[]> => {
    const result = await client.query(
      `
        with target(agency_id) as (
          select unnest($1::text[])
        )
        select
          target.agency_id,
          count(distinct active_assignment.officer_id) as personnel_count,
          coalesce(report_counts.report_count, 0) as report_count,
          coalesce(civil_case_counts.civil_case_count, 0) as civil_case_count
        from target
        join public.agency agency
          on agency.id = target.agency_id
        left join public.agency_officers active_assignment
          on active_assignment.agency_id = agency.id
         and active_assignment.end_date is null
        left join lateral (
          select count(distinct review_officer.review_id) as report_count
          from public.agency_officers report_assignment
          join public.review_officers review_officer
            on review_officer.agency_officer_id = report_assignment.id
          where report_assignment.agency_id = agency.id
        ) report_counts on true
        left join lateral (
          select count(distinct civil_case_officer.civil_case_id) as civil_case_count
          from public.agency_officers civil_case_assignment
          join public.civil_case_officers civil_case_officer
            on civil_case_officer.agency_officer_id = civil_case_assignment.id
          where civil_case_assignment.agency_id = agency.id
        ) civil_case_counts on true
        group by
          target.agency_id,
          report_counts.report_count,
          civil_case_counts.civil_case_count
      `,
      [agencyIds],
    );

    return result.rows as AgencyRowCountRow[];
  });

  return new Map(
    rows.map((row) => [
      row.agency_id,
      {
        agencies: 1,
        civilCases: toCount(row.civil_case_count),
        personnel: toCount(row.personnel_count),
        reports: toCount(row.report_count),
      },
    ]),
  );
};

const requireRowCounts = (
  counts: Map<string, CivicIndexCounts>,
  key: string,
  label: string,
) => {
  const rowCounts = counts.get(key);

  if (!rowCounts) {
    throw new Error(`Expected civic index counts for ${label} ${key}.`);
  }

  return rowCounts;
};

const formatCount = (
  count: number,
  singular: string,
  plural = `${singular}s`,
) => `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;

const buildChildSearchText = (child: LocationChildPayload) =>
  [child.label, child.kind, child.path].filter(Boolean).join(" ");

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

const requireChildren = (location: LocationPagePayload) => {
  if (!location.children) {
    throw new Error(
      `Expected children payload array for ${location.level} page at ${location.path}.`,
    );
  }

  return location.children;
};

const requireAgencies = (location: LocationPagePayload) => {
  if (!location.agencies) {
    throw new Error(
      `Expected agencies payload array for ${location.level} page at ${location.path}.`,
    );
  }

  return location.agencies;
};

const requireParentPath = (location: LocationPagePayload) => {
  if (!location.parentPath) {
    throw new Error(
      `Expected parentPath for ${location.level} page at ${location.path}.`,
    );
  }

  return location.parentPath;
};

const requireStatePath = (location: LocationPagePayload) => {
  return `/${getStateSlug(location)}/`;
};

const buildChildDetail = (child: LocationChildPayload, singular: string) =>
  formatCount(child.childCount, singular);

const buildChildRows = (
  children: LocationChildPayload[],
  countKey: "agencies" | "places",
  detailSingular: string,
  rowCounts: Map<string, CivicIndexCounts>,
): CivicIndexRow[] =>
  children
    .map((child) => {
      const counts = requireRowCounts(rowCounts, child.path, "location row");
      return {
        href: child.path,
        label: child.label,
        searchText: buildChildSearchText(child),
        values: {
          [countKey]:
            countKey === "places" ? child.childCount : counts.agencies,
          civilCases: counts.civilCases,
          detail: buildChildDetail(child, detailSingular),
          personnel: counts.personnel,
          reports: counts.reports,
        },
      };
    })
    .sort((a, b) => civicIndexCollator.compare(a.label, b.label));

const buildAgencyRows = (
  agencies: LocationAgencyPayload[],
  rowCounts: Map<string, CivicIndexCounts>,
): CivicIndexRow[] =>
  agencies
    .map((agency) => {
      const counts = requireRowCounts(rowCounts, agency.id, "agency row");
      return {
        href: agency.path,
        label: agency.name,
        searchText: buildAgencySearchText(agency),
        values: {
          address: agency.address || "",
          agencies: counts.agencies,
          civilCases: counts.civilCases,
          personnel: counts.personnel,
          reports: counts.reports,
        },
      };
    })
    .sort((a, b) => civicIndexCollator.compare(a.label, b.label));

const buildChildMapPoints = (
  children: LocationChildPayload[],
  detailSingular: string,
): CivicIndexMapPoint[] =>
  children
    .filter((child) => child.mapPoint)
    .map((child) => ({
      count: child.childCount,
      href: child.path,
      label: child.label,
      lat: child.mapPoint!.lat,
      lng: child.mapPoint!.lng,
      meta: buildChildDetail(child, detailSingular),
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

const getNumericRowValue = (row: CivicIndexRow, key: string) => {
  const value = row.values[key];

  if (typeof value === "number") {
    return value;
  }

  return 0;
};

const buildRecordCoveragePanel = (
  coverage: CivicCoverageMetric[],
): CivicIndexDataPanel => ({
  title: "Current record picture",
  description: "Database-backed records currently connected to this geography.",
  bars: coverage
    .filter((metric) => metric.value > 0)
    .map((metric) => ({
      label: metric.label,
      value: metric.value,
      detail: `${metric.value.toLocaleString("en-US")} ${metric.label.toLowerCase()}`,
    })),
});

const buildRecordSignalPanel = (
  rows: CivicIndexRow[],
  title: string,
  description: string,
): CivicIndexDataPanel => ({
  title,
  description,
  bars: rows
    .map((row) => {
      const personnel = getNumericRowValue(row, "personnel");
      const reports = getNumericRowValue(row, "reports");
      const civilCases = getNumericRowValue(row, "civilCases");
      return {
        label: row.label,
        value: personnel + reports + civilCases,
        detail: `${personnel.toLocaleString("en-US")} personnel, ${reports.toLocaleString("en-US")} reports, ${civilCases.toLocaleString("en-US")} civil cases`,
      };
    })
    .filter((bar) => bar.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 8),
});

const getCoverageValue = (
  coverage: CivicCoverageMetric[],
  key: CivicCoverageMetric["key"],
) => coverage.find((metric) => metric.key === key)?.value || 0;

const buildThingsToKnow = (
  coverage: CivicCoverageMetric[],
): CivicIndexGuidanceItem[] => {
  const agencies = getCoverageValue(coverage, "agencies");
  const reports = getCoverageValue(coverage, "reports");
  const civilCases = getCoverageValue(coverage, "civil_cases");
  const personnel = getCoverageValue(coverage, "personnel");

  return [
    {
      label: "Agencies tracked",
      detail: agencies.toLocaleString("en-US"),
    },
    {
      label: "Personnel records",
      detail: personnel.toLocaleString("en-US"),
    },
    {
      label: "Public reports",
      detail: reports.toLocaleString("en-US"),
    },
    {
      label: "Civil cases",
      detail: civilCases.toLocaleString("en-US"),
    },
    {
      label: "Policy and accountability data",
      detail: "Use-of-force, complaints, payouts, forfeiture",
    },
  ];
};

export const trendPanels: CivicIndexTrendPanel[] = [
  {
    label: "Use-of-force incidents over time",
    points: [],
  },
  {
    label: "Complaint outcomes over time",
    points: [],
  },
  {
    label: "Settlement and payout history",
    points: [],
  },
];

export const buildStateCivicIndex = async (
  state: LocationPagePayload,
): Promise<CivicIndexModel> => {
  const areaPlural = state.administrativeAreaPlural!;
  const children = requireChildren(state);
  const [coverage, rowCounts] = await Promise.all([
    loadCivicIndexCoverage(state),
    loadLocationRowCounts(children),
  ]);
  const rows = buildChildRows(children, "places", "place", rowCounts);
  const drilldownLabel = `Explore within ${state.stateLabel}`;
  return {
    actionGroups: getActionGroups(state.path),
    actionCenter: getActionCenter(state.path),
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: state.stateLabel, href: state.path, current: true },
    ],
    columns: [
      { key: "label", label: "County / Area" },
      { key: "places", label: "Places", numeric: true },
      { key: "personnel", label: "Personnel", numeric: true },
      { key: "reports", label: "Reports", numeric: true },
      { key: "civilCases", label: "Civil cases", numeric: true },
    ],
    coverage,
    dataPanels: [
      buildRecordCoveragePanel(coverage),
      buildRecordSignalPanel(
        rows,
        `Where records concentrate within ${state.stateLabel}`,
        `Largest ${areaPlural.toLowerCase()} by currently collected personnel, report, and civil case signals.`,
      ),
    ],
    description: `Browse local agency records, public reports, civil litigation, and personnel profiles currently available for this state.`,
    drilldownLabel,
    indexLabel: `Counties / Areas within ${state.stateLabel}`,
    jurisdictionLabel: "State civic index",
    level: "state",
    map: {
      bounds: state.mapBounds,
      description: `${areaPlural} with available records.`,
      emptyLabel: `No mapped ${areaPlural.toLowerCase()} records.`,
      points: buildChildMapPoints(children, "place"),
      title: `${state.stateLabel} ${areaPlural}`,
    },
    pagePath: state.path,
    rows,
    stateDecertificationContext: getStateDecertificationContext(
      getStateSlug(state),
    ),
    thingsToKnow: buildThingsToKnow(coverage),
    title: `${state.stateLabel} Civic Index | PoliceConduct.org`,
    trendPanels,
    volunteerCta: getVolunteerCta(state.path),
  };
};

export const buildAdministrativeAreaCivicIndex = async (
  area: LocationPagePayload,
): Promise<CivicIndexModel> => {
  const children = requireChildren(area);
  const parentPath = requireParentPath(area);
  const [coverage, rowCounts] = await Promise.all([
    loadCivicIndexCoverage(area),
    loadLocationRowCounts(children),
  ]);
  const rows = buildChildRows(children, "agencies", "agency", rowCounts);
  const drilldownLabel = `Explore within ${area.administrativeArea}`;
  return {
    actionGroups: getActionGroups(area.path),
    actionCenter: getActionCenter(area.path),
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: area.stateLabel, href: parentPath },
      { label: area.administrativeArea!, href: area.path, current: true },
    ],
    columns: [
      { key: "label", label: "Place" },
      { key: "agencies", label: "Agencies", numeric: true },
      { key: "personnel", label: "Personnel", numeric: true },
      { key: "reports", label: "Reports", numeric: true },
      { key: "civilCases", label: "Civil cases", numeric: true },
    ],
    coverage,
    dataPanels: [
      buildRecordCoveragePanel(coverage),
      buildRecordSignalPanel(
        rows,
        `Where records concentrate within ${area.administrativeArea}`,
        "Largest places by currently collected personnel, report, and civil case signals.",
      ),
    ],
    description: `Browse local agency records, public reports, civil litigation, and personnel profiles currently available for this ${area.administrativeAreaKind || "administrative area"}.`,
    drilldownLabel,
    indexLabel: `Places within ${area.administrativeArea}`,
    jurisdictionLabel: `${area.administrativeAreaKind || "Administrative area"} civic index`,
    level: "administrative_area",
    map: {
      bounds: area.mapBounds,
      description: "Places with available records.",
      emptyLabel: "No mapped places.",
      points: buildChildMapPoints(children, "agency"),
      title: `${area.administrativeArea} places`,
    },
    pagePath: area.path,
    rows,
    stateDecertificationContext: getStateDecertificationContext(
      getStateSlug(area),
    ),
    thingsToKnow: buildThingsToKnow(coverage),
    title: `${area.administrativeArea}, ${area.stateLabel} Civic Index | PoliceConduct.org`,
    trendPanels,
    volunteerCta: getVolunteerCta(area.path),
  };
};

export const buildPlaceCivicIndex = async (
  place: LocationPagePayload,
): Promise<CivicIndexModel> => {
  const agencies = requireAgencies(place);
  const parentPath = requireParentPath(place);
  const [coverage, rowCounts] = await Promise.all([
    loadCivicIndexCoverage(place),
    loadAgencyRowCounts(agencies),
  ]);
  const rows = buildAgencyRows(agencies, rowCounts);
  const drilldownLabel = `Explore within ${place.displayName}`;
  return {
    actionGroups: getActionGroups(place.path),
    actionCenter: getActionCenter(place.path),
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: place.stateLabel, href: requireStatePath(place) },
      { label: place.administrativeArea!, href: parentPath },
      { label: place.displayName, href: place.path, current: true },
    ],
    columns: [
      { key: "label", label: "Agency" },
      { key: "address", label: "Address" },
      { key: "personnel", label: "Personnel", numeric: true },
      { key: "reports", label: "Reports", numeric: true },
      { key: "civilCases", label: "Civil cases", numeric: true },
    ],
    coverage,
    dataPanels: [
      buildRecordCoveragePanel(coverage),
      buildRecordSignalPanel(
        rows,
        `Agency record signals within ${place.displayName}`,
        "Agencies by currently collected personnel, report, and civil case signals.",
      ),
    ],
    description: `Browse law enforcement agencies, public reports, civil litigation, and personnel profiles currently available for this place.`,
    drilldownLabel,
    indexLabel: `Agencies within ${place.displayName}`,
    jurisdictionLabel: "Place civic index",
    level: "place",
    map: {
      bounds: place.mapBounds,
      description: "Agencies with available records.",
      emptyLabel: "No mapped agencies.",
      points: buildAgencyMapPoints(agencies),
      title: `${place.displayName} agencies`,
    },
    pagePath: place.path,
    rows,
    stateDecertificationContext: getStateDecertificationContext(
      getStateSlug(place),
    ),
    thingsToKnow: buildThingsToKnow(coverage),
    title: `${place.displayName}, ${place.administrativeArea} Civic Index | PoliceConduct.org`,
    trendPanels,
    volunteerCta: getVolunteerCta(place.path),
  };
};
