import type {
  LocationAgencyPayload,
  LocationChildPayload,
  LocationReportPayload,
  LocationPagePayload,
} from "./build-payloads.js";
import { metricLabels } from "../metric-vocabulary.js";
import type { MetricIcon } from "../metric-vocabulary.js";

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

export type CivicIndexAction = {
  description: string;
  href: string;
  label: string;
};

export type CivicIndexActionGroup = {
  actions: CivicIndexAction[];
  label: string;
};

export type CivicIndexPreviewMetric = {
  defaultAction?: {
    href: string;
    label: string;
  };
  detail: string;
  detailHref?: string;
  icon: MetricIcon;
  label: string;
  scope: string;
  value: string;
  window?: string;
};

export type CivicIndexGraphPreview = {
  caption?: string;
  detailHref?: string;
  label: string;
  metadata?: string[];
  scope: string;
  seriesLabel: string;
  window?: string;
};

export type CivicIndexVisitorIntentBand = {
  graphs: CivicIndexGraphPreview[];
  metrics: CivicIndexPreviewMetric[];
  summary?: string;
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
  title: string;
  topMetricCards: CivicIndexPreviewMetric[];
  visitorIntentBands: CivicIndexVisitorIntentBand[];
  volunteerCta: CivicIndexAction;
};

export const civicIndexVisitorIntentBandCatalog = {
  contacts: "Police contact and enforcement activity",
  disparateImpact: "Disparate impact and community outcomes",
  publicCost: "Public cost and litigation",
  accountability:
    "Complaints, discipline, force, lawsuits, and accountability outcomes",
  credibility:
    "Officer credibility, search validity, force justification, and impeachment records",
  safeguards: "Policy safeguards and accountability systems",
  betterOutcomes: "Positive-deviance",
} as const;

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
        href: "/civil-cases/",
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
    href: "/civil-cases/",
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

const scopedDataDetailHref = (
  coverage: CivicCoverageMetric[],
  pagePath: string,
  kind: CivicScopedTopicKind,
) => {
  const payloadCoverage = {
    agencies: getCoverageCount(coverage, "agencies"),
    civilCases: getCoverageCount(coverage, "civil_cases"),
    personnel: getCoverageCount(coverage, "personnel"),
    reports: getCoverageCount(coverage, "reports"),
  };

  return hasCivicScopedTopicData(payloadCoverage, kind)
    ? scopedDetailHref(pagePath, kind)
    : undefined;
};

const formatMetricValue = (value: number) => value.toLocaleString("en-US");

type VisitorIntentBandInput = {
  coverage: CivicCoverageMetric[];
  jurisdictionLabel: string;
  pagePath: string;
  rowCount: number;
  scope: CivicIndexScope;
};

export const buildTopMetricCards = ({
  coverage,
  jurisdictionLabel,
  pagePath,
  rowCount,
  scope,
}: VisitorIntentBandInput): CivicIndexPreviewMetric[] => {
  const reports = getCoverageCount(coverage, "reports");
  const civilCases = getCoverageCount(coverage, "civil_cases");
  const agencies = getCoverageCount(coverage, "agencies");
  const personnel = getCoverageCount(coverage, "personnel");
  const reportsHref = scopedDataDetailHref(coverage, pagePath, "reports");
  const personnelHref = scopedDataDetailHref(coverage, pagePath, "personnel");
  const civilCasesHref = scopedDataDetailHref(
    coverage,
    pagePath,
    "civil-cases",
  );
  const budgetHref = scopedDataDetailHref(coverage, pagePath, "budget");
  const liabilityCostsHref = scopedDataDetailHref(
    coverage,
    pagePath,
    "liability-costs",
  );
  const fatalForceHref = scopedDataDetailHref(
    coverage,
    pagePath,
    "fatal-force-incidents",
  );
  const childMetric =
    scope === "state"
      ? {
          defaultAction: {
            href: scopedDetailHref(pagePath, "counties"),
            label: "Explore counties",
          },
          detail: `County and regional pages under ${jurisdictionLabel}.`,
          icon: "map" as const,
          label: "Counties",
          scope: jurisdictionLabel,
          value: formatMetricValue(rowCount),
        }
      : scope === "administrative_area"
        ? {
            defaultAction: {
              href: scopedDetailHref(pagePath, "places"),
              label: "Explore places",
            },
            detail: `Place pages under ${jurisdictionLabel}.`,
            icon: "pin" as const,
            label: "Places",
            scope: jurisdictionLabel,
            value: formatMetricValue(rowCount),
          }
        : scope === "place"
          ? {
              defaultAction: {
                href: scopedDetailHref(pagePath, "agencies"),
                label: "Explore agencies",
              },
              detail: `Agency pages under ${jurisdictionLabel}.`,
              icon: "building" as const,
              label: metricLabels.agencies,
              scope: jurisdictionLabel,
              value: formatMetricValue(agencies),
            }
          : null;
  const agencyPersonnelMetric: CivicIndexPreviewMetric | null =
    scope === "agency"
      ? {
          detail:
            "Current and former personnel records connected to this agency.",
          detailHref: personnelHref,
          icon: "people",
          label: metricLabels.personnelRecords,
          scope: jurisdictionLabel,
          value: formatMetricValue(personnel),
        }
      : null;
  const reportsMetric: CivicIndexPreviewMetric = {
    detail: `Published public reports connected to ${jurisdictionLabel} from the past 12 months.`,
    detailHref: reportsHref,
    icon: "file",
    label: metricLabels.reports,
    scope: jurisdictionLabel,
    value: formatMetricValue(reports),
    window: "Previous 12 months",
  };
  const budgetMetric: CivicIndexPreviewMetric = {
    detail:
      "Current fiscal-year budget, revenue, overtime, and related finance records.",
    detailHref: budgetHref,
    icon: "dollar",
    label: metricLabels.budget,
    scope: jurisdictionLabel,
    value: "$--",
  };
  const civilCasesMetric: CivicIndexPreviewMetric = {
    detail:
      scope === "state"
        ? `Incident-location civil case records connected to ${jurisdictionLabel} from the past 5 years.`
        : `Civil case records connected to ${jurisdictionLabel} from the past 5 years.`,
    detailHref: civilCasesHref,
    icon: "scales",
    label: metricLabels.civilCases,
    scope: jurisdictionLabel,
    value: formatMetricValue(civilCases),
    window: "Previous 5 years",
  };
  const liabilityMetric: CivicIndexPreviewMetric = {
    detail:
      "Claims, settlements, judgments, defense costs, and related documented payments from the past 5 years.",
    detailHref: liabilityCostsHref,
    icon: "weight",
    label: metricLabels.liabilityCosts,
    scope: jurisdictionLabel,
    value: "$--",
    window: "Previous 5 years",
  };
  const fatalForceMetric: CivicIndexPreviewMetric = {
    detail:
      "Fatal force, custody deaths, pursuit deaths, and other deaths involving police contact from the past 5 years.",
    detailHref: fatalForceHref,
    icon: "cross",
    label: metricLabels.fatalForceIncidents,
    scope: jurisdictionLabel,
    value: "--",
    window: "Previous 5 years",
  };

  return [
    ...(childMetric ? [childMetric] : []),
    ...(agencyPersonnelMetric ? [agencyPersonnelMetric] : []),
    reportsMetric,
    budgetMetric,
    civilCasesMetric,
    liabilityMetric,
    ...(scope === "agency" ? [] : [fatalForceMetric]),
  ];
};

export const buildVisitorIntentBands = ({
  coverage,
  jurisdictionLabel,
  pagePath,
  scope,
}: VisitorIntentBandInput): CivicIndexVisitorIntentBand[] => {
  const civilCases = getCoverageCount(coverage, "civil_cases");
  const personnel = getCoverageCount(coverage, "personnel");
  const reportsHref = scopedDataDetailHref(coverage, pagePath, "reports");
  const personnelHref = scopedDataDetailHref(coverage, pagePath, "personnel");
  const budgetHref = scopedDataDetailHref(coverage, pagePath, "budget");
  const civilCasesHref = scopedDataDetailHref(
    coverage,
    pagePath,
    "civil-cases",
  );
  const fatalForceHref = scopedDataDetailHref(
    coverage,
    pagePath,
    "fatal-force-incidents",
  );
  const liabilityCostsHref = scopedDataDetailHref(
    coverage,
    pagePath,
    "liability-costs",
  );
  const outcomesByIncomeHref = scopedDataDetailHref(
    coverage,
    pagePath,
    "outcomes-by-income",
  );
  const isAgency = scope === "agency";
  const agencyPersonnelMetric: CivicIndexPreviewMetric | null = isAgency
    ? {
        detail:
          "Current and former personnel records connected to this agency.",
        detailHref: personnelHref,
        icon: "people",
        label: metricLabels.personnelRecords,
        scope: jurisdictionLabel,
        value: formatMetricValue(personnel),
      }
    : null;

  const positiveDevianceBand: CivicIndexVisitorIntentBand = {
    title: civicIndexVisitorIntentBandCatalog.betterOutcomes,
    summary:
      "Comparative indicators that track lower rates, documented outcome changes, stronger safeguards, or positive conduct signals under stated comparison limits.",
    metrics: [
      {
        detail: isAgency
          ? "Positive-conduct and better-outcome indicators from the past 12 months require source type, comparison group, and limitations before they are shown."
          : "Better-outcome indicators from the past 12 months use geography-level comparison groups and do not expose officer-level positive-conduct records.",
        icon: isAgency ? "map" : "shield",
        label: "Comparable-outcome signals",
        scope: jurisdictionLabel,
        value: "--",
        window: "Previous 12 months",
      },
    ],
    graphs: [
      {
        caption:
          "Comparison context may be peer median, previous 12 months, similar population, similar call volume, or another documented group.",
        label: "Outcome rate compared with peer median",
        metadata: ["Comparison group required"],
        scope: jurisdictionLabel,
        seriesLabel: "Rate compared with peer median",
        window: "Previous 12 months",
      },
      {
        caption:
          "Positive-deviance signals are descriptive unless a reviewed method supports a stronger conclusion.",
        label: "Policy safeguards and measured outcomes",
        metadata: ["Methodology and limits required"],
        scope: jurisdictionLabel,
        seriesLabel: "Safeguard score and outcome measure",
        window: "Previous 12 months",
      },
    ],
  };

  return [
    positiveDevianceBand,
    {
      title: civicIndexVisitorIntentBandCatalog.contacts,
      summary:
        "Calls, reports, stops, citations, arrests, charges, and other documented contact activity.",
      metrics: [],
      graphs: [
        {
          caption:
            "Counts show published reports only; contact records use source-specific categories when available.",
          detailHref: reportsHref,
          label: "Reports by month",
          metadata: ["Published reports"],
          scope: jurisdictionLabel,
          seriesLabel: "Report count",
          window: "Previous 12 months",
        },
        {
          caption:
            "Sample surface for stops, arrests, citations, calls, and charges by stated source category.",
          label: "Contact activity by type",
          metadata: ["Muted sample values"],
          scope: jurisdictionLabel,
          seriesLabel: "Stops, arrests, citations, and calls",
          window: "Previous 12 months",
        },
      ],
    },
    {
      title: civicIndexVisitorIntentBandCatalog.disparateImpact,
      summary:
        "Contact, search, fine, fee, and case outcome measures by documented demographic, income, time, and location groups.",
      metrics: [
        {
          detail:
            "Dismissed, convicted, plea deal, jail, probation, and deferred-prosecution outcomes from the past 5 years, grouped by income when source data supports it.",
          detailHref: outcomesByIncomeHref,
          icon: "link",
          label: metricLabels.outcomesByIncome,
          scope: jurisdictionLabel,
          value: "--",
          window: "Previous 5 years",
        },
      ],
      graphs: [
        {
          caption:
            "Percentages require a stated population, contact, search, or case denominator before they can be compared.",
          label: "Population share and contact share",
          metadata: ["Comparison denominator required"],
          scope: jurisdictionLabel,
          seriesLabel: "Population share vs. contact share",
          window: "Previous 12 months",
        },
        {
          caption:
            "Case outcomes use familiar public labels and preserve the source basis on detail pages.",
          detailHref: outcomesByIncomeHref,
          label: "Case outcomes by income",
          metadata: ["Dismissed, plea, conviction, jail, probation"],
          scope: jurisdictionLabel,
          seriesLabel: "Outcome share",
          window: "Previous 5 years",
        },
      ],
    },
    {
      title: civicIndexVisitorIntentBandCatalog.publicCost,
      summary:
        "Budget, revenue, civil litigation, settlements, judgments, defense costs, claims, overtime, and related cost records.",
      metrics: [
        {
          detail:
            "Current fiscal-year budget, revenue, overtime, and related finance records.",
          detailHref: budgetHref,
          icon: "dollar",
          label: metricLabels.budget,
          scope: jurisdictionLabel,
          value: "$--",
        },
        {
          detail:
            scope === "state"
              ? `Incident-location civil case records connected to ${jurisdictionLabel} from the past 5 years.`
              : `Civil case records connected to ${jurisdictionLabel} from the past 5 years.`,
          detailHref: civilCasesHref,
          icon: "scales",
          label: metricLabels.civilCases,
          scope: jurisdictionLabel,
          value: formatMetricValue(civilCases),
          window: "Previous 5 years",
        },
        {
          detail:
            "Claims, settlements, judgments, defense costs, and related documented payments from the past 5 years.",
          detailHref: liabilityCostsHref,
          icon: "weight",
          label: metricLabels.liabilityCosts,
          scope: jurisdictionLabel,
          value: "$--",
          window: "Previous 5 years",
        },
      ],
      graphs: [
        {
          caption:
            scope === "state"
              ? "State geography uses incident-location civil case scope."
              : "Civil case scope follows the page's geography or agency relationship.",
          detailHref: civilCasesHref,
          label: "Civil cases",
          scope: jurisdictionLabel,
          seriesLabel: "Case count",
          window: "Previous 5 years",
        },
        {
          caption:
            "Liability costs include documented claims, litigation, settlements, judgments, defense, and related conduct events.",
          detailHref: liabilityCostsHref,
          label: "Liability costs by type",
          metadata: ["Claims, defense, settlements, judgments"],
          scope: jurisdictionLabel,
          seriesLabel: "Documented cost",
          window: "Previous 5 years",
        },
        {
          caption:
            "Budget and overtime remain separate measures unless a chart explicitly compares them.",
          detailHref: budgetHref,
          label: "Budget by fiscal year",
          metadata: ["Fiscal-year records"],
          scope: jurisdictionLabel,
          seriesLabel: "Budget amount",
          window: "Previous 5 fiscal years",
        },
      ],
    },
    {
      title: civicIndexVisitorIntentBandCatalog.accountability,
      summary:
        "Complaint findings, discipline actions, force reports, fatal force, body-camera records, lawsuit outcomes, and report-quality records.",
      metrics: [
        {
          detail:
            "Fatal force, custody deaths, pursuit deaths, and other deaths involving police contact from the past 5 years.",
          detailHref: fatalForceHref,
          icon: "cross",
          label: metricLabels.fatalForceIncidents,
          scope: jurisdictionLabel,
          value: "--",
          window: "Previous 5 years",
        },
        ...(isAgency
          ? [
              {
                detail:
                  "Agency-level complaint, force, discipline, and body-camera records from the past 12 months when official source data supports the measure.",
                icon: "shield" as const,
                label: "Complaint and force outcome records",
                scope: jurisdictionLabel,
                value: "--",
                window: "Previous 12 months",
              },
            ]
          : []),
      ],
      graphs: [
        {
          caption:
            "Complaint outcome labels use familiar terms such as sustained, not proven, unfounded, exonerated, and closed or withdrawn.",
          label: "Complaint outcomes and actions taken",
          metadata: ["Findings and actions"],
          scope: isAgency
            ? jurisdictionLabel
            : `${jurisdictionLabel} geography-level records`,
          seriesLabel: "Complaint outcome count",
          window: "Previous 5 years",
        },
        {
          caption:
            "Force records require a documented source category and scope before counts are shown.",
          label: "Use-of-force records by type",
          metadata: ["Source category required"],
          scope: isAgency
            ? jurisdictionLabel
            : `${jurisdictionLabel} geography-level records`,
          seriesLabel: "Force record count",
          window: "Previous 12 months",
        },
      ],
    },
    {
      title: civicIndexVisitorIntentBandCatalog.credibility,
      summary:
        "Brady, Giglio, suppression, evidence-exclusion, search-validity, force-justification, and report-integrity records.",
      metrics: [
        ...(agencyPersonnelMetric ? [agencyPersonnelMetric] : []),
        ...(isAgency
          ? [
              {
                detail:
                  "Officer-level credibility indicators from the past 5 years are shown only for agency or personnel scope when source records support them.",
                icon: "person" as const,
                label: "Officer credibility records",
                scope: jurisdictionLabel,
                value: "--",
                window: "Previous 5 years",
              },
            ]
          : []),
      ],
      graphs: [
        {
          caption: isAgency
            ? "Agency/personnel-scope records may include Brady, Giglio, suppression, evidence exclusion, search, and force-justification records."
            : "Geography landing pages do not expose officer-level credibility indicators as top-level metrics.",
          label: "Credibility and impeachment record categories",
          metadata: ["Agency/personnel scope where applicable"],
          scope: isAgency
            ? jurisdictionLabel
            : `${jurisdictionLabel} related agency/personnel records`,
          seriesLabel: "Record category count",
          window: "Previous 5 years",
        },
      ],
    },
    {
      title: civicIndexVisitorIntentBandCatalog.safeguards,
      summary:
        "Policy safeguards, complaint access, transparency records, public-records barriers, decertification context, and accountability-system barriers.",
      metrics:
        scope === "state"
          ? []
          : [
              {
                detail:
                  "Policy safeguards and accountability-system records when source data is available.",
                icon: "calendar",
                label: "Policy safeguard records",
                scope: jurisdictionLabel,
                value: "--",
              },
            ],
      graphs: [
        {
          caption:
            "Safeguard comparisons require source-backed policy dates and outcome measures before any relationship is described.",
          label: "Policy safeguards and outcome measures",
          metadata: ["No causal claim without approved method"],
          scope: jurisdictionLabel,
          seriesLabel: "Safeguard status and measured outcome",
          window: "Current policy context",
        },
      ],
    },
  ];
};

export const buildStateCivicIndex = async (
  state: LocationPagePayload,
): Promise<CivicIndexModel> => {
  const areaPlural = state.administrativeAreaPlural!;
  const children = requireChildren(state);
  const coverage = buildCoverageFromPayload(state);
  const rows = buildChildRows(children, "places", "place");
  const drilldownLabel = `${state.stateLabel} records`;
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
    title: `${state.stateLabel} Civic Index | PoliceConduct.org`,
    topMetricCards: buildTopMetricCards({
      coverage,
      jurisdictionLabel: state.stateLabel,
      pagePath: state.path,
      rowCount: rows.length,
      scope: "state",
    }),
    visitorIntentBands: buildVisitorIntentBands({
      coverage,
      jurisdictionLabel: state.stateLabel,
      pagePath: state.path,
      rowCount: rows.length,
      scope: "state",
    }),
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
  const drilldownLabel = `${area.administrativeArea} records`;
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
    title: `${area.administrativeArea}, ${area.stateLabel} Civic Index | PoliceConduct.org`,
    topMetricCards: buildTopMetricCards({
      coverage,
      jurisdictionLabel: area.administrativeArea!,
      pagePath: area.path,
      rowCount: rows.length,
      scope: "administrative_area",
    }),
    visitorIntentBands: buildVisitorIntentBands({
      coverage,
      jurisdictionLabel: area.administrativeArea!,
      pagePath: area.path,
      rowCount: rows.length,
      scope: "administrative_area",
    }),
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
  const drilldownLabel = `${place.displayName} records`;
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
    title: `${place.displayName}, ${place.administrativeArea} Civic Index | PoliceConduct.org`,
    topMetricCards: buildTopMetricCards({
      coverage,
      jurisdictionLabel: place.displayName,
      pagePath: place.path,
      rowCount: rows.length,
      scope: "place",
    }),
    visitorIntentBands: buildVisitorIntentBands({
      coverage,
      jurisdictionLabel: place.displayName,
      pagePath: place.path,
      rowCount: rows.length,
      scope: "place",
    }),
    volunteerCta: getVolunteerCta(place.path),
  };
};
