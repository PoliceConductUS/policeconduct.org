import { withDb } from "#src/lib/db.js";
import type {
  LocationAgencyPayload,
  LocationChildPayload,
  LocationPagePayload,
} from "./build-payloads.js";

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

export type ScopedCoverageRow = {
  agency_count: string | number;
  civil_case_count: string | number;
  personnel_count: string | number;
  report_count: string | number;
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

export const futureDatasets: CivicFutureDataset[] = [
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

const getChildCounts = (child: LocationChildPayload) => ({
  agencies: child.childCount,
  civilCases: 0,
  personnel: 0,
  places: child.childCount,
  reports: 0,
});

const getAgencyCounts = (agency: LocationAgencyPayload) => ({
  agencies: 1,
  civilCases: 0,
  personnel: 0,
  reports: 0,
  address: agency.address || "",
});

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

const buildChildDetail = (child: LocationChildPayload, singular: string) =>
  formatCount(child.childCount, singular);

const buildChildRows = (
  children: LocationChildPayload[],
  countKey: "agencies" | "places",
  detailSingular: string,
): CivicIndexRow[] =>
  children
    .map((child) => {
      const counts = getChildCounts(child);
      return {
        href: child.path,
        label: child.label,
        searchText: buildChildSearchText(child),
        values: {
          [countKey]: counts[countKey],
          civilCases: counts.civilCases,
          detail: buildChildDetail(child, detailSingular),
          personnel: counts.personnel,
          reports: counts.reports,
        },
      };
    })
    .sort((a, b) => civicIndexCollator.compare(a.label, b.label));

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

export const buildStateCivicIndex = async (
  state: LocationPagePayload,
): Promise<CivicIndexModel> => {
  const areaPlural = state.administrativeAreaPlural!;
  const children = requireChildren(state);
  const rows = buildChildRows(children, "places", "place");
  return {
    actionGroups: getActionGroups(state.path),
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: "Find Records", href: "/find-records/" },
      { label: state.stateLabel, href: state.path, current: true },
    ],
    columns: [
      { key: "label", label: "County / Area" },
      { key: "places", label: "Places", numeric: true },
      { key: "personnel", label: "Personnel", numeric: true },
      { key: "reports", label: "Reports", numeric: true },
      { key: "civilCases", label: "Civil cases", numeric: true },
    ],
    coverage: await loadCivicIndexCoverage(state),
    description: `Browse local agency records, public reports, civil litigation, and personnel profiles currently available for this state.`,
    futureDatasets,
    indexLabel: `${areaPlural} and local places with records`,
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
    title: `${state.stateLabel} Civic Index | PoliceConduct.org`,
  };
};

export const buildAdministrativeAreaCivicIndex = async (
  area: LocationPagePayload,
): Promise<CivicIndexModel> => {
  const children = requireChildren(area);
  const parentPath = requireParentPath(area);
  const rows = buildChildRows(children, "agencies", "agency");
  return {
    actionGroups: getActionGroups(area.path),
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: "Find Records", href: "/find-records/" },
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
    coverage: await loadCivicIndexCoverage(area),
    description: `Browse local agency records, public reports, civil litigation, and personnel profiles currently available for this ${area.administrativeAreaKind || "administrative area"}.`,
    futureDatasets,
    indexLabel: "Places with records",
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
    title: `${area.administrativeArea}, ${area.stateLabel} Civic Index | PoliceConduct.org`,
  };
};

export const buildPlaceCivicIndex = async (
  place: LocationPagePayload,
): Promise<CivicIndexModel> => {
  const agencies = requireAgencies(place);
  const parentPath = requireParentPath(place);
  const rows = buildAgencyRows(agencies);
  return {
    actionGroups: getActionGroups(place.path),
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: "Find Records", href: "/find-records/" },
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
    coverage: await loadCivicIndexCoverage(place),
    description: `Browse law enforcement agencies, public reports, civil litigation, and personnel profiles currently available for this place.`,
    futureDatasets,
    indexLabel: "Agencies with records",
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
    title: `${place.displayName}, ${place.administrativeArea} Civic Index | PoliceConduct.org`,
  };
};
