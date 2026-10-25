import { withDb } from "#src/lib/db.js";

export type CoverageOfficerRef = {
  slug: string;
  first_name: string;
  last_name: string | null;
  title?: string | null;
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
            officer.last_name,
            agency_officer.title
          from public.coverage_link_agency_personnel coverage_officer
          join public.agency_personnel agency_officer
            on agency_officer.id = coverage_officer.agency_personnel_id
          join public.personnel officer
            on officer.id = agency_officer.personnel_id
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
      title: officer.title || null,
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
          join public.coverage_link_agency_personnel coverage_officer
            on coverage_officer.coverage_link_id = link.id
          join public.agency_personnel agency_officer
            on agency_officer.id = coverage_officer.agency_personnel_id
          where agency_officer.agency_id = $1
          ${orderClause}
        `,
        [agencyId],
      )
    ).rows;
  });

  return hydrateCoverageLinks(rows);
};

let coverageByPersonnel: Promise<Map<string, CoverageLink[]>> | undefined;

export const loadCoverageLinksForOfficer = async (officerId: string) => {
  coverageByPersonnel ??= (async () => {
    const rows = await withDb(
      async (client) =>
        (
          await client.query(`
        select distinct link.*, assignment.personnel_id
        from public.coverage_links link
        join public.coverage_link_agency_personnel linked
          on linked.coverage_link_id = link.id
        join public.agency_personnel assignment
          on assignment.id = linked.agency_personnel_id
        ${orderClause}
      `)
        ).rows,
    );
    const uniqueRows = [...new Map(rows.map((row) => [row.id, row])).values()];
    const links = new Map(
      (await hydrateCoverageLinks(uniqueRows)).map((link) => [link.id, link]),
    );
    const map = new Map<string, CoverageLink[]>();
    for (const row of rows) {
      const personnelLinks = map.get(row.personnel_id) ?? [];
      personnelLinks.push(links.get(row.id)!);
      map.set(row.personnel_id, personnelLinks);
    }
    return map;
  })();
  return (await coverageByPersonnel).get(officerId) ?? [];
};
