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
          lower(split_part(lp.path, '/', 2)) as category,
          count(distinct cco.civil_case_id) as case_count
        from public.civil_case_personnel cco
        join public.agency_personnel case_ao
          on case_ao.id = cco.agency_personnel_id
        join public.agency_personnel target_ao
          on target_ao.personnel_id = case_ao.personnel_id
        join public.agency a
          on a.id = target_ao.agency_id
        join public.location_path lp
          on lp.location_path_id = a.location_path_id
        group by lower(split_part(lp.path, '/', 2))
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
