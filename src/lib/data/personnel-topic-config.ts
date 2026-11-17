import { metricLabels, metricVisuals } from "#src/lib/metric-vocabulary.js";

export const personnelTopics = {
  arrests: {
    description: "Arrest records linked to this profile.",
    label: metricLabels.arrests,
    metric: metricVisuals.arrests,
  },
  "civil-cases": {
    description: "Civil cases linked to this profile.",
    label: metricLabels.civilCases,
    metric: metricVisuals.civilCases,
  },
  "liability-costs": {
    description: "Liability costs linked to this profile.",
    label: metricLabels.liabilityCosts,
    metric: metricVisuals.liabilityCosts,
  },
  reports: {
    description: "Published public reports linked to this profile.",
    label: metricLabels.reports,
    metric: metricVisuals.reports,
  },
  salary: {
    description: "Salary records linked to this profile.",
    label: metricLabels.currentSalary,
    metric: metricVisuals.currentSalary,
  },
} as const;

export type PersonnelTopic = keyof typeof personnelTopics;
