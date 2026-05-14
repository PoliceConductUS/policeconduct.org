import {
  getReportDateParts,
  parseLocationPathParts,
} from "./report-paths.js";
import type { ReportSummary } from "./types.js";

export type ReportArchiveScope = "state" | "county" | "place";

type ArchiveEntry = {
  reports: ReportSummary[];
  pagePath: string;
  params: Record<string, string | undefined>;
  title: string;
};

const keyFor = (params: Record<string, string | undefined>) =>
  [
    params.category,
    params.administrativeArea,
    params.place,
    params.parts || "",
  ].join("|");

const formatSlugLabel = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const titleFor = (
  report: ReportSummary,
  scope: ReportArchiveScope,
  parts: string[],
) => {
  const location = parseLocationPathParts(report.locationPath, report.id);
  const locationLabel =
    scope === "state"
      ? location.state.toUpperCase()
      : scope === "county"
        ? formatSlugLabel(location.administrativeArea)
        : formatSlugLabel(location.place);
  return parts.length
    ? `${locationLabel} reports for ${parts.join("-")}`
    : `${locationLabel} reports`;
};

const pathFor = (
  report: ReportSummary,
  scope: ReportArchiveScope,
  parts: string[],
) => {
  const location = parseLocationPathParts(report.locationPath, report.id);
  const prefix =
    scope === "state"
      ? `/${location.state}/reports/`
      : scope === "county"
        ? `/${location.state}/${location.administrativeArea}/reports/`
        : `${report.locationPath}reports/`;
  return parts.length ? `${prefix}${parts.join("/")}/` : prefix;
};

const paramsFor = (
  report: ReportSummary,
  scope: ReportArchiveScope,
  parts: string[],
) => {
  const location = parseLocationPathParts(report.locationPath, report.id);
  return {
    category: location.state,
    administrativeArea:
      scope === "county" || scope === "place"
        ? location.administrativeArea
        : undefined,
    place: scope === "place" ? location.place : undefined,
    parts: parts.length ? parts.join("/") : undefined,
  };
};

const matchesScope = (
  report: ReportSummary,
  scope: ReportArchiveScope,
  params: Record<string, string | undefined>,
) => {
  const location = parseLocationPathParts(report.locationPath, report.id);
  if (location.state !== params.category) return false;
  if (
    (scope === "county" || scope === "place") &&
    location.administrativeArea !== params.administrativeArea
  ) {
    return false;
  }
  if (scope === "place" && location.place !== params.place) return false;
  const dateParts = params.parts?.split("/").filter(Boolean) || [];
  const reportDateParts = getReportDateParts(report.incidentDate, report.id);
  return dateParts.every((part, index) => {
    const value = [
      reportDateParts.year,
      reportDateParts.month,
      reportDateParts.day,
    ][index];
    return part === value;
  });
};

export const buildReportArchiveStaticPaths = (
  reports: ReportSummary[],
  scope: ReportArchiveScope,
) => {
  const archives = new Map<string, ArchiveEntry>();

  for (const report of reports) {
    const date = getReportDateParts(report.incidentDate, report.id);
    const levels = [
      [],
      [date.year],
      [date.year, date.month],
      [date.year, date.month, date.day],
    ];
    for (const parts of levels) {
      const params = paramsFor(report, scope, parts);
      const key = keyFor(params);
      if (!archives.has(key)) {
        archives.set(key, {
          reports: [],
          pagePath: pathFor(report, scope, parts),
          params,
          title: titleFor(report, scope, parts),
        });
      }
    }
  }

  for (const archive of archives.values()) {
    archive.reports = reports.filter((report) =>
      matchesScope(report, scope, archive.params),
    );
  }

  return Array.from(archives.values())
    .filter((archive) => archive.reports.length)
    .map((archive) => ({
      params: archive.params,
      props: {
        pagePath: archive.pagePath,
        reports: archive.reports,
        title: archive.title,
      },
    }));
};
