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
  category: string;
  city: string | null;
  state: string | null;
  administrative_area: string | null;
  administrative_area_slug: string | null;
  place_slug: string | null;
  canonicalPath: string;
};

export type CivilCaseDetail = {
  civilCase: {
    id: string;
    slug: string;
    category: string;
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
  category: string,
  slug: string,
): Promise<CivilCaseDetail | null> => {
  return withDb(async (client) => {
    const civilCase = (
      await client.query(
        `
          select *
          from public.civil_cases
          where lower(category) = $1
            and slug = $2
        `,
        [category.toLowerCase(), slug],
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
            agency.category,
            agency.city,
            agency.state,
            agency.administrative_area,
            agency.administrative_area_slug,
            agency.place_slug
          from public.civil_case_officers civil_case_officer
          join public.agency_officers agency_officer
            on agency_officer.id = civil_case_officer.agency_officer_id
          join public.agency agency
            on agency.id = agency_officer.agency_id
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
  const categoryRow = await withDb(async (client) => {
    return (
      await client.query(
        `
          select category
          from public.civil_cases
          where slug = $1
        `,
        [slug],
      )
    ).rows[0];
  });

  if (!categoryRow?.category) {
    return null;
  }

  return loadCivilCaseDetail(categoryRow.category, slug);
};
