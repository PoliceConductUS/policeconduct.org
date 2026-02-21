import { US_STATE_TILES } from "./geo/states.js";

type ReportSummary = {
  agencySlug?: string | null;
  category?: string | null;
};

export const getStateCodeFromSlug = (slug?: string | null) => {
  if (!slug) {
    return null;
  }
  const [code] = slug.split("/");
  if (!code) {
    return null;
  }
  const normalized = code.toUpperCase();
  if (normalized === "FEDERAL") {
    return null;
  }
  return normalized;
};

const normalizeCategory = (category?: string | null) => {
  if (!category) {
    return null;
  }
  const normalized = category.toLowerCase();
  if (normalized === "federal") {
    return null;
  }
  return normalized.toUpperCase();
};

export const getStateCodeFromReport = (report: ReportSummary) => {
  return (
    normalizeCategory(report.category) ||
    getStateCodeFromSlug(report.agencySlug)
  );
};

export const getReportStateSlug = (report: ReportSummary) => {
  const stateCode = getStateCodeFromReport(report);
  return stateCode ? stateCode.toLowerCase() : null;
};

export const buildReportStateStats = (reports: ReportSummary[]) => {
  const counts = new Map<string, number>();
  reports.forEach((report) => {
    const stateCode = getStateCodeFromReport(report);
    if (!stateCode) {
      return;
    }
    counts.set(stateCode, (counts.get(stateCode) || 0) + 1);
  });

  return US_STATE_TILES.map((state) => ({
    code: state.code,
    count: counts.get(state.code) || 0,
    href: `/report/${state.code.toLowerCase()}/`,
  }));
};
