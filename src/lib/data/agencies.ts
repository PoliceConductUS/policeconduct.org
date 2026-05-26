import { withDb } from "#src/lib/db.js";
import { requireAgencyCanonicalPath } from "./location-paths.js";
import type { AgencyFinderResult, AgencySummary } from "./types.js";
const nameCollator = new Intl.Collator("en", { sensitivity: "base" });

const compareNullable = (left?: string | null, right?: string | null) =>
  nameCollator.compare(left || "", right || "");

const requireText = (value: unknown, fieldName: string, agencyId: string) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`Agency ${agencyId} is missing required ${fieldName}`);
  }
  return text;
};

export const loadAgencySummaries = async (): Promise<AgencySummary[]> => {
  const agencies = await withDb(async (client): Promise<any[]> => {
    return (
      await client.query(
        `with first_phone as (
           select distinct on (agency_id)
             agency_id,
             phone_number
           from public.agency_phone_numbers
           order by agency_id, created_at
         ),
         active_personnel_counts as (
           select
             agency_id,
             count(distinct officer_id) as active_personnel_count
           from public.agency_officers
           where end_date is null
           group by agency_id
         ),
         report_counts as (
           select
             ao.agency_id,
             count(distinct ro.review_id) as report_count
           from public.agency_officers ao
           join public.review_officers ro
             on ro.agency_officer_id = ao.id
           group by ao.agency_id
         ),
         civil_case_agency_cases as (
           select direct_ao.agency_id, cco.civil_case_id
           from public.agency_officers direct_ao
           join public.civil_case_officers cco
             on cco.agency_officer_id = direct_ao.id
           union
           select target_ao.agency_id, cco.civil_case_id
           from public.agency_officers target_ao
           join public.agency_officers case_ao
             on case_ao.officer_id = target_ao.officer_id
           join public.civil_case_officers cco
             on cco.agency_officer_id = case_ao.id
         ),
         civil_case_counts as (
           select
             agency_id,
             count(distinct civil_case_id) as civil_case_count
           from civil_case_agency_cases
           group by agency_id
         )
         select
           a.id,
           a.name,
           lp.state_or_territory_slug as state,
           lp.administrative_area_name as administrative_area,
           lp.administrative_area_slug as location_administrative_area_slug,
           lp.place_name as city,
           lp.place_slug as location_place_slug,
           lp.path as location_path,
           bpp.path as canonical_path,
           a.address,
           a.zip_code,
           a.slug,
           fp.phone_number,
           coalesce(apc.active_personnel_count, 0) as active_personnel_count,
           coalesce(rc.report_count, 0) as report_count,
           coalesce(ccc.civil_case_count, 0) as civil_case_count
         from public.agency a
         join public.location_path lp
           on lp.location_path_id = a.location_path_id
         join public.build_page_payload bpp
           on bpp.page_type = 'agency'
          and bpp.entity_id = a.id
         left join first_phone fp
           on fp.agency_id = a.id
         left join active_personnel_counts apc
           on apc.agency_id = a.id
         left join report_counts rc
           on rc.agency_id = a.id
         left join civil_case_counts ccc
           on ccc.agency_id = a.id`,
      )
    ).rows;
  });

  const summaries: AgencySummary[] = agencies.map((agency: any) => {
    const id = requireText(agency.id, "id", "unknown");

    return {
      id,
      name: requireText(agency.name, "name", id),
      state: requireText(agency.state, "state", id),
      slug: requireText(agency.slug, "slug", id),
      administrativeArea: requireText(
        agency.administrative_area,
        "location administrative_area",
        id,
      ),
      administrativeAreaSlug: requireText(
        agency.location_administrative_area_slug,
        "location administrative_area_slug",
        id,
      ).toLowerCase(),
      city: agency.city || null,
      placeSlug: requireText(
        agency.location_place_slug,
        "location place_slug",
        id,
      ).toLowerCase(),
      address: agency.address || null,
      zipCode: agency.zip_code || null,
      phoneNumber: agency.phone_number || null,
      canonicalPath: requireAgencyCanonicalPath({
        id,
        canonical_path: agency.canonical_path,
      }),
      activePersonnelCount: Number(agency.active_personnel_count || 0),
      reportCount: Number(agency.report_count || 0),
      civilCaseCount: Number(agency.civil_case_count || 0),
    };
  });

  summaries.sort((a, b) => {
    const nameCompare = nameCollator.compare(a.name, b.name);
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return compareNullable(a.id, b.id);
  });

  return summaries;
};

export const loadAgencyFinderResults = async (): Promise<
  AgencyFinderResult[]
> => {
  const agencies = await withDb(async (client): Promise<any[]> => {
    return (
      await client.query(
        `select
           entity_id,
           payload
         from public.build_page_payload
         where page_type = 'agency'`,
      )
    ).rows;
  });

  const results: AgencyFinderResult[] = agencies.map((agency: any) => {
    const payload = agency.payload?.agency;
    const id = requireText(agency.entity_id || payload?.id, "id", "unknown");

    return {
      id,
      name: requireText(payload?.name, "name", id),
      state: requireText(payload?.state, "state", id),
      administrativeArea: requireText(
        payload?.administrativeArea,
        "location administrative_area",
        id,
      ),
      administrativeAreaSlug: null,
      city: payload?.city || null,
      zipCode: payload?.postalCode || null,
      canonicalPath: requireText(payload?.path, "canonicalPath", id),
    };
  });

  results.sort((a, b) => {
    const nameCompare = nameCollator.compare(a.name, b.name);
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return compareNullable(a.id, b.id);
  });

  return results;
};

export const resolveAgencyByStateSlug = async (state: string, slug: string) => {
  const agencies = await loadAgencySummaries();
  return agencies.find(
    (agency) => agency.state.toLowerCase() === state && agency.slug === slug,
  );
};

export const resolveAgencyByLocationSlug = async (
  state: string,
  administrativeArea: string,
  place: string,
  slug: string,
) => {
  const agencies = await loadAgencySummaries();
  return agencies.find(
    (agency) =>
      agency.state.toLowerCase() === state.toLowerCase() &&
      agency.administrativeAreaSlug === administrativeArea.toLowerCase() &&
      agency.placeSlug === place.toLowerCase() &&
      agency.slug === slug,
  );
};
