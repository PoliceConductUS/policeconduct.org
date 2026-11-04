import { withDb } from "#src/lib/db.js";

export type StateAuthority = {
  id: string;
  name: string;
  abbreviation: string | null;
  website: string | null;
  statePath: string;
  stateName: string;
  level: string;
};
export type AuthorityRecords = {
  licenses: { licenseType: string; status: string | null; count: number }[];
  actions: { action: string; count: number; latestDate: string | null }[];
  discipline: {
    id: string;
    personnelName: string;
    personnelSlug: string;
    action: string;
    effectiveDate: string | null;
    expirationDate: string | null;
    caseNumber: string | null;
    documentUrl: string | null;
    allegation: string | null;
    violation: string | null;
    finding: string | null;
    chiefAction: string | null;
    sanction: string | null;
  }[];
};

export const requireStateAuthority = (
  rows: StateAuthority[],
  statePath: string,
): StateAuthority => {
  if (
    rows.length !== 1 ||
    rows[0].statePath !== statePath ||
    rows[0].level !== "state" ||
    !/^\/[^/]+\/$/.test(statePath)
  ) {
    throw new Error(
      `Expected exactly one state licensing authority at ${statePath}.`,
    );
  }
  return rows[0];
};

const authoritySelect = `select la.id, la.name, la.abbreviation, la.website,
  lp.path as "statePath", lp.display_name as "stateName", lp.level
  from public.licensing_authority la
  join public.location_path lp on lp.location_path_id = la.location_path_id`;

export const loadStateAuthority = async (statePath: string) => {
  const rows = await withDb(
    async (client) =>
      (
        await client.query<StateAuthority>(
          `${authoritySelect} where lp.path = $1`,
          [statePath],
        )
      ).rows,
  );
  return requireStateAuthority(rows, statePath);
};

export const loadStateAuthorityLink = async (statePath: string) => {
  const rows = await withDb(
    async (client) =>
      (
        await client.query<StateAuthority>(
          `${authoritySelect} where lp.path = $1`,
          [statePath],
        )
      ).rows,
  );
  if (!rows.length) return null;
  return `${requireStateAuthority(rows, statePath).statePath}licensing-authority/`;
};

export const loadStateAuthorityPaths = async () => {
  const rows = await withDb(
    async (client) =>
      (await client.query<StateAuthority>(authoritySelect)).rows,
  );
  return rows.map((authority) => {
    requireStateAuthority(
      rows.filter((row) => row.statePath === authority.statePath),
      authority.statePath,
    );
    return { params: { category: authority.statePath.split("/")[1] } };
  });
};

export const loadAuthorityRecords = async (
  authorityId: string,
): Promise<AuthorityRecords> =>
  withDb(async (client) => {
    const licenses = (
      await client.query<AuthorityRecords["licenses"][number]>(
        `
    select al.name as "licenseType", l.status, count(*)::int as count
    from public.license l
    join public.authority_license al on al.id = l.authority_license_id
    where al.licensing_authority_id = $1
    group by al.name, l.status order by al.name, l.status nulls last`,
        [authorityId],
      )
    ).rows;
    const actions = (
      await client.query<AuthorityRecords["actions"][number]>(
        `
    select a.action, count(*)::int as count, max(a.action_date)::text as "latestDate"
    from public.license_action a
    join public.license l on l.id = a.license_id
    join public.authority_license al on al.id = l.authority_license_id
    where al.licensing_authority_id = $1
    group by a.action order by a.action`,
        [authorityId],
      )
    ).rows;
    const discipline = (
      await client.query<AuthorityRecords["discipline"][number]>(
        `
    select d.id, concat_ws(' ', p.first_name, p.middle_name, p.last_name, p.suffix) as "personnelName",
      p.slug as "personnelSlug", d.action, d.effective_date::text as "effectiveDate",
      d.expiration_date::text as "expirationDate", d.case_number as "caseNumber",
      d.document_url as "documentUrl", d.allegation, d.violation, d.finding,
      d.chief_action as "chiefAction", d.sanction
    from public.discipline d join public.personnel p on p.id = d.personnel_id
    where d.licensing_authority_id = $1
    order by d.effective_date desc nulls last, d.id`,
        [authorityId],
      )
    ).rows;
    const collator = new Intl.Collator("en", { sensitivity: "base" });
    licenses.sort(
      (a, b) =>
        collator.compare(a.licenseType, b.licenseType) ||
        collator.compare(a.status ?? "", b.status ?? ""),
    );
    actions.sort((a, b) => collator.compare(a.action, b.action));
    return { licenses, actions, discipline };
  });
