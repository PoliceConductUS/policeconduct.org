import { currentAssignmentSql } from "#src/lib/data/annotation-access.js";
import { withDb } from "#src/lib/db.js";
import type { PersonnelSummary } from "./types.js";

const nameCollator = new Intl.Collator("en", { sensitivity: "base" });

const compareNullable = (left?: string | null, right?: string | null) =>
  nameCollator.compare(left || "", right || "");

export const loadPersonnelSummaries = async (): Promise<PersonnelSummary[]> => {
  const officers: {
    id: string;
    slug: string;
    first_name: string;
    last_name: string | null;
    suffix: string | null;
  }[] = await withDb(
    async (client) =>
      // Selection rule kept as it was (move into a database view): a person
      // is listed when the latest-started open assignment is at an agency
      // that has a built page. Nothing from that assignment is displayed.
      (
        await client.query(
          `
            with latest_open_assignment as (
              select distinct on (ao.personnel_id) ao.personnel_id, ao.agency_id
              from public.agency_personnel ao
              where ${currentAssignmentSql("ao")}
              order by ao.personnel_id, ao.start_date desc nulls last, ao.id desc
            )
            select o.id, o.slug, o.first_name, o.last_name, o.suffix
            from latest_open_assignment latest
            join public.personnel o on o.id = latest.personnel_id
            join public.build_page_payload bpp
              on bpp.page_type = 'agency'
             and bpp.entity_id = latest.agency_id
          `,
        )
      ).rows,
  );

  const summaries: PersonnelSummary[] = officers.map((officer) => ({
    id: officer.id,
    slug: officer.slug,
    lastName: officer.last_name || "",
    firstName: officer.first_name,
    nameSuffix: officer.suffix || null,
  }));

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

// Count of current assignments; moves to an intake database view
// (supply-site-display-data). Each listed person counts once, under the state
// segment of the location path of the agency on their latest-started open
// assignment (the same rule loadPersonnelSummaries lists by).
export const loadPersonnelCountsByStatePath = async (): Promise<
  Map<string, number>
> => {
  const rows: { path: string; total: number }[] = await withDb(
    async (client) =>
      (
        await client.query(
          `
            with latest_open_assignment as (
              select distinct on (ao.personnel_id) ao.personnel_id, ao.agency_id
              from public.agency_personnel ao
              where ${currentAssignmentSql("ao")}
              order by ao.personnel_id, ao.start_date desc nulls last, ao.id desc
            )
            select
              '/' || split_part(lp.path, '/', 2) || '/' as path,
              count(*)::int as total
            from latest_open_assignment latest
            join public.personnel o on o.id = latest.personnel_id
            join public.agency a on a.id = latest.agency_id
            join public.location_path lp
              on lp.location_path_id = a.location_path_id
            join public.build_page_payload bpp
              on bpp.page_type = 'agency'
             and bpp.entity_id = latest.agency_id
            group by split_part(lp.path, '/', 2)
          `,
        )
      ).rows,
  );
  return new Map(rows.map((row) => [row.path, row.total]));
};
