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

export type CivicIndexScope =
  | "state"
  | "administrative_area"
  | "place"
  | "agency";

export type CivicScopedTopicKind =
  | "personnel"
  | "reports"
  | "budget"
  | "civil-cases"
  | "fatal-force-incidents"
  | "liability-costs"
  | "outcomes-by-income";

export type CivicCoverageMetric = {
  key: "agencies" | "personnel" | "reports" | "civil_cases";
  label: string;
  value: number;
};

export type CivicTopicRole = "budget" | "liability" | "civil" | "neutral";

/**
 * Scope vocabulary for the volunteer contribution link's query context
 * (openspec redesign-civic-index-to-production, "Metric availability
 * states": "the contribution link includes ... the source page path and
 * the applicable scope type such as state, county, place, agency, or
 * personnel"). Mirrors this codebase's own level/topic vocabulary rather
 * than the spec's illustrative "county" (this repo calls it
 * `administrative_area`, since not every such area is a county).
 */
export type VolunteerScope =
  | "state"
  | "administrative_area"
  | "place"
  | "agency"
  | "personnel"
  | "federal";

const lastPathSegment = (path: string) => {
  const segment = path.split("/").filter(Boolean).pop();
  if (!segment) {
    throw new Error(`Expected a non-empty path segment in ${path}.`);
  }
  return segment;
};

/**
 * Builds the `/volunteer/` contribution link for an empty metric, with
 * enough query context for the volunteer page to eventually prefill the
 * related geography, agency, or personnel record: the page the visitor was
 * on (`source`), the scope type, and an entity identifier keyed by that
 * same scope name (e.g. `scope=agency&agency=hpd-tx`).
 */
export const buildHelpCollectHref = (
  pagePath: string,
  scope: VolunteerScope,
  entitySlug: string,
) => {
  const params = new URLSearchParams();
  params.set("source", pagePath);
  params.set("scope", scope);
  params.set(scope, entitySlug);
  return `/volunteer/?${params.toString()}`;
};

/**
 * One cell in the merged stat band. A cell is either populated data
 * (value set; href when the count drills down), or pending (value null)
 * with a visible contribution path. Personnel is never linked at
 * state/county/place scope: rosters are only browsable per agency.
 */
export type CivicStatCell = {
  key: string;
  label: string;
  value: string | null;
  meta?: string;
  href?: string;
  actionLabel?: string;
  role?: CivicTopicRole;
  pendingHelp?: { href: string; label: string };
};

export type CivicJumpCell = {
  browse: { href: string; label: string };
  count: string;
  label: string;
  options: { href: string; label: string }[];
  placeholder: string;
  selectLabel: string;
};

export type CivicPendingTopic = {
  gloss: string;
  help: { href: string; label: string };
  key: string;
  label: string;
  role: CivicTopicRole;
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
  breadcrumbs: { current?: boolean; href: string; label: string }[];
  columns: CivicIndexColumn[];
  coverage: CivicCoverageMetric[];
  description: string;
  drilldownLabel: string;
  indexLabel: string;
  jumpCell: CivicJumpCell;
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
  pendingTopics: CivicPendingTopic[];
  locationReports: LocationReportPayload[];
  rows: CivicIndexRow[];
  statCells: CivicStatCell[];
  title: string;
};

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

const getCoverageCount = (
  coverage: CivicCoverageMetric[],
  key: CivicCoverageMetric["key"],
) => {
  const coverageByKey = new Map(
    coverage.map((metric) => [metric.key, metric.value]),
  );

  return coverageByKey.get(key) || 0;
};

export const hasCivicScopedTopicData = (
  coverage: LocationPagePayload["coverage"],
  kind: CivicScopedTopicKind,
) => {
  if (kind === "personnel") {
    return coverage.personnel > 0;
  }

  if (kind === "reports") {
    return coverage.reports > 0;
  }

  if (kind === "civil-cases") {
    return coverage.civilCases > 0;
  }

  return false;
};

const scopedDetailHref = (pagePath: string, slug: string) =>
  `${pagePath}${slug}/`;

const formatMetricValue = (value: number) => value.toLocaleString("en-US");

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

type StatCellsInput = {
  coverage: CivicCoverageMetric[];
  pagePath: string;
  scope: Exclude<CivicIndexScope, "agency">;
  entitySlug: string;
};

/**
 * The merged stat band for geography pages: coverage facts and drill-down
 * links are the same cells. A zero count means the records have not been
 * collected yet, so the cell goes quiet ("--") and carries a contribution
 * path instead of implying the jurisdiction has none.
 */
export const buildStatCells = ({
  coverage,
  pagePath,
  scope,
  entitySlug,
}: StatCellsInput): CivicStatCell[] => {
  const agencies = getCoverageCount(coverage, "agencies");
  const personnel = getCoverageCount(coverage, "personnel");
  const reports = getCoverageCount(coverage, "reports");
  const civilCases = getCoverageCount(coverage, "civil_cases");
  const help = {
    href: buildHelpCollectHref(pagePath, scope, entitySlug),
    label: "Help collect this →",
  };

  const cells: CivicStatCell[] = [];

  if (scope !== "place") {
    cells.push(
      agencies > 0
        ? {
            key: "agencies",
            label: metricLabels.agencies,
            value: formatMetricValue(agencies),
            meta: scope === "state" ? "Statewide" : "Countywide",
          }
        : {
            key: "agencies",
            label: metricLabels.agencies,
            value: null,
            pendingHelp: help,
          },
    );
  }

  cells.push(
    personnel > 0
      ? {
          key: "personnel",
          label: metricLabels.personnelRecords,
          value: formatMetricValue(personnel),
          meta: "Current & former",
        }
      : {
          key: "personnel",
          label: metricLabels.personnelRecords,
          value: null,
          pendingHelp: help,
        },
  );

  cells.push(
    reports > 0
      ? {
          key: "reports",
          label: metricLabels.reports,
          value: formatMetricValue(reports),
          meta: "Shared by the public",
          href: scopedDetailHref(pagePath, "reports"),
          actionLabel: "View reports →",
        }
      : {
          key: "reports",
          label: metricLabels.reports,
          value: null,
          pendingHelp: {
            href: "/report/new/",
            label: "Share an experience →",
          },
        },
  );

  cells.push(
    civilCases > 0
      ? {
          key: "civil_cases",
          label: metricLabels.civilCases,
          value: formatMetricValue(civilCases),
          meta: "Court records",
          href: scopedDetailHref(pagePath, "civil-cases"),
          actionLabel: "View civil cases →",
          role: "civil",
        }
      : {
          key: "civil_cases",
          label: metricLabels.civilCases,
          value: null,
          role: "civil",
          pendingHelp: help,
        },
  );

  return cells;
};

export const buildPendingTopics = (
  pagePath: string,
  scope: VolunteerScope,
  entitySlug: string,
): CivicPendingTopic[] => {
  const help = {
    href: buildHelpCollectHref(pagePath, scope, entitySlug),
    label: "Help collect this →",
  };

  return [
    {
      key: "budget",
      label: metricLabels.budget,
      gloss: "Yearly department spending",
      role: "budget",
      help,
    },
    {
      key: "liability-costs",
      label: metricLabels.liabilityCosts,
      gloss: "Payouts in police-conduct cases",
      role: "liability",
      help,
    },
    {
      key: "fatal-force-incidents",
      label: metricLabels.fatalForceIncidents,
      gloss: "Deaths involving police",
      role: "neutral",
      help,
    },
    {
      key: "outcomes-by-income",
      label: metricLabels.outcomesByIncome,
      gloss: "Case results by neighborhood income",
      role: "neutral",
      help,
    },
  ];
};

type JumpCellInput = {
  browseSlug: "counties" | "places" | "agencies";
  pagePath: string;
  rows: CivicIndexRow[];
  singular: string;
  plural: string;
};

const buildJumpCell = ({
  browseSlug,
  pagePath,
  rows,
  singular,
  plural,
}: JumpCellInput): CivicJumpCell => ({
  browse: {
    href: scopedDetailHref(pagePath, browseSlug),
    label: `Browse all ${formatMetricValue(rows.length)} ${plural.toLowerCase()} →`,
  },
  count: formatMetricValue(rows.length),
  label: plural,
  options: rows.map((row) => ({ href: row.href, label: row.label })),
  placeholder: `Choose ${singular.toLowerCase()}…`,
  selectLabel: singular,
});

export const buildStateCivicIndex = async (
  state: LocationPagePayload,
): Promise<CivicIndexModel> => {
  const areaPlural = state.administrativeAreaPlural!;
  const children = requireChildren(state);
  const coverage = buildCoverageFromPayload(state);
  const rows = buildChildRows(children, "places", "place");
  const drilldownLabel = `${state.stateLabel} records`;
  const stateSlug = getStateSlug(state);
  return {
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
    description: `Public records for law enforcement agencies, personnel, reports, and civil litigation across ${state.stateLabel}'s ${formatMetricValue(rows.length)} ${areaPlural.toLowerCase()}.`,
    drilldownLabel,
    indexLabel: `Counties within ${state.stateLabel}`,
    jumpCell: buildJumpCell({
      browseSlug: "counties",
      pagePath: state.path,
      rows,
      singular: "county",
      plural: areaPlural,
    }),
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
    pendingTopics: buildPendingTopics(state.path, "state", stateSlug),
    locationReports: state.locationReports || [],
    rows,
    statCells: buildStatCells({
      coverage,
      pagePath: state.path,
      scope: "state",
      entitySlug: stateSlug,
    }),
    title: `${state.stateLabel} Civic Index | PoliceConduct.org`,
  };
};

export const buildAdministrativeAreaCivicIndex = async (
  area: LocationPagePayload,
): Promise<CivicIndexModel> => {
  const children = requireChildren(area);
  const parentPath = requireParentPath(area);
  const coverage = buildCoverageFromPayload(area);
  const rows = buildChildRows(children, "agencies", "agency");
  const drilldownLabel = `${area.administrativeArea} records`;
  const areaSlug = lastPathSegment(area.path);
  return {
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
    description: `Public records for law enforcement agencies, personnel, reports, and civil litigation across ${area.administrativeArea}'s ${formatMetricValue(rows.length)} places.`,
    drilldownLabel,
    indexLabel: `Places within ${area.administrativeArea}`,
    jumpCell: buildJumpCell({
      browseSlug: "places",
      pagePath: area.path,
      rows,
      singular: "place",
      plural: "Places",
    }),
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
    pendingTopics: buildPendingTopics(
      area.path,
      "administrative_area",
      areaSlug,
    ),
    locationReports: area.locationReports || [],
    rows,
    statCells: buildStatCells({
      coverage,
      pagePath: area.path,
      scope: "administrative_area",
      entitySlug: areaSlug,
    }),
    title: `${area.administrativeArea}, ${area.stateLabel} Civic Index | PoliceConduct.org`,
  };
};

export const buildPlaceCivicIndex = async (
  place: LocationPagePayload,
): Promise<CivicIndexModel> => {
  const agencies = requireAgencies(place);
  const parentPath = requireParentPath(place);
  const coverage = buildCoverageFromPayload(place);
  const rows = buildAgencyRows(agencies);
  const drilldownLabel = `${place.displayName} records`;
  const placeSlug = lastPathSegment(place.path);
  return {
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
    description: `Public records for the ${formatMetricValue(rows.length)} law enforcement ${rows.length === 1 ? "agency" : "agencies"} serving ${place.displayName}, and their personnel, reports, and civil litigation.`,
    drilldownLabel,
    indexLabel: `Agencies within ${place.displayName}`,
    jumpCell: buildJumpCell({
      browseSlug: "agencies",
      pagePath: place.path,
      rows,
      singular: "agency",
      plural: "Agencies",
    }),
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
    pendingTopics: buildPendingTopics(place.path, "place", placeSlug),
    locationReports: place.locationReports || [],
    rows,
    statCells: buildStatCells({
      coverage,
      pagePath: place.path,
      scope: "place",
      entitySlug: placeSlug,
    }),
    title: `${place.displayName}, ${place.administrativeArea} Civic Index | PoliceConduct.org`,
  };
};
