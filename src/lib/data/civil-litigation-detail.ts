import { withDb } from "#src/lib/db.js";
import { loadCoverageLinksForCivilCase } from "./coverage.js";
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
  license_type?: string | null;
  slug: string;
  first_name: string;
  last_name: string;
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
    state_or_territory_slug: string | null;
    title: string;
    cause_number: string;
    court: string | null;
    filed_date: string | null;
    claims_summary: string | null;
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
          select c.*, lp.path as location_path, lp.state_or_territory_slug
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
    const coverageLinks = await loadCoverageLinksForCivilCase(civilCase.id);

    const officers = (
      await client.query(
        `
          select distinct
            officer.id,
            officer.slug,
            officer.first_name,
            officer.last_name,
            agency_officer.title as license_type
          from public.civil_case_officers civil_case_officer
          join public.agency_officers agency_officer
            on agency_officer.id = civil_case_officer.agency_officer_id
          join public.officers officer
            on officer.id = agency_officer.officer_id
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
            lp.place_name as city,
            lp.state_or_territory_slug as state,
            lp.administrative_area_name as administrative_area,
            lp.path as location_path
          from public.civil_case_officers civil_case_officer
          join public.agency_officers agency_officer
            on agency_officer.id = civil_case_officer.agency_officer_id
          join public.agency agency
            on agency.id = agency_officer.agency_id
          join public.location_path lp
            on lp.location_path_id = agency.location_path_id
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
      coverageLinks: [...civilCaseLinks, ...coverageLinks],
    };
  });
};

export const loadCivilCaseDetailBySlug = async (
  slug: string,
): Promise<CivilCaseDetail | null> => {
  return loadCivilCaseDetail(slug);
};
