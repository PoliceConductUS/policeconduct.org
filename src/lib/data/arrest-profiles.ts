import { buildBeatMap, type BeatMap } from "./arrest-beats.js";
import { incomeRows, type IncomeEvidence } from "./arrest-income.js";
import { withDb } from "#src/lib/db.js";
import { requireAgencyCanonicalPath } from "./location-paths.js";

export type ArrestProfileRecord = {
  id: string;
  agency: { name: string; href: string };
  coverage: {
    agency: string;
    source: string;
    firstMonth: string;
    lastMonth: string;
    totalArrests: number;
    chargeRows: number;
    distinctChargeRecords: number;
  };
  breakdowns: Record<string, unknown> &
    Record<
      "by_year" | "by_month" | "by_iso_week" | "by_day_of_week",
      Record<string, number>
    >;
  beatMap?: BeatMap;
  incomeRows?: { label: string; count: number; agencyCount: number }[];
  updatedAt: string;
};
export type ArrestProfile = ArrestProfileRecord & { assignmentId: string };
export type AgencyArrestProfile = ArrestProfileRecord & { agencyId: string };

let profilesByPersonnel: Promise<Map<string, ArrestProfile[]>> | undefined;

export const loadArrestProfilesForPersonnel = async (
  personnelId: string,
): Promise<ArrestProfile[]> => {
  profilesByPersonnel ??= withDb(async (client) => {
    const { rows } =
      await client.query(`select profile.*, assignment.personnel_id,
      agency.id as agency_id, agency.name as agency_name, agency.slug, location.path as location_path,
      profile.updated_at::text as updated_at
      from public.arrest_profile profile
      join public.agency_personnel assignment on assignment.id = profile.agency_personnel_id
      join public.agency agency on agency.id = assignment.agency_id
      join public.location_path location on location.location_path_id = agency.location_path_id
      order by assignment.personnel_id, profile.coverage->>'firstMonth', profile.id`);
    const map = new Map<string, ArrestProfile[]>();
    for (const row of rows) {
      const profiles = map.get(row.personnel_id) ?? [];
      let income;
      let beatMap;
      if (
        Object.hasOwn(row.breakdowns, "by_income_status") ||
        Object.hasOwn(row.breakdowns, "by_arrest_beat")
      ) {
        const candidates = (
          await loadArrestProfilesForAgency(row.agency_id)
        ).filter(
          (agency) =>
            agency.coverage.source === row.coverage.source &&
            agency.coverage.firstMonth <= row.coverage.firstMonth &&
            agency.coverage.lastMonth >= row.coverage.lastMonth,
        );
        if (candidates.length !== 1)
          throw new Error(
            `Expected one agency comparison for arrest profile ${row.id}; found ${candidates.length}`,
          );
        if (Object.hasOwn(row.breakdowns, "by_arrest_beat"))
          beatMap = buildBeatMap(
            candidates[0].breakdowns.arrest_beat_boundaries,
            row.breakdowns.by_arrest_beat,
            row.coverage.totalArrests,
          );
        if (Object.hasOwn(row.breakdowns, "by_income_status")) {
          income = incomeRows(
            row.breakdowns,
            candidates[0].breakdowns as unknown as IncomeEvidence,
            row.coverage.firstMonth,
            row.coverage.lastMonth,
          );
          if (
            income.reduce((sum, item) => sum + item.count, 0) !==
            row.coverage.totalArrests
          )
            throw new Error(
              `Income counts do not cover all arrests in profile ${row.id}`,
            );
        }
      }
      profiles.push({
        beatMap,
        incomeRows: income,
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

let profilesByAgency: Promise<Map<string, AgencyArrestProfile[]>> | undefined;

export const loadArrestProfilesForAgency = async (
  agencyId: string,
): Promise<AgencyArrestProfile[]> => {
  profilesByAgency ??= withDb(async (client) => {
    const { rows } =
      await client.query(`select profile.*, agency.name as agency_name,
      agency.slug, location.path as location_path, profile.updated_at::text as updated_at
      from public.agency_arrest_profile profile
      join public.agency agency on agency.id = profile.agency_id
      join public.location_path location on location.location_path_id = agency.location_path_id
      order by profile.agency_id, profile.coverage->>'firstMonth', profile.id`);
    const map = new Map<string, AgencyArrestProfile[]>();
    for (const row of rows) {
      const profiles = map.get(row.agency_id) ?? [];
      profiles.push({
        id: row.id,
        agencyId: row.agency_id,
        beatMap: Object.hasOwn(row.breakdowns, "by_arrest_beat")
          ? buildBeatMap(
              row.breakdowns.arrest_beat_boundaries,
              row.breakdowns.by_arrest_beat,
              row.coverage.totalArrests,
            )
          : undefined,
        agency: {
          name: row.agency_name,
          href: requireAgencyCanonicalPath(row),
        },
        coverage: row.coverage,
        breakdowns: row.breakdowns,
        updatedAt: row.updated_at,
      });
      map.set(row.agency_id, profiles);
    }
    return map;
  });
  return (await profilesByAgency).get(agencyId) ?? [];
};
