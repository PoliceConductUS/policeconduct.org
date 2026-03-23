import { withDb } from "#src/lib/db.js";
import { groupBy, mapBy } from "#src/lib/data.js";

export type OfficerRef = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
};

export type CivilCaseSummary = {
  id: string;
  slug: string;
  category: string;
  title: string;
  cause_number: string;
  court: string | null;
  filed_date: string | null;
  claims_summary: string | null;
  outcome: string | null;
  primary_source_url: string | null;
  created_at: string;
  officers: OfficerRef[];
};

export const loadCivilCasesByCategory = async (
  categoryCode: string,
): Promise<CivilCaseSummary[]> => {
  const {
    civilCases = [],
    civilCaseOfficers = [],
    officers = [],
  } = await withDb(async (client) => {
    const casesResult = await client.query(
      `
        select *
        from public.civil_cases
        where upper(category) = $1
      `,
      [categoryCode],
    );
    const caseIds = casesResult.rows.map((row: { id: string }) => row.id);
    if (!caseIds.length) {
      return {
        civilCases: [],
        civilCaseOfficers: [],
        officers: [],
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

    return {
      civilCases: casesResult.rows,
      civilCaseOfficers: caseOfficersResult.rows,
      officers: officerRows,
    };
  });

  const officersByCase = groupBy(civilCaseOfficers, "civil_case_id");
  const officersById = mapBy(officers, "id");

  return [...civilCases]
    .map((civilCase) => ({
      ...civilCase,
      officers: (officersByCase[civilCase.id] || [])
        .map((entry: { officer_id: string }) => officersById[entry.officer_id])
        .filter(Boolean),
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
