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
    throw new Error("Expected numeric aggregate count, received nullish value.");
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
  reports: 0,
});

const getAgencyCounts = (agency: LocationAgencyPayload) => ({
  agencies: 1,
  civilCases: 0,
  personnel: 0,
  reports: 0,
  address: agency.address || "",
});
