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
      // is listed when the latest-started current assignment, by the intake
      // view site_agency_personnel_employment, is at an agency that has a
      // built page. Nothing from that assignment is displayed.
      (
        await client.query(
          `
            with latest_open_assignment as (
              select distinct on (ao.personnel_id) ao.personnel_id, ao.agency_id
              from public.agency_personnel ao
              join public.site_agency_personnel_employment employment
                on employment.agency_personnel_id = ao.id
               and employment.employment_status = 'Current'
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

// Listed personnel per state, from the intake view site_personnel_state_count:
// each listed person counts once, under the state of the agency on their
// latest-started current assignment (the same rule loadPersonnelSummaries
// lists by).
export const loadPersonnelCountsByStatePath = async (): Promise<
  Map<string, number>
> => {
  const rows: { state_path: string; listed_personnel_count: number }[] =
    await withDb(
      async (client) =>
        (
          await client.query(
            `select state_path, listed_personnel_count
             from public.site_personnel_state_count`,
          )
        ).rows,
    );
  return new Map(
    rows.map((row) => [row.state_path, row.listed_personnel_count]),
  );
};
