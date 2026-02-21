import { withDb } from "../db.js";
import { groupBy, mapBy, normalizeAgencyHistory } from "../data.js";
import type { PersonnelSummary } from "./types.js";
import { MIN_AGENCY_OFFICERS } from "./constants.js";

const nameCollator = new Intl.Collator("en", { sensitivity: "base" });

const compareNullable = (left?: string | null, right?: string | null) =>
  nameCollator.compare(left || "", right || "");

type PersonnelOptions = {
  agencyId?: string | null;
};

export const loadPersonnelSummaries = async (
  options: PersonnelOptions = {},
): Promise<PersonnelSummary[]> => {
  const { agencyId = null } = options;
  const data = await withDb(
    async (
      client,
    ): Promise<{
      agencyOfficers: any[];
      officers: any[];
      agencies: any[];
      reportCounts: any[];
    }> => {
      const params: Array<string> = [];
      const filters = ["ao.end_date is null"];
      if (agencyId) {
        params.push(agencyId);
        filters.push(`ao.agency_id = $${params.length}`);
      }
      const where = filters.length ? `where ${filters.join(" and ")}` : "";
      const agencyOfficers = (
        await client.query(
          `select * from public.agency_officers ao ${where}`,
          params,
        )
      ).rows;
      const officerIds = [
        ...new Set(
          agencyOfficers.map(
            (entry: { officer_id: string }) => entry.officer_id,
          ),
        ),
      ];
      const agencyIds = [
        ...new Set(
          agencyOfficers.map((entry: { agency_id: string }) => entry.agency_id),
        ),
      ];
      const officers = officerIds.length
        ? (
            await client.query(
              "select * from public.officers where id = any($1)",
              [officerIds],
            )
          ).rows
        : [];
      const agencies = agencyIds.length
        ? (
            await client.query(
              "select * from public.agency where id = any($1)",
              [agencyIds],
            )
          ).rows
        : [];
      // Count reports per officer by joining through agency_officers
      const reportCounts = officerIds.length
        ? (
            await client.query(
              `select ao.officer_id, count(distinct ro.review_id) as report_count
             from public.review_officers ro
             join public.agency_officers ao on ao.id = ro.agency_officer_id
             where ao.officer_id = any($1)
             group by ao.officer_id`,
              [officerIds],
            )
          ).rows
        : [];
      return { agencyOfficers, officers, agencies, reportCounts };
    },
  );

  const officersById = mapBy(data.officers, "id");
  const agenciesById = mapBy(data.agencies, "id");
  const agencyOfficersByOfficer = groupBy(data.agencyOfficers, "officer_id");
  const reportCountsByOfficer = mapBy(data.reportCounts || [], "officer_id");
  const activeCountsByAgency = data.agencyOfficers.reduce(
    (acc: Record<string, number>, entry: { agency_id: string }) => {
      const current = acc[entry.agency_id] || 0;
      acc[entry.agency_id] = current + 1;
      return acc;
    },
    {},
  );

  const summaries = Object.keys(agencyOfficersByOfficer)
    .map((officerId) => {
      const officer = officersById[officerId];
      if (!officer) {
        return null;
      }
      const history = normalizeAgencyHistory(
        agencyOfficersByOfficer[officerId] || [],
      );
      const activeAssignments = history.filter((entry) => !entry.end_date);
      if (activeAssignments.length === 0) {
        return null;
      }
      const officerReportCount = Number(
        reportCountsByOfficer[officerId]?.report_count || 0,
      );
      // Officers with reports are always included (use most recent assignment)
      // Officers without reports must be at an agency meeting the threshold
      const eligibleAssignment =
        officerReportCount > 0
          ? activeAssignments[activeAssignments.length - 1]
          : [...activeAssignments]
              .reverse()
              .find(
                (entry) =>
                  (activeCountsByAgency[entry.agency_id] || 0) >=
                  MIN_AGENCY_OFFICERS,
              );
      if (!eligibleAssignment) {
        return null;
      }
      const agency = agenciesById[eligibleAssignment.agency_id];
      if (!agency) {
        return null;
      }
      return {
        id: officer.id,
        slug: officer.slug,
        lastName: officer.last_name,
        firstName: officer.first_name,
        nameSuffix: officer.suffix || null,
        roleTitle: eligibleAssignment?.title || null,
        agencySlug: `${agency.category}/${agency.slug}`,
        agencyName: agency.name,
        agencyCategory: agency.category,
        reportCount: Number(
          reportCountsByOfficer[officer.id]?.report_count || 0,
        ),
      };
    })
    .filter(Boolean) as PersonnelSummary[];

  summaries.sort((a, b) => {
    const lastNameCompare = nameCollator.compare(a.lastName, b.lastName);
    if (lastNameCompare !== 0) {
      return lastNameCompare;
    }
    const firstNameCompare = nameCollator.compare(a.firstName, b.firstName);
    if (firstNameCompare !== 0) {
      return firstNameCompare;
    }
    const suffixCompare = compareNullable(a.nameSuffix, b.nameSuffix);
    if (suffixCompare !== 0) {
      return suffixCompare;
    }
    return compareNullable(a.id, b.id);
  });

  return summaries;
};
