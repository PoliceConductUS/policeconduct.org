import {
  loadAgencySummaries,
  loadPersonnelSummaries,
  loadReportSummaries,
} from "#src/lib/data/summaries.js";
import { loadCivilCaseCountsByAgencyState } from "#src/lib/data/civil-case-scopes.js";

export type CategoryCollectionCounts = {
  agencyCount: number;
  personnelCount: number;
  reportCount: number;
  civilCaseCount: number;
};

type StatItem = {
  actionLabel?: string;
  description: string;
  href?: string;
  label: string;
  value: number;
};

export const loadCategoryCollectionCounts = async (): Promise<
  Map<string, CategoryCollectionCounts>
> => {
  const [agencies, personnel, reports, civilCaseCounts] = await Promise.all([
    loadAgencySummaries(),
    loadPersonnelSummaries(),
    loadReportSummaries(),
    loadCivilCaseCountsByAgencyState(),
  ]);

  const agencyCounts = new Map<string, number>();
  for (const agency of agencies) {
    const state = agency.state.toLowerCase();
    agencyCounts.set(state, (agencyCounts.get(state) || 0) + 1);
  }

  const personnelCounts = new Map<string, number>();
  for (const entry of personnel) {
    const category = entry.agencyState?.toLowerCase();
    if (!category) {
      continue;
    }
    personnelCounts.set(category, (personnelCounts.get(category) || 0) + 1);
  }

  const reportCounts = new Map<string, number>();
  for (const report of reports) {
    const category = report.state?.toLowerCase();
    if (!category) continue;
    reportCounts.set(category, (reportCounts.get(category) || 0) + 1);
  }

  const civilCaseCountMap = new Map<string, number>();
  for (const entry of civilCaseCounts) {
    civilCaseCountMap.set(entry.category, entry.count);
  }

  const categories = new Set<string>([
    ...agencyCounts.keys(),
    ...personnelCounts.keys(),
    ...reportCounts.keys(),
    ...civilCaseCountMap.keys(),
  ]);

  const countsByCategory = new Map<string, CategoryCollectionCounts>();
  for (const category of categories) {
    countsByCategory.set(category, {
      agencyCount: agencyCounts.get(category) || 0,
      personnelCount: personnelCounts.get(category) || 0,
      reportCount: reportCounts.get(category) || 0,
      civilCaseCount: civilCaseCountMap.get(category) || 0,
    });
  }

  return countsByCategory;
};

export const buildCategoryCollectionStats = (
  category: string,
  categoryLabel: string,
  counts: CategoryCollectionCounts,
): StatItem[] => {
  const reportHref = `/${category}/reports/`;

  return [
    {
      label: "Agencies",
      value: counts.agencyCount,
      description: `Listed agencies in ${categoryLabel}.`,
      href: `/${category}/`,
      actionLabel: "Open agencies",
    },
    {
      label: "Personnel",
      value: counts.personnelCount,
      description: `Listed personnel in ${categoryLabel}.`,
    },
    {
      label: "Reports",
      value: counts.reportCount,
      description:
        category === "federal"
          ? "Reports tied to federal agencies."
          : `Reports listed for ${categoryLabel}.`,
      href: reportHref,
      actionLabel: "Open reports",
    },
    {
      label: "Civil Cases",
      value: counts.civilCaseCount,
      description: `Civil litigation tied to ${categoryLabel}.`,
    },
  ];
};
