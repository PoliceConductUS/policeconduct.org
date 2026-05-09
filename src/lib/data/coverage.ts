import { withDb } from "#src/lib/db.js";

export type CoverageOfficerRef = {
  slug: string;
  first_name: string;
  last_name: string;
};

export type CoverageLink = {
  id: string;
  url: string;
  title: string;
  source_name: string | null;
  published_at: string | null;
  notes: string | null;
  officers: CoverageOfficerRef[];
};

const hydrateCoverageLinks = async (rows: any[]): Promise<CoverageLink[]> => {
  if (!rows.length) {
    return [];
  }

  const coverageLinkIds = rows.map((row) => row.id);
  const officerRows = await withDb(async (client) => {
    return (
      await client.query(
        `
          select distinct
            coverage_officer.coverage_link_id,
            officer.slug,
            officer.first_name,
            officer.last_name
          from public.coverage_link_agency_officers coverage_officer
          join public.agency_officers agency_officer
            on agency_officer.id = coverage_officer.agency_officer_id
          join public.officers officer
            on officer.id = agency_officer.officer_id
          where coverage_officer.coverage_link_id = any($1)
          order by officer.last_name, officer.first_name
        `,
        [coverageLinkIds],
      )
    ).rows;
  });

  const officersByLink = new Map<string, CoverageOfficerRef[]>();
  for (const officer of officerRows) {
    const list = officersByLink.get(officer.coverage_link_id) || [];
    list.push({
      slug: officer.slug,
      first_name: officer.first_name,
      last_name: officer.last_name,
    });
    officersByLink.set(officer.coverage_link_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    source_name: row.source_name || null,
    published_at: row.published_at || null,
    notes: row.notes || null,
    officers: officersByLink.get(row.id) || [],
  }));
};

const orderClause = `
  order by
    link.published_at desc nulls last,
    link.title asc,
    link.id asc
`;

export const loadCoverageLinksForAgency = async (agencyId: string) => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
          select distinct link.*
          from public.coverage_links link
          join public.coverage_link_agency_officers coverage_officer
            on coverage_officer.coverage_link_id = link.id
          join public.agency_officers agency_officer
            on agency_officer.id = coverage_officer.agency_officer_id
          where agency_officer.agency_id = $1
          ${orderClause}
        `,
        [agencyId],
      )
    ).rows;
  });

  return hydrateCoverageLinks(rows);
};

export const loadCoverageLinksForOfficer = async (officerId: string) => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
          select distinct link.*
          from public.coverage_links link
          join public.coverage_link_agency_officers coverage_officer
            on coverage_officer.coverage_link_id = link.id
          join public.agency_officers agency_officer
            on agency_officer.id = coverage_officer.agency_officer_id
          where agency_officer.officer_id = $1
          ${orderClause}
        `,
        [officerId],
      )
    ).rows;
  });

  return hydrateCoverageLinks(rows);
};

export const loadCoverageLinksForReport = async (reportId: string) => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
          select distinct link.*
          from public.coverage_links link
          join public.coverage_link_reports coverage_report
            on coverage_report.coverage_link_id = link.id
          where coverage_report.review_id = $1
          ${orderClause}
        `,
        [reportId],
      )
    ).rows;
  });

  return hydrateCoverageLinks(rows);
};

export const loadCoverageLinksForCivilCase = async (civilCaseId: string) => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
          select distinct link.*
          from public.coverage_links link
          join public.coverage_link_civil_cases coverage_case
            on coverage_case.coverage_link_id = link.id
          where coverage_case.civil_case_id = $1
          ${orderClause}
        `,
        [civilCaseId],
      )
    ).rows;
  });

  return hydrateCoverageLinks(rows);
};
