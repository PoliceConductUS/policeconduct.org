import { withDb } from "#src/lib/db.js";
import { requireAgencyCanonicalPath } from "./location-paths.js";

export type CivilCaseCoverageLink = {
  id: string;
  title: string;
  url: string;
  source_name?: string | null;
  published_at?: string | null;
  notes?: string | null;
};

export type CivilCaseDetailOfficer = {
  id: string;
  title: string;
  slug: string;
  first_name: string;
  last_name: string | null;
};

export type CivilCaseDetailAgency = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  administrative_area: string | null;
  location_path: string | null;
  canonicalPath: string;
};

export type CivilCaseDetail = {
  civilCase: {
    id: string;
    slug: string;
    location_path: string | null;
    location_name: string | null;
    state_or_territory_slug: string | null;
    title: string;
    cause_number: string;
    court: string | null;
    filed_date: string;
    date_terminated: string | null;
    claims_summary: string;
    outcome: string | null;
    primary_source_url: string | null;
    created_at: string;
    updated_at: string;
  };
  officers: CivilCaseDetailOfficer[];
  agencies: CivilCaseDetailAgency[];
  coverageLinks: CivilCaseCoverageLink[];
};

export const loadCivilCaseDetail = async (
  slug: string,
): Promise<CivilCaseDetail | null> => {
  return withDb(async (client) => {
    const civilCase = (
      await client.query(
        `
          select c.*, lp.path as location_path, lp.display_name as location_name,
            split_part(lp.path, '/', 2) as state_or_territory_slug
          from public.civil_cases c
          left join public.location_path lp
            on lp.location_path_id = c.location_path_id
          where c.slug = $1
        `,
        [slug],
      )
    ).rows[0];
    if (!civilCase) {
      return null;
    }
    if (
      typeof civilCase.claims_summary !== "string" ||
      !civilCase.claims_summary.trim()
    ) {
      throw new Error(
        `Civil case ${civilCase.id || slug} is missing required claims_summary.`,
      );
    }

    const civilCaseLinks = (
      await client.query(
        `
          select id, title, url, created_at, updated_at
          from public.civil_case_links
          where civil_case_id = $1
          order by created_at, id
        `,
        [civilCase.id],
      )
    ).rows.map((link: { id: string; title: string; url: string }) => ({
      ...link,
    }));
    const officers = (
      await client.query(
        `
          select distinct
            officer.id,
            officer.slug,
            officer.first_name,
            officer.last_name,
            agency_officer.title
          from public.civil_case_personnel civil_case_officer
          join public.agency_personnel agency_officer
            on agency_officer.id = civil_case_officer.agency_personnel_id
          join public.personnel officer
            on officer.id = agency_officer.personnel_id
          where civil_case_officer.civil_case_id = $1
          order by officer.last_name, officer.first_name
        `,
        [civilCase.id],
      )
    ).rows;

    const agencies = (
      await client.query(
        `
          select distinct
            agency.id,
            agency.name,
            agency.slug,
            lp.display_name as city,
            split_part(lp.path, '/', 2) as state,
            area_lp.display_name as administrative_area,
            lp.path as location_path,
            bpp.path as canonical_path
          from public.civil_case_personnel civil_case_officer
          join public.agency_personnel agency_officer
            on agency_officer.id = civil_case_officer.agency_personnel_id
          join public.agency agency
            on agency.id = agency_officer.agency_id
          join public.location_path lp
            on lp.location_path_id = agency.location_path_id
          left join public.location_path area_lp
            on area_lp.location_path_id = lp.parent_location_path_id
           and area_lp.level = 'administrative_area'
          join public.build_page_payload bpp
            on bpp.page_type = 'agency'
           and bpp.entity_id = agency.id
          where civil_case_officer.civil_case_id = $1
          order by agency.name
        `,
        [civilCase.id],
      )
    ).rows.map((agency: CivilCaseDetailAgency) => ({
      ...agency,
      canonicalPath: requireAgencyCanonicalPath(agency),
    }));

    return {
      civilCase,
      officers,
      agencies,
      coverageLinks: civilCaseLinks,
    };
  });
};

export const loadCivilCaseDetailBySlug = async (
  slug: string,
): Promise<CivilCaseDetail | null> => {
  return loadCivilCaseDetail(slug);
};
