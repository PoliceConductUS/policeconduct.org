import { groupBy } from "#src/lib/data.js";
import { withDb } from "#src/lib/db.js";
import type { CivicIndexModel } from "./civic-index.js";
import { requireAgencyCanonicalPath } from "./location-paths.js";

export type CivicTopicKind =
  | "personnel"
  | "budget"
  | "civil-cases"
  | "liability-costs";

export type CivicTopicAgencyRef = {
  href: string;
  id: string;
  name: string;
};

export type CivicTopicPersonnelRef = {
  href: string;
  id: string;
  name: string;
};

export type CivicCivilCaseRecord = {
  agencies: CivicTopicAgencyRef[];
  court?: string | null;
  dateTerminated?: string | null;
  filedDate: string;
  href: string;
  id: string;
  personnel: CivicTopicPersonnelRef[];
  searchText: string;
  title: string;
};

export type CivicTopicRecords =
  | {
      emptyLabel: string;
      kind: "civil-cases";
      rows: CivicCivilCaseRecord[];
      title: string;
      totalCount: number;
    }
  | {
      emptyLabel: string;
      kind: "personnel";
      rows: [];
      title: string;
      totalCount: null;
    }
  | {
      emptyLabel: string;
      kind: "budget" | "liability-costs";
      rows: [];
      title: string;
      totalCount: null;
    };

const requireText = (value: unknown, fieldName: string, rowId: string) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`Topic record ${rowId} is missing required ${fieldName}.`);
  }
  return text;
};

const fullName = (row: {
  first_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
}) => [row.first_name, row.last_name, row.suffix].filter(Boolean).join(" ");

const scopedAgencyPredicate = "lp.path like $1 || '%'";

const loadCivilCaseRecords = async (
  model: CivicIndexModel,
): Promise<CivicTopicRecords> => {
  const rows = await withDb(async (client) => {
    const scopedCasesSql = `
      with scoped_agencies as (
        select a.id
        from public.agency a
        join public.location_path lp
          on lp.location_path_id = a.location_path_id
        where ${scopedAgencyPredicate}
      ),
      scoped_cases as (
        select distinct c.id
        from public.civil_cases c
        join public.civil_case_officers cco
          on cco.civil_case_id = c.id
        join public.agency_officers case_ao
          on case_ao.id = cco.agency_officer_id
        join public.agency_officers target_ao
          on target_ao.officer_id = case_ao.officer_id
        join scoped_agencies scoped_agency
          on scoped_agency.id = target_ao.agency_id
      )
    `;
    const totalCount = Number(
      (
        await client.query(
          `
            ${scopedCasesSql}
            select count(*) as count
            from scoped_cases
          `,
          [model.pagePath],
        )
      ).rows[0]?.count || 0,
    );
    const cases = (
      await client.query(
        `
          ${scopedCasesSql}
          select
            c.id,
            c.slug,
            c.title,
            c.court,
            c.filed_date,
            c.date_terminated
          from scoped_cases scoped_case
          join public.civil_cases c
            on c.id = scoped_case.id
          order by c.filed_date desc, c.title asc, c.cause_number asc
          limit 200
        `,
        [model.pagePath],
      )
    ).rows;
    const caseIds = cases.map((row: { id: string }) => row.id);

    if (!caseIds.length) {
      return { agencies: [], cases, officers: [], totalCount };
    }

    const agencies = (
      await client.query(
        `
          select distinct
            cco.civil_case_id,
            a.id,
            a.name,
            a.slug,
            lp.path as location_path
          from public.civil_case_officers cco
          join public.agency_officers ao
            on ao.id = cco.agency_officer_id
          join public.agency a
            on a.id = ao.agency_id
          join public.location_path lp
            on lp.location_path_id = a.location_path_id
          where cco.civil_case_id = any($1)
          order by a.name, a.id
        `,
        [caseIds],
      )
    ).rows;

    const officers = (
      await client.query(
        `
          select distinct
            cco.civil_case_id,
            o.id,
            o.slug,
            o.first_name,
            o.last_name,
            o.suffix
          from public.civil_case_officers cco
          join public.agency_officers ao
            on ao.id = cco.agency_officer_id
          join public.officers o
            on o.id = ao.officer_id
          where cco.civil_case_id = any($1)
          order by o.last_name, o.first_name, o.id
        `,
        [caseIds],
      )
    ).rows;

    return { agencies, cases, officers, totalCount };
  });

  const agenciesByCase = groupBy(rows.agencies, "civil_case_id");
  const officersByCase = groupBy(rows.officers, "civil_case_id");
  const civilCases = rows.cases.map((civilCase: any): CivicCivilCaseRecord => {
    const id = requireText(civilCase.id, "id", "unknown");
    const title = requireText(civilCase.title, "title", id);
    const href = `/civil-cases/${requireText(civilCase.slug, "slug", id)}/`;
    const agencies = (agenciesByCase[id] || []).map((agency: any) => {
      const agencyId = requireText(agency.id, "agency id", id);
      return {
        href: requireAgencyCanonicalPath({
          id: agencyId,
          location_path: requireText(agency.location_path, "agency path", id),
          slug: requireText(agency.slug, "agency slug", id),
        }),
        id: agencyId,
        name: requireText(agency.name, "agency name", id),
      };
    });
    const personnel: CivicTopicPersonnelRef[] = (officersByCase[id] || []).map(
      (officer: any) => {
        const officerId = requireText(officer.id, "officer id", id);
        const name = requireText(fullName(officer), "officer name", officerId);
        return {
          href: `/personnel/${requireText(officer.slug, "officer slug", officerId)}/`,
          id: officerId,
          name,
        };
      },
    );

    return {
      agencies,
      court: civilCase.court || null,
      dateTerminated: civilCase.date_terminated || null,
      filedDate: requireText(civilCase.filed_date, "filed_date", id),
      href,
      id,
      personnel,
      searchText: [
        title,
        civilCase.court,
        ...agencies.map((agency: CivicTopicAgencyRef) => agency.name),
        ...personnel.map((person: CivicTopicPersonnelRef) => person.name),
      ]
        .filter(Boolean)
        .join(" "),
      title,
    };
  });

  return {
    emptyLabel: "No civil cases are connected to agencies in this scope.",
    kind: "civil-cases",
    rows: civilCases,
    title: "Civil Cases",
    totalCount: rows.totalCount,
  };
};

export const loadCivicTopicRecords = async (
  model: CivicIndexModel,
  kind: CivicTopicKind,
): Promise<CivicTopicRecords> => {
  if (kind === "civil-cases") {
    return loadCivilCaseRecords(model);
  }

  if (kind === "personnel") {
    return {
      emptyLabel:
        "Personnel lists are available on individual agency pages for this scope.",
      kind: "personnel",
      rows: [],
      title: "Personnel",
      totalCount: null,
    };
  }

  return {
    emptyLabel:
      kind === "budget"
        ? "Budget records are not projected for this scope yet."
        : "Liability cost records are not projected for this scope yet.",
    kind,
    rows: [],
    title: kind === "budget" ? "Budget" : "Liability Costs",
    totalCount: null,
  };
};
