import { withDb } from "#src/lib/db.js";
import { groupBy, mapBy } from "#src/lib/data.js";
import { requireAgencyCanonicalPath } from "./location-paths.js";

export type OfficerRef = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
};

export type AgencyRef = {
  id: string;
  slug: string;
  name: string;
  state: string;
  canonicalPath?: string | null;
};

export type CivilCaseSummary = {
  id: string;
  slug: string;
  state: string;
  locationPath: string;
  title: string;
  cause_number: string;
  court: string | null;
  filed_date: string | null;
  claims_summary: string | null;
  outcome: string | null;
  primary_source_url: string | null;
  created_at: string;
  officers: OfficerRef[];
  agencies: AgencyRef[];
};

export const loadCivilCasesByState = async (
  stateCode: string,
): Promise<CivilCaseSummary[]> => {
  const {
    civilCases = [],
    civilCaseOfficers = [],
    officers = [],
    civilCaseAgencies = [],
  } = await withDb(async (client) => {
    const casesResult = await client.query(
      `
        select c.*, lp.state_or_territory_slug as state, lp.path as location_path
        from public.civil_cases c
        join public.location_path lp
          on lp.location_path_id = c.location_path_id
        where upper(lp.state_or_territory_slug) = $1
      `,
      [stateCode],
    );
    const caseIds = casesResult.rows.map((row: { id: string }) => row.id);
    if (!caseIds.length) {
      return {
        civilCases: [],
        civilCaseOfficers: [],
        officers: [],
        civilCaseAgencies: [],
      };
    }

    const caseOfficersResult = await client.query(
      `
        select cco.civil_case_id, ao.officer_id
        from public.civil_case_officers cco
        join public.agency_officers ao on ao.id = cco.agency_officer_id
        where cco.civil_case_id = any($1)
      `,
      [caseIds],
    );
    const officerIds = [
      ...new Set(
        caseOfficersResult.rows
          .map((entry: { officer_id: string }) => entry.officer_id)
          .filter(Boolean),
      ),
    ];
    const officerRows = officerIds.length
      ? (
          await client.query(
            `
              select id, slug, first_name, last_name
              from public.officers
              where id = any($1)
            `,
            [officerIds],
          )
        ).rows
      : [];

    const civilCaseAgencies = (
      await client.query(
        `
          select distinct
            cco.civil_case_id,
            a.id,
            a.slug,
            a.name,
            a.state,
            a.administrative_area,
            a.administrative_area_slug,
            a.city,
            a.place_slug
          from public.civil_case_officers cco
          join public.agency_officers ao on ao.id = cco.agency_officer_id
          join public.agency a on a.id = ao.agency_id
          where cco.civil_case_id = any($1)
          order by a.name
        `,
        [caseIds],
      )
    ).rows;

    return {
      civilCases: casesResult.rows,
      civilCaseOfficers: caseOfficersResult.rows,
      officers: officerRows,
      civilCaseAgencies,
    };
  });

  const officersByCase = groupBy(civilCaseOfficers, "civil_case_id");
  const agenciesByCase = groupBy(civilCaseAgencies, "civil_case_id");
  const officersById = mapBy(officers, "id");

  return [...civilCases]
    .map((civilCase) => ({
      ...civilCase,
      officers: (officersByCase[civilCase.id] || [])
        .map((entry: { officer_id: string }) => officersById[entry.officer_id])
        .filter(Boolean),
      agencies: (agenciesByCase[civilCase.id] || []).map(
        (entry: AgencyRef & { civil_case_id: string }) => ({
          id: entry.id,
          slug: entry.slug,
          name: entry.name,
          canonicalPath: requireAgencyCanonicalPath(entry),
        }),
      ),
    }))
    .sort((left, right) => {
      const leftDate = new Date(
        left.filed_date || left.created_at || 0,
      ).getTime();
      const rightDate = new Date(
        right.filed_date || right.created_at || 0,
      ).getTime();
      return rightDate - leftDate;
    }) as CivilCaseSummary[];
};
