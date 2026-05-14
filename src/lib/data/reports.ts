import { withDb } from "#src/lib/db.js";
import { groupBy, mapBy } from "#src/lib/data.js";
import { requireAgencyCanonicalPath } from "./location-paths.js";
import {
  buildReportCanonicalPath,
  getReportDateParts,
  normalizeReportDate,
} from "./report-paths.js";
import type { ReportSummary } from "./types.js";

const assertValue = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
};

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
  const data = await withDb(
    async (
      client,
    ): Promise<{
      reports: any[];
      reportOfficers: any[];
      officers: any[];
      agencies: any[];
      agencyOfficers: any[];
    }> => {
      const reports = (
        await client.query(
          `
            select r.*, lp.state_or_territory_slug, lp.path as location_path
            from public.reviews r
            join public.location_path lp
              on lp.location_path_id = r.location_path_id
          `,
        )
      ).rows;
      const reportOfficers = (
        await client.query("select * from public.review_officers")
      ).rows;
      const officers = (await client.query("select * from public.officers"))
        .rows;
      const agencies = (
        await client.query(
          `
            select a.*, lp.path as location_path
            from public.agency a
            join public.location_path lp
              on lp.location_path_id = a.location_path_id
          `,
        )
      ).rows;
      const agencyOfficers = (
        await client.query("select * from public.agency_officers")
      ).rows;
      return { reports, reportOfficers, officers, agencies, agencyOfficers };
    },
  );

  const officersById = mapBy(data.officers, "id");
  const agenciesById = mapBy(data.agencies, "id");
  const agencyOfficersById = mapBy(data.agencyOfficers, "id");
  const reportOfficersByReport = groupBy(data.reportOfficers, "review_id");

  const summaries: ReportSummary[] = data.reports.map((report: any) => {
    const entries = (reportOfficersByReport[report.id] || []) as any[];
    if (!entries.length) {
      throw new Error(
        `Report ${report.slug} (${report.id}) has no review_officers records`,
      );
    }

    const personnel = entries.map((entry: any) => {
      const agencyOfficer = assertValue(
        agencyOfficersById[entry.agency_officer_id],
        `Missing agency_officer ${entry.agency_officer_id} for review officer ${entry.id}`,
      );
      const officer = assertValue(
        officersById[agencyOfficer.officer_id],
        `Missing officer ${agencyOfficer.officer_id} for agency_officer ${agencyOfficer.id}`,
      );
      return {
        licenseType: agencyOfficer.title || null,
        name: `${officer.first_name} ${officer.last_name}${officer.suffix ? ` ${officer.suffix}` : ""}`.trim(),
        slug: officer.slug,
      };
    });
    const personnelSlugs = personnel
      .map((person: { slug?: string | null }) => person.slug)
      .filter((slug): slug is string => Boolean(slug));

    const entry = entries[0];
    const reportSlug = assertValue(
      report.slug,
      `Missing slug for report ${report.id}`,
    );
    const agencyOfficer = assertValue(
      agencyOfficersById[entry.agency_officer_id],
      `Missing agency_officer ${entry.agency_officer_id} for review officer ${entry.id}`,
    );
    const agency = assertValue(
      agenciesById[agencyOfficer.agency_id],
      `Missing agency ${agencyOfficer.agency_id} for agency_officer ${agencyOfficer.id}`,
    );
    const reportState = assertValue(
      report.state_or_territory_slug,
      `Missing location state for report ${report.id}`,
    )
      .toString()
      .trim()
      .toLowerCase();
    if (!reportState) {
      throw new Error(`Blank location state for report ${report.id}`);
    }
    const agencySlug = assertValue(
      agency.slug,
      `Missing slug for agency ${agency.id}`,
    );
    const agencyName = assertValue(
      agency.name,
      `Missing name for agency ${agency.id}`,
    );

    const incidentDate = normalizeReportDate(report.incident_date || "");
    const locationPath = assertValue(
      report.location_path,
      `Missing location path for report ${report.id}`,
    );
    const dateParts = getReportDateParts(incidentDate, String(report.id));
    return {
      id: report.id,
      slug: reportSlug,
      state: reportState,
      canonicalPath: buildReportCanonicalPath({
        id: String(report.id),
        incidentDate,
        locationPath,
        slug: reportSlug,
      }),
      year: dateParts.year,
      month: dateParts.month,
      day: dateParts.day,
      title: report.title,
      incidentDate: incidentDate || report.incident_date || "",
      address: report.address || null,
      latitude:
        report.latitude !== undefined && report.latitude !== null
          ? Number(report.latitude)
          : null,
      longitude:
        report.longitude !== undefined && report.longitude !== null
          ? Number(report.longitude)
          : null,
      agencySlug,
      agencyName,
      agencyCanonicalPath: requireAgencyCanonicalPath(agency),
      locationPath,
      ratingOverall:
        report.rating_overall !== undefined && report.rating_overall !== null
          ? Number(report.rating_overall)
          : null,
      personnel: personnel.length ? personnel : undefined,
      personnelSlugs: personnelSlugs.length ? personnelSlugs : undefined,
    };
  });

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
