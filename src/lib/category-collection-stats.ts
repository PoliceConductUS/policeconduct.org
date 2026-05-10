import { withDb } from "#src/lib/db.js";
import {
  loadAgencySummaries,
  loadPersonnelSummaries,
  loadReportSummaries,
} from "#src/lib/data/summaries.js";

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
    withDb(async (client) => {
      const result = await client.query(
        `
          select upper(lp.state_or_territory_slug) as category, count(distinct c.id) as case_count
          from public.civil_cases c
          join public.location_path lp
            on lp.location_path_id = c.location_path_id
          group by upper(lp.state_or_territory_slug)
        `,
      );
      return result.rows.map(
        (row: { category: string; case_count: string | number }) => ({
          category: String(row.category || "").toLowerCase(),
          count: Number(row.case_count || 0),
        }),
      );
    }),
  ]);

  const agencyCounts = new Map<string, number>();
  for (const agency of agencies) {
    const state = agency.state.toLowerCase();
    agencyCounts.set(
      state,
      (agencyCounts.get(state) || 0) + 1,
    );
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
  const reportHref = `/report/${category}/`;

  return [
    {
      label: "Agencies",
      value: counts.agencyCount,
      description: `Listed agencies in ${categoryLabel}.`,
      href: `/law-enforcement-agency/${category}/`,
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
