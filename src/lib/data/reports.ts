import { withDb } from "../db.js";
import { groupBy, mapBy } from "../data.js";
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

const normalizeIncidentDate = (value?: string | null) => {
  if (!value) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
};

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
      const reports = (await client.query("select * from public.reviews")).rows;
      const reportOfficers = (
        await client.query("select * from public.review_officers")
      ).rows;
      const officers = (await client.query("select * from public.officers"))
        .rows;
      const agencies = (await client.query("select * from public.agency")).rows;
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
    const agencyCategory = assertValue(
      agency.category,
      `Missing category for agency ${agency.id}`,
    );
    const agencySlug = assertValue(
      agency.slug,
      `Missing slug for agency ${agency.id}`,
    );
    const agencyName = assertValue(
      agency.name,
      `Missing name for agency ${agency.id}`,
    );

    const incidentDate = normalizeIncidentDate(report.incident_date || "");
    return {
      id: report.id,
      slug: reportSlug,
      title: report.title,
      incidentDate: incidentDate || report.incident_date || "",
      address: report.address || null,
      agencySlug: `${agencyCategory}/${agencySlug}`,
      agencyName,
      category: report.category
        ? report.category.toString().toLowerCase()
        : null,
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
