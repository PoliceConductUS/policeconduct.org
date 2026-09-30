import { withDb } from "#src/lib/db.js";
import { requireAgencyCanonicalPath } from "./location-paths.js";

export type ArrestProfile = {
  id: string;
  assignmentId: string;
  agency: { name: string; href: string };
  coverage: {
    agency: string;
    source: string;
    firstMonth: string;
    lastMonth: string;
    totalArrests: number;
  };
  breakdowns: Record<
    "by_year" | "by_month" | "by_iso_week" | "by_day_of_week",
    Record<string, number>
  > &
    Partial<
      Record<
        "by_offense" | "by_charge_level" | "by_district",
        Record<string, number>
      >
    >;
  updatedAt: string;
};

let profilesByPersonnel: Promise<Map<string, ArrestProfile[]>> | undefined;

export const loadArrestProfilesForPersonnel = async (
  personnelId: string,
): Promise<ArrestProfile[]> => {
  profilesByPersonnel ??= withDb(async (client) => {
    const { rows } =
      await client.query(`select profile.*, assignment.personnel_id,
      agency.name as agency_name, agency.slug, location.path as location_path,
      profile.updated_at::text as updated_at
      from public.arrest_profile profile
      join public.agency_personnel assignment on assignment.id = profile.agency_personnel_id
      join public.agency agency on agency.id = assignment.agency_id
      join public.location_path location on location.location_path_id = agency.location_path_id
      order by assignment.personnel_id, profile.coverage->>'firstMonth', profile.id`);
    const map = new Map<string, ArrestProfile[]>();
    for (const row of rows) {
      const profiles = map.get(row.personnel_id) ?? [];
      profiles.push({
        id: row.id,
        assignmentId: row.agency_personnel_id,
        agency: {
          name: row.agency_name,
          href: requireAgencyCanonicalPath(row),
        },
        coverage: row.coverage,
        breakdowns: row.breakdowns,
        updatedAt: row.updated_at,
      });
      map.set(row.personnel_id, profiles);
    }
    return map;
  });
  return (await profilesByPersonnel).get(personnelId) ?? [];
};
