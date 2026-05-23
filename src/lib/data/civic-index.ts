import type { LocationPagePayload } from "./build-payloads.js";

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
