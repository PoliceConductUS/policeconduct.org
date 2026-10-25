import { withDb } from "#src/lib/db.js";

export type LicensingAuthority = {
  id: string;
  name: string;
  abbreviation: string | null;
  website: string | null;
  href: string;
};

export type License = {
  id: string;
  licenseType: string;
  status: string | null;
  firstAwarded: string | null;
  authority: LicensingAuthority | null;
};

export type LicenseTimelineEntry = {
  id: string;
  action: string;
  actionDate: string | null;
  status: string | null;
  licenseId: string;
  licenseType: string;
  isAdverse: boolean;
};

export type PersonnelLicensing = {
  licenses: License[];
  timeline: LicenseTimelineEntry[];
};

export type DisciplineRecord = {
  id: string;
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
  authority: {
    name: string;
    abbreviation: string | null;
    href: string;
  };
  agencies: { id: string; name: string }[];
};

const trimOrNull = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text ? text : null;
};

// license.status is inconsistently cased/spelled across sources.
const STATUS_DISPLAY: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  expired: "Expired",
  deceased: "Deceased",
};

export const normalizeLicenseStatus = (value: unknown): string | null => {
  const text = trimOrNull(value);
  if (!text) return null;
  return STATUS_DISPLAY[text.toLowerCase()] ?? text;
};

// License types are already canonical in authority_license.name (intake collapses
// whitespace and drops a trailing " License"); just trim for display.
export const normalizeLicenseType = (value: unknown): string =>
  trimOrNull(value) ?? "";

// Actions that reflect discipline / compliance problems, distinguished from
// routine lifecycle events (Granted, Reactivated, expirations) for emphasis.
const ADVERSE_ACTION_PATTERNS: RegExp[] = [
  /reprimand/i,
  /\bhold\b/i,
  /noncompliant/i,
  /non-compliant/i,
  /out of compliance/i,
  /suspend/i,
  /revok/i,
  /surrender/i,
  /\bdenied\b/i,
  /probation/i,
  /cancel(?:l)?ed for cause/i,
];

export const isAdverseLicenseAction = (action: unknown): boolean => {
  const text = String(action ?? "");
  return ADVERSE_ACTION_PATTERNS.some((pattern) => pattern.test(text));
};

type RawLicense = {
  id: string;
  personnel_id: string;
  license_type: string;
  status: string | null;
  first_awarded: unknown;
  authority_id: string | null;
  authority_name: string | null;
  authority_abbreviation: string | null;
  authority_website: string | null;
  authority_path: string;
  authority_level: string;
};

type RawAction = {
  id: string;
  license_id: string;
  action: string;
  action_date: unknown;
  status: string | null;
};

// Every personnel page needs licensing, so at build time (153k+ pages) load all
// licenses + actions once and serve each page from memory instead of running a
// pair of queries per page. Memoized per process, like other build-time loaders.
let allLicensingPromise: Promise<{
  licensesByPersonnel: Map<string, RawLicense[]>;
  actionsByLicense: Map<string, RawAction[]>;
}> | null = null;

const loadAllLicensing = () => {
  if (!allLicensingPromise) {
    allLicensingPromise = withDb(async (client) => {
      const licenseRows: RawLicense[] = (
        await client.query(
          `
            select
              l.id, l.personnel_id, al.name as license_type, l.status,
              l.first_awarded,
              la.id as authority_id, la.name as authority_name,
              la.abbreviation as authority_abbreviation,
              la.website as authority_website,
              lp.path as authority_path, lp.level as authority_level
            from public.license l
            join public.authority_license al on al.id = l.authority_license_id
            left join public.licensing_authority la
              on la.id = al.licensing_authority_id
            left join public.location_path lp on lp.location_path_id = la.location_path_id
            order by l.personnel_id, l.first_awarded desc nulls last, al.name
          `,
        )
      ).rows;
      const licensesByPersonnel = new Map<string, RawLicense[]>();
      for (const row of licenseRows) {
        if (
          row.authority_id &&
          (row.authority_level !== "state" ||
            !/^\/[^/]+\/$/.test(row.authority_path))
        ) {
          throw new Error(
            `Invalid licensing authority state path for ${row.authority_id}.`,
          );
        }
        const list = licensesByPersonnel.get(row.personnel_id);
        if (list) list.push(row);
        else licensesByPersonnel.set(row.personnel_id, [row]);
      }

      const actionRows: RawAction[] = (
        await client.query(
          `
            select id, license_id, action, action_date, status
            from public.license_action
            order by action_date desc nulls last, id
          `,
        )
      ).rows;
      const actionsByLicense = new Map<string, RawAction[]>();
      for (const row of actionRows) {
        const list = actionsByLicense.get(row.license_id);
        if (list) list.push(row);
        else actionsByLicense.set(row.license_id, [row]);
      }

      return { licensesByPersonnel, actionsByLicense };
    });
  }
  return allLicensingPromise;
};

const actionSortTime = (value: string | null): number =>
  value ? new Date(value).getTime() || 0 : Number.NEGATIVE_INFINITY;

export const loadLicensingForPersonnel = async (
  personnelId: string,
): Promise<PersonnelLicensing> => {
  const { licensesByPersonnel, actionsByLicense } = await loadAllLicensing();
  const licenseRows = licensesByPersonnel.get(personnelId) || [];

  const licenses: License[] = licenseRows.map((row) => ({
    id: row.id,
    licenseType: normalizeLicenseType(row.license_type),
    status: normalizeLicenseStatus(row.status),
    firstAwarded: row.first_awarded ? String(row.first_awarded) : null,
    authority: row.authority_id
      ? {
          id: row.authority_id,
          name: row.authority_name ?? "",
          abbreviation: trimOrNull(row.authority_abbreviation),
          website: trimOrNull(row.authority_website),
          href: `${row.authority_path}licensing-authority/`,
        }
      : null,
  }));

  const licenseTypeById = new Map(
    licenseRows.map((row) => [row.id, normalizeLicenseType(row.license_type)]),
  );

  const timeline: LicenseTimelineEntry[] = [];
  for (const license of licenseRows) {
    for (const row of actionsByLicense.get(license.id) || []) {
      timeline.push({
        id: row.id,
        action: row.action,
        actionDate: row.action_date ? String(row.action_date) : null,
        status: normalizeLicenseStatus(row.status),
        licenseId: row.license_id,
        licenseType: licenseTypeById.get(row.license_id) ?? "",
        isAdverse: isAdverseLicenseAction(row.action),
      });
    }
  }
  // Merge across the person's licenses -> newest first (undated last).
  timeline.sort(
    (a, b) => actionSortTime(b.actionDate) - actionSortTime(a.actionDate),
  );

  return { licenses, timeline };
};

// Only a tiny fraction of personnel have discipline records, so at build time
// (153k+ personnel pages) load the set of personnel who have any once and skip
// the per-page query for everyone else. Memoized per process, like other
// build-time loaders.
let disciplinedPersonnelPromise: Promise<Set<string>> | null = null;

const loadDisciplinedPersonnelSet = (): Promise<Set<string>> => {
  if (!disciplinedPersonnelPromise) {
    disciplinedPersonnelPromise = withDb(async (client) => {
      const rows = (
        await client.query(
          `select distinct personnel_id from public.discipline`,
        )
      ).rows;
      return new Set<string>(rows.map((row) => row.personnel_id));
    });
  }
  return disciplinedPersonnelPromise;
};

export const loadDisciplineForPersonnel = async (
  personnelId: string,
): Promise<DisciplineRecord[]> => {
  const disciplined = await loadDisciplinedPersonnelSet();
  if (!disciplined.has(personnelId)) {
    return [];
  }
  return withDb(async (client): Promise<DisciplineRecord[]> => {
    const rows = (
      await client.query(
        `
          select
            d.id,
            d.action,
            d.effective_date::text as effective_date,
            d.expiration_date::text as expiration_date,
            d.case_number,
            d.document_url,
            d.allegation,
            d.violation,
            d.finding,
            d.chief_action,
            d.sanction,
            la.id as authority_id,
            la.name as authority_name,
            la.abbreviation as authority_abbreviation,
            lp.path as authority_path,
            lp.level as authority_level,
            coalesce((
              select jsonb_agg(distinct jsonb_build_object('id', a.id, 'name', a.name))
              from public.discipline_agency_personnel dap
              join public.agency_personnel ap on ap.id = dap.agency_personnel_id
              join public.agency a on a.id = ap.agency_id
              where dap.discipline_id = d.id
            ), '[]'::jsonb) as agencies
          from public.discipline d
          left join public.licensing_authority la
            on la.id = d.licensing_authority_id
          left join public.location_path lp
            on lp.location_path_id = la.location_path_id
          where d.personnel_id = $1
          order by d.effective_date desc nulls last, d.id
        `,
        [personnelId],
      )
    ).rows;

    const agencyCollator = new Intl.Collator("en", { sensitivity: "base" });
    return rows.map((row) => {
      if (
        !row.authority_id ||
        !row.authority_name ||
        row.authority_level !== "state" ||
        !/^\/[^/]+\/$/.test(row.authority_path)
      ) {
        throw new Error(
          `Invalid licensing authority state path for discipline ${row.id}.`,
        );
      }
      const agencies: { id: string; name: string }[] = row.agencies;
      agencies.sort(
        (a, b) =>
          agencyCollator.compare(a.name, b.name) || a.id.localeCompare(b.id),
      );
      return {
        id: row.id,
        action: row.action,
        effectiveDate: row.effective_date,
        expirationDate: row.expiration_date,
        caseNumber: row.case_number,
        documentUrl: row.document_url,
        allegation: row.allegation,
        violation: row.violation,
        finding: row.finding,
        chiefAction: row.chief_action,
        sanction: row.sanction,
        authority: {
          name: row.authority_name,
          abbreviation: row.authority_abbreviation,
          href: `${row.authority_path}licensing-authority/`,
        },
        agencies,
      };
    });
  });
};
