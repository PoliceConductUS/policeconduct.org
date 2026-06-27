import { loadReportSummaryBuildPayloads } from "./build-payloads.js";
import type { ReportSummary } from "./types.js";

const nameCollator = new Intl.Collator("en", { sensitivity: "base" });

const compareNullable = (left?: string | null, right?: string | null) =>
  nameCollator.compare(left || "", right || "");

const parseDate = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const loadReportSummaries = async (): Promise<ReportSummary[]> => {
  const summaries = (await loadReportSummaryBuildPayloads()).map(
    (payload): ReportSummary => ({
      id: payload.id,
      slug: payload.slug,
      state: payload.state,
      locationPath: payload.locationPath,
      canonicalPath: payload.canonicalPath,
      year: payload.year,
      month: payload.month,
      day: payload.day,
      administrativeAreaName: payload.administrativeAreaName,
      administrativeAreaSlug: payload.administrativeAreaSlug,
      placeName: payload.placeName,
      placeSlug: payload.placeSlug,
      stateName: payload.stateName,
      title: payload.title,
      incidentDate: payload.incidentDate,
      address: payload.address,
      latitude: payload.latitude,
      longitude: payload.longitude,
      agencySlug: payload.agencySlug,
      agencyName: payload.agencyName,
      agencyCanonicalPath: payload.agencyCanonicalPath,
      ratingOverall: payload.ratingOverall,
      personnel: payload.personnel,
      personnelSlugs: payload.personnelSlugs,
    }),
  );

  summaries.sort((a, b) => {
    const dateA = parseDate(a.incidentDate);
    const dateB = parseDate(b.incidentDate);
    if (dateA && dateB && dateA.getTime() !== dateB.getTime()) {
      return dateB.getTime() - dateA.getTime();
    }
    return compareNullable(a.id, b.id);
  });

  return summaries;
};
