export const metricLabels = {
  agencies: "Agencies",
  activeTotal: "active / total",
  activeCases: "Active Cases",
  arrests: "Arrests",
  budget: "Budget",
  caseOutcomes: "Case Outcomes",
  caseTypes: "Case Types",
  childAgencies: "Child Agencies",
  civilCases: "Civil Cases",
  closedCases: "Closed Cases",
  courts: "Courts",
  currentSalary: "Current Salary",
  currentPersonnel: "Current Personnel",
  daylightNighttimeStops: "Daylight vs Nighttime Stops",
  federalAgencies: "Federal Agencies",
  formerPersonnel: "Former Personnel",
  judgments: "Judgments",
  latestCaseActivity: "Latest Case Activity",
  latestFiscalYear: "Latest Fiscal Year",
  latestPersonnelUpdate: "Latest Personnel Update",
  latestRecordedYear: "Latest Recorded Year",
  liabilityCosts: "Liability Costs",
  operatingSpend: "Operating Spend",
  outcomesByIncome: "Outcomes by Income",
  overtime: "Overtime",
  personnel: "Personnel",
  personnelLinked: "Personnel Linked",
  personnelRecords: "Personnel Records",
  racialBreakdownStopsArrests: "Racial Breakdown of Stops or Arrests",
  reports: "Reports",
  settlements: "Settlements",
  topChargeCategories: "Top Charge Categories",
  totalTimeAsOfficer: "Total Time as Officer",
} as const;

export type MetricAccent = "blue" | "green" | "purple" | "red";
export type MetricIcon =
  | "building"
  | "calendar"
  | "dollar"
  | "file"
  | "link"
  | "people"
  | "person"
  | "scales"
  | "shield"
  | "weight";
export type MetricLabelKey = keyof typeof metricLabels;

export type MetricVisual = {
  accent: MetricAccent;
  icon: MetricIcon;
  label: (typeof metricLabels)[MetricLabelKey];
};

export const metricVisuals = {
  agencies: {
    accent: "blue",
    icon: "building",
    label: metricLabels.agencies,
  },
  arrests: {
    accent: "blue",
    icon: "link",
    label: metricLabels.arrests,
  },
  budget: {
    accent: "green",
    icon: "dollar",
    label: metricLabels.budget,
  },
  caseOutcomes: {
    accent: "purple",
    icon: "scales",
    label: metricLabels.caseOutcomes,
  },
  caseTypes: {
    accent: "purple",
    icon: "scales",
    label: metricLabels.caseTypes,
  },
  childAgencies: {
    accent: "blue",
    icon: "building",
    label: metricLabels.childAgencies,
  },
  civilCases: {
    accent: "purple",
    icon: "scales",
    label: metricLabels.civilCases,
  },
  currentSalary: {
    accent: "green",
    icon: "dollar",
    label: metricLabels.currentSalary,
  },
  federalAgencies: {
    accent: "blue",
    icon: "shield",
    label: metricLabels.federalAgencies,
  },
  judgments: {
    accent: "red",
    icon: "scales",
    label: metricLabels.judgments,
  },
  latestCaseActivity: {
    accent: "purple",
    icon: "calendar",
    label: metricLabels.latestCaseActivity,
  },
  latestFiscalYear: {
    accent: "green",
    icon: "calendar",
    label: metricLabels.latestFiscalYear,
  },
  latestPersonnelUpdate: {
    accent: "blue",
    icon: "calendar",
    label: metricLabels.latestPersonnelUpdate,
  },
  latestRecordedYear: {
    accent: "red",
    icon: "calendar",
    label: metricLabels.latestRecordedYear,
  },
  liabilityCosts: {
    accent: "red",
    icon: "weight",
    label: metricLabels.liabilityCosts,
  },
  operatingSpend: {
    accent: "green",
    icon: "dollar",
    label: metricLabels.operatingSpend,
  },
  overtime: {
    accent: "green",
    icon: "dollar",
    label: metricLabels.overtime,
  },
  personnel: {
    accent: "blue",
    icon: "people",
    label: metricLabels.personnel,
  },
  personnelRecords: {
    accent: "blue",
    icon: "people",
    label: metricLabels.personnelRecords,
  },
  reports: {
    accent: "green",
    icon: "file",
    label: metricLabels.reports,
  },
  settlements: {
    accent: "red",
    icon: "dollar",
    label: metricLabels.settlements,
  },
} as const satisfies Partial<Record<MetricLabelKey, MetricVisual>>;

export const getMetricVisual = (key: keyof typeof metricVisuals) =>
  metricVisuals[key];
