import { withDb } from "#src/lib/db.js";

export type CivilCaseCategoryCount = {
  category: string;
  count: number;
};

export const loadCivilCaseCountsByAgencyState = async (): Promise<
  CivilCaseCategoryCount[]
> => {
  return withDb(async (client) => {
    const result = await client.query(
      `
        select
          lower(lp.state_or_territory_slug) as category,
          count(distinct cco.civil_case_id) as case_count
        from public.civil_case_officers cco
        join public.agency_officers case_ao
          on case_ao.id = cco.agency_officer_id
        join public.agency_officers target_ao
          on target_ao.officer_id = case_ao.officer_id
        join public.agency a
          on a.id = target_ao.agency_id
        join public.location_path lp
          on lp.location_path_id = a.location_path_id
        group by lower(lp.state_or_territory_slug)
      `,
    );

    return result.rows.map(
      (row: { category: string; case_count: string | number }) => ({
        category: String(row.category || "").toLowerCase(),
        count: Number(row.case_count || 0),
      }),
    );
  });
};
