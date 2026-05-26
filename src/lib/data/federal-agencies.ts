import { withDb } from "#src/lib/db.js";
import {
  metricLabels,
  metricVisuals,
  type MetricAccent,
  type MetricIcon,
} from "#src/lib/metric-vocabulary.js";

const nameCollator = new Intl.Collator("en", { sensitivity: "base" });

export type FederalAgencySummary = {
  branchCount: number;
  civilCaseCount: number;
  id: string;
  name: string;
  path: string;
  personnelCount: number;
  reportCount: number;
  slug: string;
};

export type FederalAgencyBranch = {
  address?: string | null;
  administrativeArea?: string | null;
  city?: string | null;
  civilCaseCount: number;
  id: string;
  name: string;
  path: string;
  personnelCount: number;
  reportCount: number;
  state?: string | null;
};

export type FederalAgencyDetail = FederalAgencySummary & {
  branches: FederalAgencyBranch[];
};

export type FederalAgencyIndexColumn = {
  key: string;
  label: string;
  numeric?: boolean;
};

export type FederalAgencyIndexMetric = {
  actionLabel?: string;
  actionKind?: "link" | "button";
  accent: MetricAccent;
  detail: string;
  href?: string;
  icon: MetricIcon;
  key: string;
  label: string;
  value: string;
};

export type FederalAgencyIndexRow = {
  href: string;
  label: string;
  searchText: string;
  values: Record<string, number | string | null>;
};

export type FederalAgencyIndexModel = {
  breadcrumbs: { current?: boolean; href: string; label: string }[];
  charts: string[];
  columns: FederalAgencyIndexColumn[];
  description: string;
  heading: string;
  metrics: FederalAgencyIndexMetric[];
  pagePath: string;
  rows: FederalAgencyIndexRow[];
  rowsLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  title: string;
};

const federalAgencyPath = (slug: string) => `/federal/${slug}/`;
export type FederalAgencyTopicKind =
  | "personnel"
  | "reports"
  | "budget"
  | "civil-cases"
  | "liability-costs"
  | "outcomes-by-income";

const formatCount = (value: number) => value.toLocaleString("en-US");

const formatLocation = (branch: FederalAgencyBranch) =>
  [branch.city, branch.administrativeArea, branch.state]
    .filter(Boolean)
    .join(", ");

const isFederalFinancialTopic = (kind: FederalAgencyTopicKind) =>
  kind === "budget" || kind === "liability-costs";

const federalTopicConfig = {
  personnel: {
    label: metricLabels.personnel,
    description:
      "Personnel records connected through federal child agencies currently available.",
    charts: ["Personnel Over Time", "Personnel by Child Agency", "Record Mix"],
  },
  reports: {
    label: metricLabels.reports,
    description:
      "Published public reports connected through federal child agencies currently available.",
    charts: ["Reports Over Time", "Reports by Child Agency", "Record Mix"],
  },
  budget: {
    label: metricLabels.budget,
    description:
      "Direct federal-agency budget records. Location-derived financial rollups are not projected.",
    charts: [
      "Budget Over Time",
      "Revenue Sources Over Time",
      "Budget Allocation",
    ],
  },
  "civil-cases": {
    label: metricLabels.civilCases,
    description:
      "Civil cases connected through federal child agencies and personnel.",
    charts: ["Civil Cases Over Time", "Case Types", "Cases by Child Agency"],
  },
  "liability-costs": {
    label: metricLabels.liabilityCosts,
    description:
      "Direct federal-agency liability cost records. Location-derived financial rollups are not projected.",
    charts: [
      "Liability Costs Over Time",
      "Cost Components Over Time",
      "Payment Source Breakdown",
    ],
  },
  "outcomes-by-income": {
    label: metricLabels.outcomesByIncome,
    description: "Case outcomes by income band.",
    charts: [],
  },
} satisfies Record<
  FederalAgencyTopicKind,
  { charts: string[]; description: string; label: string }
>;

const generalFederalCharts = [
  "Record Activity Over Time",
  "Record Mix",
  "Linked Agencies",
];

const topicMetricsFor = (
  kind: FederalAgencyTopicKind,
  totals: {
    civilCases: number;
    leafAgencies: number;
    personnel: number;
    reports: number;
  },
): FederalAgencyIndexMetric[] => {
  if (kind === "personnel") {
    return [
      {
        ...metricVisuals.personnel,
        detail: "Active linked personnel",
        key: "personnel",
        actionKind: "button",
        value: formatCount(totals.personnel),
      },
      {
        ...metricVisuals.personnelRecords,
        detail: "Current personnel records in scope",
        key: "personnelRecords",
        value: formatCount(totals.personnel),
      },
      {
        ...metricVisuals.agencies,
        detail: "Assignment history coverage is not projected yet",
        key: "assignments",
        value: "$--",
      },
      {
        ...metricVisuals.reports,
        detail: "Public reports connected through linked agencies",
        key: "reports",
        value: formatCount(totals.reports),
      },
      {
        ...metricVisuals.latestPersonnelUpdate,
        detail: "Personnel update recency is not projected yet",
        key: "latestPersonnelUpdate",
        value: "$--",
      },
    ];
  }

  if (kind === "reports") {
    return [
      {
        ...metricVisuals.reports,
        detail: "Public reports connected through linked agencies",
        key: "reports",
        actionKind: "button",
        value: formatCount(totals.reports),
      },
      {
        ...metricVisuals.childAgencies,
        detail: "Linked agency records",
        key: "leafAgencies",
        value: formatCount(totals.leafAgencies),
      },
      {
        ...metricVisuals.personnel,
        detail: "Active linked personnel",
        key: "personnel",
        value: formatCount(totals.personnel),
      },
      {
        ...metricVisuals.latestRecordedYear,
        detail: "Report recency is not projected yet",
        key: "latestRecordedYear",
        value: "$--",
      },
    ];
  }

  if (kind === "civil-cases") {
    return [
      {
        ...metricVisuals.civilCases,
        detail: "Civil cases connected through linked agencies",
        key: "civilCases",
        actionKind: "button",
        value: formatCount(totals.civilCases),
      },
      {
        ...metricVisuals.caseTypes,
        detail: "Case type coverage is not projected yet",
        key: "caseTypes",
        value: "$--",
      },
      {
        ...metricVisuals.caseOutcomes,
        detail: "Outcome coverage is not projected yet",
        key: "caseOutcomes",
        value: "$--",
      },
      {
        ...metricVisuals.reports,
        detail: "Public reports connected through linked agencies",
        key: "reports",
        value: formatCount(totals.reports),
      },
      {
        ...metricVisuals.latestCaseActivity,
        detail: "Case activity recency is not projected yet",
        key: "latestCaseActivity",
        value: "$--",
      },
    ];
  }

  if (kind === "budget") {
    return [
      {
        ...metricVisuals.budget,
        detail:
          "Direct federal-agency budget totals are not projected yet; child-location totals are excluded",
        key: "budget",
        actionKind: "button",
        value: "$--",
      },
      {
        ...metricVisuals.operatingSpend,
        detail: "Direct federal-agency operating spend is not projected yet",
        key: "operatingSpend",
        value: "$--",
      },
      {
        ...metricVisuals.overtime,
        detail: "Direct federal-agency overtime spending is not projected yet",
        key: "overtime",
        value: "$--",
      },
      {
        ...metricVisuals.reports,
        detail: "Public reports connected through linked agencies",
        key: "reports",
        value: formatCount(totals.reports),
      },
      {
        ...metricVisuals.latestFiscalYear,
        detail:
          "Direct federal-agency fiscal-year coverage is not projected yet",
        key: "latestFiscalYear",
        value: "$--",
      },
    ];
  }

  if (kind === "outcomes-by-income") {
    return [];
  }

  return [
    {
      ...metricVisuals.liabilityCosts,
      detail:
        "Direct federal-agency liability cost totals are not projected yet; child-location totals are excluded",
      key: "liabilityCosts",
      actionKind: "button",
      value: "$--",
    },
    {
      ...metricVisuals.settlements,
      detail: "Direct federal-agency settlement totals are not projected yet",
      key: "settlements",
      value: "$--",
    },
    {
      ...metricVisuals.judgments,
      detail: "Direct federal-agency judgment totals are not projected yet",
      key: "judgments",
      value: "$--",
    },
    {
      ...metricVisuals.reports,
      detail: "Public reports connected through linked agencies",
      key: "reports",
      value: formatCount(totals.reports),
    },
    {
      ...metricVisuals.latestRecordedYear,
      detail:
        "Direct federal-agency liability-cost recency is not projected yet",
      key: "latestRecordedYear",
      value: "$--",
    },
  ];
};

export const loadFederalAgencySummaries = async () => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
          select
            fa.id,
            fa.name,
            fa.slug,
            count(distinct fab.agency_id) as branch_count,
            count(distinct active_assignment.officer_id) as personnel_count,
            count(distinct report_officer.review_id) as report_count,
            count(distinct civil_case_link.civil_case_id) as civil_case_count
          from public.federal_agency fa
          left join public.federal_agency_branch fab
            on fab.federal_agency_id = fa.id
          left join public.agency_officers active_assignment
            on active_assignment.agency_id = fab.agency_id
           and active_assignment.end_date is null
          left join public.agency_officers report_assignment
            on report_assignment.agency_id = fab.agency_id
          left join public.review_officers report_officer
            on report_officer.agency_officer_id = report_assignment.id
          left join lateral (
            select cco.civil_case_id
            from public.agency_officers direct_assignment
            join public.civil_case_officers cco
              on cco.agency_officer_id = direct_assignment.id
            where direct_assignment.agency_id = fab.agency_id
            union
            select cco.civil_case_id
            from public.agency_officers target_assignment
            join public.agency_officers case_assignment
              on case_assignment.officer_id = target_assignment.officer_id
            join public.civil_case_officers cco
              on cco.agency_officer_id = case_assignment.id
            where target_assignment.agency_id = fab.agency_id
          ) civil_case_link on true
          group by fa.id, fa.name, fa.slug
          order by fa.name
        `,
      )
    ).rows;
  });

  return rows
    .map(
      (row: any): FederalAgencySummary => ({
        branchCount: Number(row.branch_count || 0),
        civilCaseCount: Number(row.civil_case_count || 0),
        id: String(row.id),
        name: String(row.name),
        path: federalAgencyPath(String(row.slug)),
        personnelCount: Number(row.personnel_count || 0),
        reportCount: Number(row.report_count || 0),
        slug: String(row.slug),
      }),
    )
    .sort((left, right) => nameCollator.compare(left.name, right.name));
};

export const loadFederalAgencyDetailBySlug = async (slug: string) => {
  const row = await withDb(async (client) => {
    return (
      await client.query(
        `
          select
            fa.id,
            fa.name,
            fa.slug,
            coalesce(
              jsonb_agg(
                jsonb_build_object(
                  'id', a.id,
                  'name', a.name,
                  'path', bpp.path,
                  'address', a.address,
                  'city', lp.place_name,
                  'state', lp.state_or_territory_slug,
                  'administrativeArea', lp.administrative_area_name,
                  'personnelCount', coalesce(branch_counts.personnel_count, 0),
                  'reportCount', coalesce(branch_counts.report_count, 0),
                  'civilCaseCount', coalesce(branch_counts.civil_case_count, 0)
                )
                order by lp.state_or_territory_slug, lp.place_name, a.name
              ) filter (where a.id is not null),
              '[]'::jsonb
            ) as branches
          from public.federal_agency fa
          left join public.federal_agency_branch fab
            on fab.federal_agency_id = fa.id
          left join public.agency a
            on a.id = fab.agency_id
          left join public.location_path lp
            on lp.location_path_id = a.location_path_id
          left join public.build_page_payload bpp
            on bpp.page_type = 'agency'
           and bpp.entity_id = a.id
          left join lateral (
            select
              count(distinct active_assignment.officer_id) as personnel_count,
              count(distinct report_officer.review_id) as report_count,
              count(distinct civil_case_link.civil_case_id) as civil_case_count
            from public.agency child_agency
            left join public.agency_officers active_assignment
              on active_assignment.agency_id = child_agency.id
             and active_assignment.end_date is null
            left join public.agency_officers report_assignment
              on report_assignment.agency_id = child_agency.id
            left join public.review_officers report_officer
              on report_officer.agency_officer_id = report_assignment.id
            left join lateral (
              select cco.civil_case_id
              from public.agency_officers direct_assignment
              join public.civil_case_officers cco
                on cco.agency_officer_id = direct_assignment.id
              where direct_assignment.agency_id = child_agency.id
              union
              select cco.civil_case_id
              from public.agency_officers target_assignment
              join public.agency_officers case_assignment
                on case_assignment.officer_id = target_assignment.officer_id
              join public.civil_case_officers cco
                on cco.agency_officer_id = case_assignment.id
              where target_assignment.agency_id = child_agency.id
            ) civil_case_link on true
            where child_agency.id = a.id
          ) branch_counts on true
          where fa.slug = $1
          group by fa.id, fa.name, fa.slug
        `,
        [slug],
      )
    ).rows[0];
  });

  if (!row) return null;

  const branches: FederalAgencyBranch[] = (row.branches || []).map(
    (branch: any): FederalAgencyBranch => {
      if (!branch.path) {
        throw new Error(
          `Federal agency ${row.slug} has linked agency ${branch.id || "unknown"} without a required canonical path.`,
        );
      }

      return {
        address: branch.address || null,
        administrativeArea: branch.administrativeArea || null,
        city: branch.city || null,
        civilCaseCount: Number(branch.civilCaseCount || 0),
        id: String(branch.id),
        name: String(branch.name),
        path: String(branch.path),
        personnelCount: Number(branch.personnelCount || 0),
        reportCount: Number(branch.reportCount || 0),
        state: branch.state || null,
      };
    },
  );

  return {
    branchCount: branches.length,
    branches,
    civilCaseCount: branches.reduce(
      (total, branch) => total + branch.civilCaseCount,
      0,
    ),
    id: String(row.id),
    name: String(row.name),
    path: federalAgencyPath(String(row.slug)),
    personnelCount: branches.reduce(
      (total, branch) => total + branch.personnelCount,
      0,
    ),
    reportCount: branches.reduce(
      (total, branch) => total + branch.reportCount,
      0,
    ),
    slug: String(row.slug),
  } satisfies FederalAgencyDetail;
};

export const buildFederalAgencyIndexModel = (
  federalAgencies: FederalAgencySummary[],
): FederalAgencyIndexModel => {
  const pagePath = "/federal/";
  const rows = federalAgencies.map((agency) => ({
    href: agency.path,
    label: agency.name,
    searchText: agency.name,
    values: {
      civilCases: agency.civilCaseCount,
      leafAgencies: agency.branchCount,
      personnel: agency.personnelCount,
      reports: agency.reportCount,
    },
  }));
  const totals = federalAgencies.reduce(
    (accumulator, agency) => ({
      civilCases: accumulator.civilCases + agency.civilCaseCount,
      leafAgencies: accumulator.leafAgencies + agency.branchCount,
      personnel: accumulator.personnel + agency.personnelCount,
      reports: accumulator.reports + agency.reportCount,
    }),
    { civilCases: 0, leafAgencies: 0, personnel: 0, reports: 0 },
  );

  return {
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: "Federal", href: pagePath, current: true },
    ],
    charts: generalFederalCharts,
    columns: [
      { key: "label", label: "Federal agency" },
      { key: "leafAgencies", label: metricLabels.childAgencies, numeric: true },
      { key: "personnel", label: metricLabels.personnel, numeric: true },
      { key: "reports", label: metricLabels.reports, numeric: true },
      { key: "civilCases", label: metricLabels.civilCases, numeric: true },
    ],
    description:
      "Browse federal law-enforcement agency groups, linked child agencies, public reports, civil litigation, and personnel records currently available.",
    heading: "Federal",
    metrics: [
      {
        ...metricVisuals.federalAgencies,
        detail: "Federal grouping records",
        key: "parents",
        actionKind: "button",
        value: formatCount(federalAgencies.length),
      },
      {
        ...metricVisuals.childAgencies,
        detail: "Linked agency records",
        key: "leafAgencies",
        value: formatCount(totals.leafAgencies),
      },
      {
        ...metricVisuals.personnel,
        detail: "Active linked personnel",
        href: `${pagePath}personnel/`,
        actionLabel: "View details",
        key: "personnel",
        value: formatCount(totals.personnel),
      },
      {
        ...metricVisuals.civilCases,
        detail: "Civil cases connected through linked agencies",
        href: `${pagePath}civil-cases/`,
        actionLabel: "View details",
        key: "civilCases",
        value: formatCount(totals.civilCases),
      },
      {
        ...metricVisuals.reports,
        detail: "Public reports connected through linked agencies",
        href: `${pagePath}reports/`,
        actionLabel: "View details",
        key: "reports",
        value: formatCount(totals.reports),
      },
    ],
    pagePath,
    rows,
    rowsLabel: "Federal agencies",
    searchLabel: "Jump to",
    searchPlaceholder: "Search federal agencies",
    title: "Federal Civic Index | PoliceConduct.org",
  };
};

export const buildFederalAgencyDetailIndexModel = (
  federalAgency: FederalAgencyDetail,
): FederalAgencyIndexModel => ({
  breadcrumbs: [
    { label: "Home", href: "/" },
    { label: "Federal", href: "/federal/" },
    { label: federalAgency.name, href: federalAgency.path, current: true },
  ],
  charts: generalFederalCharts,
  columns: [
    { key: "label", label: "Child agency" },
    { key: "location", label: "Location" },
    { key: "personnel", label: metricLabels.personnel, numeric: true },
    { key: "reports", label: metricLabels.reports, numeric: true },
    { key: "civilCases", label: metricLabels.civilCases, numeric: true },
  ],
  description: `${federalAgency.name} federal agency group and linked child agencies currently available.`,
  heading: federalAgency.name,
  metrics: [
    {
      ...metricVisuals.childAgencies,
      detail: "Linked agency records",
      key: "leafAgencies",
      actionKind: "button",
      value: formatCount(federalAgency.branchCount),
    },
      {
        ...metricVisuals.personnel,
        detail: "Active linked personnel",
        href: `${federalAgency.path}personnel/`,
        actionLabel: "View details",
        key: "personnel",
        value: formatCount(federalAgency.personnelCount),
      },
      {
        ...metricVisuals.civilCases,
        detail: "Civil cases connected through linked agencies",
        href: `${federalAgency.path}civil-cases/`,
        actionLabel: "View details",
        key: "civilCases",
        value: formatCount(federalAgency.civilCaseCount),
      },
      {
        ...metricVisuals.reports,
        detail: "Public reports connected through linked agencies",
        href: `${federalAgency.path}reports/`,
        actionLabel: "View details",
        key: "reports",
        value: formatCount(federalAgency.reportCount),
      },
    {
      ...metricVisuals.liabilityCosts,
      detail: "Claims, settlements, judgments, and related costs",
      key: "liabilityCosts",
      value: "$--",
    },
  ],
  pagePath: federalAgency.path,
  rows: federalAgency.branches.map((branch) => ({
    href: branch.path,
    label: branch.name,
    searchText: [
      branch.name,
      branch.address,
      branch.city,
      branch.administrativeArea,
      branch.state,
    ]
      .filter(Boolean)
      .join(" "),
    values: {
      civilCases: branch.civilCaseCount,
      location: formatLocation(branch) || branch.address || "",
      personnel: branch.personnelCount,
      reports: branch.reportCount,
    },
  })),
  rowsLabel: "Child agencies",
  searchLabel: "Jump to",
  searchPlaceholder: "Search child agencies",
  title: `${federalAgency.name} Civic Index | PoliceConduct.org`,
});

export const buildFederalAgencyTopicIndexModel = (
  federalAgencies: FederalAgencySummary[],
  kind: FederalAgencyTopicKind,
): FederalAgencyIndexModel => {
  const topic = federalTopicConfig[kind];
  const financialTopic = isFederalFinancialTopic(kind);
  const rows = federalAgencies.map((agency) => ({
    href: agency.path,
    label: agency.name,
    searchText: agency.name,
    values: {
      civilCases: agency.civilCaseCount,
      leafAgencies: agency.branchCount,
      personnel: agency.personnelCount,
      reports: agency.reportCount,
        topicValue:
          kind === "personnel"
            ? agency.personnelCount
            : kind === "reports"
              ? agency.reportCount
              : kind === "civil-cases"
                ? agency.civilCaseCount
                : "$--",
    },
  }));
  const totals = federalAgencies.reduce(
    (accumulator, agency) => ({
      civilCases: accumulator.civilCases + agency.civilCaseCount,
      leafAgencies: accumulator.leafAgencies + agency.branchCount,
      personnel: accumulator.personnel + agency.personnelCount,
      reports: accumulator.reports + agency.reportCount,
    }),
    { civilCases: 0, leafAgencies: 0, personnel: 0, reports: 0 },
  );

  return {
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: "Federal", href: "/federal/" },
      { label: topic.label, href: `/federal/${kind}/`, current: true },
    ],
    charts: topic.charts,
    columns: financialTopic
      ? [
          { key: "label", label: "Federal agency" },
          { key: "topicValue", label: topic.label, numeric: true },
        ]
      : [
          { key: "label", label: "Federal agency" },
          { key: "topicValue", label: topic.label, numeric: true },
          {
            key: "leafAgencies",
            label: metricLabels.childAgencies,
            numeric: true,
          },
          { key: "personnel", label: metricLabels.personnel, numeric: true },
          { key: "reports", label: metricLabels.reports, numeric: true },
          { key: "civilCases", label: metricLabels.civilCases, numeric: true },
        ],
    description: `Federal ${topic.description.toLowerCase()}`,
    heading: `Federal ${topic.label}`,
    metrics: topicMetricsFor(kind, totals),
    pagePath: `/federal/${kind}/`,
    rows,
    rowsLabel: `Federal ${topic.label}`,
    searchLabel: "Jump to",
    searchPlaceholder: "Search federal agencies",
    title: `Federal ${topic.label} | PoliceConduct.org`,
  };
};

export const buildFederalAgencyDetailTopicIndexModel = (
  federalAgency: FederalAgencyDetail,
  kind: FederalAgencyTopicKind,
): FederalAgencyIndexModel => {
  const topic = federalTopicConfig[kind];
  const financialTopic = isFederalFinancialTopic(kind);
  const totals = {
    civilCases: federalAgency.civilCaseCount,
    leafAgencies: federalAgency.branchCount,
    personnel: federalAgency.personnelCount,
    reports: federalAgency.reportCount,
  };

  return {
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: "Federal", href: "/federal/" },
      { label: federalAgency.name, href: federalAgency.path },
      {
        label: topic.label,
        href: `${federalAgency.path}${kind}/`,
        current: true,
      },
    ],
    charts: topic.charts,
    columns: financialTopic
      ? [
          { key: "label", label: "Child agency" },
          { key: "topicValue", label: topic.label, numeric: true },
        ]
      : [
          { key: "label", label: "Child agency" },
          { key: "topicValue", label: topic.label, numeric: true },
          { key: "location", label: "Location" },
          { key: "personnel", label: metricLabels.personnel, numeric: true },
          { key: "reports", label: metricLabels.reports, numeric: true },
          { key: "civilCases", label: metricLabels.civilCases, numeric: true },
        ],
    description: `${federalAgency.name} ${topic.description.toLowerCase()}`,
    heading: `${federalAgency.name} ${topic.label}`,
    metrics: topicMetricsFor(kind, totals),
    pagePath: `${federalAgency.path}${kind}/`,
    rows: federalAgency.branches.map((branch) => ({
      href: branch.path,
      label: branch.name,
      searchText: [
        branch.name,
        branch.address,
        branch.city,
        branch.administrativeArea,
        branch.state,
      ]
        .filter(Boolean)
        .join(" "),
      values: {
        civilCases: branch.civilCaseCount,
        location: formatLocation(branch) || branch.address || "",
        personnel: branch.personnelCount,
        reports: branch.reportCount,
        topicValue:
          kind === "personnel"
            ? branch.personnelCount
            : kind === "reports"
              ? branch.reportCount
              : kind === "civil-cases"
                ? branch.civilCaseCount
                : "$--",
      },
    })),
    rowsLabel: `${topic.label} by Child Agency`,
    searchLabel: "Jump to",
    searchPlaceholder: "Search child agencies",
    title: `${federalAgency.name} ${topic.label} | PoliceConduct.org`,
  };
};
