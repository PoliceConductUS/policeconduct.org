import { withDb } from "#src/lib/db.js";
import { groupBy, mapBy } from "#src/lib/data.js";

export type OfficerRef = {
  id: string;
  slug?: string | null;
  first_name: string;
  last_name: string;
};

export type CivilCaseWithDetails = Record<string, any> & {
  id: string;
  links: Array<{ url?: string | null; label?: string | null }>;
  officers: OfficerRef[];
};

export const loadCivilCasesByCategory = async (
  categoryCode: string,
): Promise<CivilCaseWithDetails[]> => {
  const {
    civilCases = [],
    civilCaseLinks = [],
    civilCaseOfficers = [],
    officers = [],
  } = await withDb(async (client) => {
    const caseIdResult = await client.query(
      `
        select distinct cco.civil_case_id
        from public.civil_case_officers cco
        join public.agency_officers ao on ao.id = cco.agency_officer_id
        join public.agency a on ao.agency_id = a.id
        where upper(a.category) = $1
      `,
      [categoryCode],
    );
    const caseIds = caseIdResult.rows.map(
      (row: { civil_case_id: string }) => row.civil_case_id,
    );
    if (!caseIds.length) {
      return {
        civilCases: [],
        civilCaseLinks: [],
        civilCaseOfficers: [],
        officers: [],
      };
    }

    const [casesResult, linksResult, caseOfficersResult] = await Promise.all([
      client.query("select * from public.civil_cases where id = any($1)", [
        caseIds,
      ]),
      client.query(
        "select * from public.civil_case_links where civil_case_id = any($1)",
        [caseIds],
      ),
      client.query(
        `select cco.civil_case_id, ao.officer_id
         from public.civil_case_officers cco
         join public.agency_officers ao on ao.id = cco.agency_officer_id
         where cco.civil_case_id = any($1)`,
        [caseIds],
      ),
    ]);

    const officerIds = [
      ...new Set(
        caseOfficersResult.rows
          .map((entry: { officer_id: string }) => entry.officer_id)
          .filter(Boolean),
      ),
    ];
    const officerDetails = officerIds.length
      ? (
          await client.query(
            "select * from public.officers where id = any($1)",
            [officerIds],
          )
        ).rows
      : [];

    return {
      civilCases: casesResult.rows,
      civilCaseLinks: linksResult.rows,
      civilCaseOfficers: caseOfficersResult.rows,
      officers: officerDetails,
    };
  });

  const linksByCase = groupBy(civilCaseLinks, "civil_case_id");
  const officersByCase = groupBy(civilCaseOfficers, "civil_case_id");
  const officersById = mapBy(officers, "id");

  return [...civilCases]
    .map((caseItem) => ({
      ...caseItem,
      links: linksByCase[caseItem.id] || [],
      officers: (officersByCase[caseItem.id] || [])
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
    }) as CivilCaseWithDetails[];
};
