import { withDb } from "#src/lib/db.js";
import { loadCoverageLinksForCivilCase } from "./coverage.js";
import { requireAgencyCanonicalPath } from "./location-paths.js";
import { buildReportCanonicalPath } from "./report-paths.js";

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
  license_type: string;
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
  reports: {
    id: string;
    title: string;
    incident_date: string | null;
    slug: string;
    path: string;
  }[];
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
    const coverageLinks = await loadCoverageLinksForCivilCase(civilCase.id);

    const officers = (
      await client.query(
        `
          select distinct
            officer.id,
            officer.slug,
            officer.first_name,
            officer.last_name,
            agency_officer.license_type
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
            lp.path as location_path,
            bpp.path as canonical_path
          from public.civil_case_officers civil_case_officer
          join public.agency_officers agency_officer
            on agency_officer.id = civil_case_officer.agency_officer_id
          join public.agency agency
            on agency.id = agency_officer.agency_id
          join public.location_path lp
            on lp.location_path_id = agency.location_path_id
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

    const reports = (
      await client.query(
        `
          select distinct
            review.id,
            review.title,
            review.incident_date,
            review.slug,
            location_path.path as location_path
          from public.coverage_link_civil_cases civil_case_link
          join public.coverage_link_reports report_link
            on report_link.coverage_link_id = civil_case_link.coverage_link_id
          join public.reviews review
            on review.id = report_link.review_id
          join public.location_path location_path
            on location_path.location_path_id = review.location_path_id
          where civil_case_link.civil_case_id = $1
          order by review.incident_date desc, review.title
        `,
        [civilCase.id],
      )
    ).rows.map(
      (report: {
        id: string;
        title: string;
        incident_date: string | null;
        slug: string;
        location_path: string;
      }) => ({
        id: report.id,
        title: report.title,
        incident_date: report.incident_date,
        slug: report.slug,
        path: buildReportCanonicalPath({
          id: report.id,
          incidentDate: report.incident_date,
          locationPath: report.location_path,
          slug: report.slug,
        }),
      }),
    );

    return {
      civilCase,
      officers,
      agencies,
      coverageLinks: [...civilCaseLinks, ...coverageLinks],
      reports,
    };
  });
};

export const loadCivilCaseDetailBySlug = async (
  slug: string,
): Promise<CivilCaseDetail | null> => {
  return loadCivilCaseDetail(slug);
};
