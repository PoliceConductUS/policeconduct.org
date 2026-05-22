import { withDb } from "#src/lib/db.js";

const nameCollator = new Intl.Collator("en", { sensitivity: "base" });

export type FederalAgencySummary = {
  branchCount: number;
  id: string;
  name: string;
  path: string;
  slug: string;
};

export type FederalAgencyBranch = {
  address?: string | null;
  administrativeArea?: string | null;
  city?: string | null;
  id: string;
  name: string;
  path: string;
  state?: string | null;
};

export type FederalAgencyDetail = FederalAgencySummary & {
  branches: FederalAgencyBranch[];
};

const federalAgencyPath = (slug: string) => `/federal/${slug}/`;

export const loadFederalAgencySummaries = async () => {
  const rows = await withDb(async (client) => {
    return (
      await client.query(
        `
          select
            fa.id,
            fa.name,
            fa.slug,
            count(fab.agency_id) as branch_count
          from public.federal_agency fa
          left join public.federal_agency_branch fab
            on fab.federal_agency_id = fa.id
          group by fa.id, fa.name, fa.slug
          order by fa.name
        `,
      )
    ).rows;
  });

  return rows
    .map(
      (row: any): FederalAgencySummary => ({
        branchCount: Number(row.branch_count || 0),
        id: String(row.id),
        name: String(row.name),
        path: federalAgencyPath(String(row.slug)),
        slug: String(row.slug),
      }),
    )
    .sort((left, right) => nameCollator.compare(left.name, right.name));
};

export const loadFederalAgencyDetailBySlug = async (slug: string) => {
  const row = await withDb(async (client) => {
    return (
      await client.query(
        `
          select
            fa.id,
            fa.name,
            fa.slug,
            coalesce(
              jsonb_agg(
                jsonb_build_object(
                  'id', a.id,
                  'name', a.name,
                  'path', lp.path || a.slug || '/',
                  'address', a.address,
                  'city', lp.place_name,
                  'state', lp.state_or_territory_slug,
                  'administrativeArea', lp.administrative_area_name
                )
                order by lp.state_or_territory_slug, lp.place_name, a.name
              ) filter (where a.id is not null),
              '[]'::jsonb
            ) as branches
          from public.federal_agency fa
          left join public.federal_agency_branch fab
            on fab.federal_agency_id = fa.id
          left join public.agency a
            on a.id = fab.agency_id
          left join public.location_path lp
            on lp.location_path_id = a.location_path_id
          where fa.slug = $1
          group by fa.id, fa.name, fa.slug
        `,
        [slug],
      )
    ).rows[0];
  });

  if (!row) return null;

  const branches = (row.branches || [])
    .filter((branch: any) => branch.path)
    .map(
      (branch: any): FederalAgencyBranch => ({
        address: branch.address || null,
        administrativeArea: branch.administrativeArea || null,
        city: branch.city || null,
        id: String(branch.id),
        name: String(branch.name),
        path: String(branch.path),
        state: branch.state || null,
      }),
    );

  return {
    branchCount: branches.length,
    branches,
    id: String(row.id),
    name: String(row.name),
    path: federalAgencyPath(String(row.slug)),
    slug: String(row.slug),
  } satisfies FederalAgencyDetail;
};
