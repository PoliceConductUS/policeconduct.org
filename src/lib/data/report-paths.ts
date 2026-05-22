const assertValue = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
};

export type ReportDateParts = {
  day: string;
  month: string;
  year: string;
};

export const normalizeReportDate = (value?: string | Date | null) => {
  if (!value) {
    return "";
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
};

export const getReportDateParts = (
  value: string | Date | null | undefined,
  reportId: string,
): ReportDateParts => {
  const date = normalizeReportDate(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    throw new Error(`Report ${reportId} is missing a complete incident date.`);
  }
  return {
    year: match[1],
    month: match[2],
    day: match[3],
  };
};

export const buildReportCanonicalPath = (report: {
  id: string;
  incidentDate: string | Date | null | undefined;
  locationPath: string | null | undefined;
  slug: string | null | undefined;
}) => {
  const locationPath = assertValue(
    report.locationPath,
    `Report ${report.id} is missing location_path.path.`,
  );
  if (!locationPath.endsWith("/")) {
    throw new Error(`Report ${report.id} location path must end with "/".`);
  }
  const slug = assertValue(report.slug, `Report ${report.id} is missing slug.`);
  const { year, month, day } = getReportDateParts(
    report.incidentDate,
    report.id,
  );
  return `${locationPath}reports/${year}/${month}/${day}/${slug}/`;
};

export const parseLocationPathParts = (
  locationPath: string,
  reportId: string,
) => {
  const parts = locationPath.split("/").filter(Boolean);
  if (parts.length !== 3) {
    throw new Error(
      `Report ${reportId} must use a place-level location path for report URLs.`,
    );
  }
  return {
    state: parts[0],
    administrativeArea: parts[1],
    place: parts[2],
  };
};
