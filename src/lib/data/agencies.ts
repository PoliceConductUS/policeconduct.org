import { withDb } from "../db.js";
import type { AgencySummary } from "./types.js";
import { MIN_AGENCY_OFFICERS } from "./constants.js";

const nameCollator = new Intl.Collator("en", { sensitivity: "base" });
const normalizeCategory = (value?: string | null) =>
  (value || "").trim().toLowerCase();

const compareNullable = (left?: string | null, right?: string | null) =>
  nameCollator.compare(left || "", right || "");

export const loadAgencySummaries = async (): Promise<AgencySummary[]> => {
  const agencies = await withDb(async (client): Promise<any[]> => {
    return (
      await client.query(
        `select
           a.id,
           a.name,
           a.state,
           a.city,
           a.address,
           a.zip_code,
           a.slug,
           a.category,
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
           ) as report_count
         from public.agency a
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
         group by a.id, a.name, a.state, a.slug, a.category, ap.phone_number`,
      )
    ).rows;
  });

  const summaries: AgencySummary[] = agencies.map((agency: any) => ({
    id: agency.id,
    name: agency.name,
    state: agency.state,
    category: normalizeCategory(agency.category),
    slug: agency.slug,
    city: agency.city || null,
    address: agency.address || null,
    zipCode: agency.zip_code || null,
    phoneNumber: agency.phone_number || null,
    activePersonnelCount: Number(agency.active_personnel_count || 0),
    reportCount: Number(agency.report_count || 0),
  }));

  const filtered = summaries.filter((agency) => {
    if (agency.category === "federal") {
      return true;
    }
    // Always include agencies with reports
    if (agency.reportCount > 0) {
      return true;
    }
    return agency.activePersonnelCount >= MIN_AGENCY_OFFICERS;
  });

  filtered.sort((a, b) => {
    const nameCompare = nameCollator.compare(a.name, b.name);
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return compareNullable(a.id, b.id);
  });

  return filtered;
};

export const resolveAgencyByStateSlug = async (state: string, slug: string) => {
  const agencies = await loadAgencySummaries();
  return agencies.find(
    (agency) => agency.category === state && agency.slug === slug,
  );
};
