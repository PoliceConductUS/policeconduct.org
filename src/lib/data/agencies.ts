import { withDb } from "#src/lib/db.js";
import {
  getAgencyAdministrativeArea,
  getAgencyAdministrativeAreaSlug,
  getAgencyPlaceSlug,
  requireAgencyCanonicalPath,
} from "./location-paths.js";
import type { AgencySummary } from "./types.js";
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
        `select
           a.id,
           a.name,
           a.state,
           a.administrative_area,
           a.administrative_area_slug,
           a.city,
           a.place_slug,
           a.address,
           a.zip_code,
           a.slug,
           ap.phone_number,
           count(distinct ao.officer_id) as active_personnel_count,
           coalesce(
             (
               select count(distinct ro.review_id)
               from public.agency_officers ao2
               join public.review_officers ro on ro.agency_officer_id = ao2.id
               where ao2.agency_id = a.id
             ),
             0
           ) as report_count,
           coalesce(
             (
               select count(distinct cco.civil_case_id)
               from public.agency_officers ao3
               join public.civil_case_officers cco on cco.agency_officer_id = ao3.id
               where ao3.agency_id = a.id
             ),
             0
           ) as civil_case_count
         from public.agency a
         join public.build_page_payload bpp
           on bpp.page_type = 'agency'
          and bpp.entity_id = a.id
         left join lateral (
           select phone_number
           from public.agency_phone_numbers apn
           where apn.agency_id = a.id
           order by apn.created_at
           limit 1
         ) ap on true
         left join public.agency_officers ao
           on ao.agency_id = a.id
          and ao.end_date is null
         group by a.id, a.name, a.state, a.administrative_area,
           a.administrative_area_slug, a.city, a.place_slug, a.address,
           a.zip_code, a.slug, ap.phone_number`,
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
      administrativeArea: getAgencyAdministrativeArea(agency),
      administrativeAreaSlug: getAgencyAdministrativeAreaSlug(agency),
      city: agency.city || null,
      placeSlug: getAgencyPlaceSlug(agency),
      address: agency.address || null,
      zipCode: agency.zip_code || null,
      phoneNumber: agency.phone_number || null,
      canonicalPath: requireAgencyCanonicalPath(agency),
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
