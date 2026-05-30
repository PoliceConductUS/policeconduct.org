import type {
  LocationAgencyPayload,
  LocationChildPayload,
  LocationReportPayload,
  LocationPagePayload,
} from "./build-payloads.js";
import { metricLabels } from "../metric-vocabulary.js";

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
  locationReports: LocationReportPayload[];
  rows: CivicIndexRow[];
  thingsToKnow: CivicIndexGuidanceItem[];
  title: string;
  trendPanels: CivicIndexTrendPanel[];
  volunteerCta: CivicIndexAction;
};

const buildCoverageFromPayload = (
  location: LocationPagePayload,
): CivicCoverageMetric[] => [
  {
    key: "agencies",
    label: metricLabels.agencies,
    value: location.coverage.agencies,
  },
  {
    key: "personnel",
    label: metricLabels.personnel,
    value: location.coverage.personnel,
  },
  {
    key: "reports",
    label: metricLabels.reports,
    value: location.coverage.reports,
  },
  {
    key: "civil_cases",
    label: metricLabels.civilCases,
    value: location.coverage.civilCases,
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
): CivicIndexRow[] =>
  children
    .map((child) => {
      return {
        href: child.path,
        label: child.label,
        searchText: buildChildSearchText(child),
        values: {
          agencies: child.coverage.agencies,
          [countKey]:
            countKey === "places" ? child.childCount : child.coverage.agencies,
          civilCases: child.coverage.civilCases,
          detail: buildChildDetail(child, detailSingular),
          personnel: child.coverage.personnel,
          reports: child.coverage.reports,
        },
      };
    })
    .sort((a, b) => civicIndexCollator.compare(a.label, b.label));

const buildAgencyRows = (agencies: LocationAgencyPayload[]): CivicIndexRow[] =>
  agencies
    .map((agency) => {
      return {
        href: agency.path,
        label: agency.name,
        searchText: buildAgencySearchText(agency),
        values: {
          address: agency.address || "",
          agencies: 1,
          civilCases: agency.civilCases,
          personnel: agency.personnel,
          reports: agency.reports,
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
): CivicIndexDataPanel => {
  const bars: CivicIndexDataBar[] = [];

  for (const row of rows) {
    const personnel = getNumericRowValue(row, "personnel");
    const reports = getNumericRowValue(row, "reports");
    const civilCases = getNumericRowValue(row, "civilCases");
    const value = personnel + reports + civilCases;

    if (value <= 0) {
      continue;
    }

    const bar = {
      label: row.label,
      value,
      detail: `${personnel.toLocaleString("en-US")} personnel, ${reports.toLocaleString("en-US")} reports, ${civilCases.toLocaleString("en-US")} civil cases`,
    };
    const insertAt = bars.findIndex((existing) => value > existing.value);

    if (insertAt === -1) {
      if (bars.length < 8) {
        bars.push(bar);
      }
      continue;
    }

    bars.splice(insertAt, 0, bar);
    if (bars.length > 8) {
      bars.pop();
    }
  }

  return {
    title,
    description,
    bars,
  };
};

const buildThingsToKnow = (
  coverage: CivicCoverageMetric[],
): CivicIndexGuidanceItem[] => {
  const coverageByKey = new Map(
    coverage.map((metric) => [metric.key, metric.value]),
  );
  const agencies = coverageByKey.get("agencies") || 0;
  const reports = coverageByKey.get("reports") || 0;
  const civilCases = coverageByKey.get("civil_cases") || 0;
  const personnel = coverageByKey.get("personnel") || 0;

  return [
    {
      label: metricLabels.agencies,
      detail: agencies.toLocaleString("en-US"),
    },
    {
      label: metricLabels.personnelRecords,
      detail: personnel.toLocaleString("en-US"),
    },
    {
      label: metricLabels.reports,
      detail: reports.toLocaleString("en-US"),
    },
    {
      label: metricLabels.civilCases,
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
  const coverage = buildCoverageFromPayload(state);
  const rows = buildChildRows(children, "places", "place");
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
      { key: "personnel", label: metricLabels.personnel, numeric: true },
      { key: "reports", label: metricLabels.reports, numeric: true },
      { key: "civilCases", label: metricLabels.civilCases, numeric: true },
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
    indexLabel: `Counties within ${state.stateLabel}`,
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
    locationReports: state.locationReports || [],
    rows,
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
  const coverage = buildCoverageFromPayload(area);
  const rows = buildChildRows(children, "agencies", "agency");
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
      { key: "agencies", label: metricLabels.agencies, numeric: true },
      { key: "personnel", label: metricLabels.personnel, numeric: true },
      { key: "reports", label: metricLabels.reports, numeric: true },
      { key: "civilCases", label: metricLabels.civilCases, numeric: true },
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
    locationReports: area.locationReports || [],
    rows,
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
  const coverage = buildCoverageFromPayload(place);
  const rows = buildAgencyRows(agencies);
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
      { key: "personnel", label: metricLabels.personnel, numeric: true },
      { key: "reports", label: metricLabels.reports, numeric: true },
      { key: "civilCases", label: metricLabels.civilCases, numeric: true },
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
    locationReports: place.locationReports || [],
    rows,
    thingsToKnow: buildThingsToKnow(coverage),
    title: `${place.displayName}, ${place.administrativeArea} Civic Index | PoliceConduct.org`,
    trendPanels,
    volunteerCta: getVolunteerCta(place.path),
  };
};
