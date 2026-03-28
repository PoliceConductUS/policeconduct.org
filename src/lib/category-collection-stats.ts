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
  actionLabel: string;
  description: string;
  href: string;
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
          select upper(a.category) as category, count(distinct cco.civil_case_id) as case_count
          from public.civil_case_officers cco
          join public.agency_officers ao on ao.id = cco.agency_officer_id
          join public.agency a on ao.agency_id = a.id
          where a.category is not null
          group by upper(a.category)
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
    agencyCounts.set(
      agency.category,
      (agencyCounts.get(agency.category) || 0) + 1,
    );
  }

  const personnelCounts = new Map<string, number>();
  for (const entry of personnel) {
    const category = entry.agencyCategory?.toLowerCase();
    if (!category) {
      continue;
    }
    personnelCounts.set(category, (personnelCounts.get(category) || 0) + 1);
  }

  const reportCounts = new Map<string, number>();
  for (const report of reports) {
    const agencySlug = report.agencySlug?.toLowerCase();
    if (!agencySlug) {
      continue;
    }
    const slashIndex = agencySlug.indexOf("/");
    if (slashIndex === -1) {
      continue;
    }
    const category = agencySlug.slice(0, slashIndex);
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
  const reportHref =
    category === "federal" ? "/report/" : `/report/${category}/`;

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
      href: `/personnel/${category}/`,
      actionLabel: "Open personnel",
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
      href: `/civil-litigation/${category}/`,
      actionLabel: "Open civil cases",
    },
  ];
};
