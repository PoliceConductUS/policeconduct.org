import type { loadAgencyDetail } from "#src/lib/data/agency-detail.js";

export type CivilCaseRow = {
  id: string;
  slug: string;
  title?: string | null;
  cause_number?: string | null;
  filed_date?: string | null;
  date_terminated?: string | null;
  court?: string | null;
  caseUrl: string;
  type: "Direct" | "Personnel-linked" | "Direct + personnel-linked";
  personnel: CivilCasePersonnelRef[];
  personnelNames: string[];
};

export type CivilCasePersonnelRef = {
  href: string;
  id: string;
  name: string;
};

type CivilCaseOfficer = {
  first_name?: string | null;
  id?: string | null;
  last_name?: string | null;
  slug?: string | null;
};

type CivilCaseOfficerLink = {
  officer: CivilCaseOfficer;
};

const getOfficerName = (officer: CivilCaseOfficer) =>
  [officer.first_name, officer.last_name].filter(Boolean).join(" ");

const getPersonnelRef = (officer: CivilCaseOfficer) => {
  const id = String(officer.id || "").trim();
  const slug = String(officer.slug || "").trim();
  const name = getOfficerName(officer);
  if (!id || !slug || !name) {
    return null;
  }
  return {
    href: `/personnel/${slug}/`,
    id,
    name,
  };
};

const uniquePersonnel = (personnel: CivilCasePersonnelRef[]) => {
  const byId = new Map<string, CivilCasePersonnelRef>();
  for (const person of personnel) {
    byId.set(person.id, person);
  }
  return [...byId.values()];
};

const isPersonnelRef = (
  person: CivilCasePersonnelRef | null,
): person is CivilCasePersonnelRef => Boolean(person);

export const buildAgencyCivilCaseRows = (
  data: Awaited<ReturnType<typeof loadAgencyDetail>>,
) => {
  const casesById = new Map<string, CivilCaseRow>();

  for (const caseItem of data.civilCases) {
    const personnel = uniquePersonnel(
      (caseItem.officers || [])
        .map((officer: CivilCaseOfficer) => getPersonnelRef(officer))
        .filter(isPersonnelRef),
    );
    casesById.set(caseItem.id, {
      id: caseItem.id,
      slug: caseItem.slug,
      title: caseItem.title,
      cause_number: caseItem.cause_number,
      filed_date: caseItem.filed_date,
      date_terminated: caseItem.date_terminated,
      court: caseItem.court,
      caseUrl: caseItem.caseUrl,
      type: "Direct",
      personnel,
      personnelNames: personnel.map((person) => person.name),
    });
  }

  for (const caseItem of data.personnelLinkedCivilCases) {
    const existing = casesById.get(caseItem.id);
    const personnel = uniquePersonnel(
      (caseItem.links || [])
        .map((link: CivilCaseOfficerLink) => getPersonnelRef(link.officer))
        .filter(isPersonnelRef),
    );

    if (existing) {
      existing.type = "Direct + personnel-linked";
      existing.personnel = uniquePersonnel([
        ...existing.personnel,
        ...personnel,
      ]);
      existing.personnelNames = existing.personnel.map((person) => person.name);
      continue;
    }

    casesById.set(caseItem.id, {
      id: caseItem.id,
      slug: caseItem.slug,
      title: caseItem.title,
      cause_number: caseItem.cause_number,
      filed_date: caseItem.filed_date,
      date_terminated: caseItem.date_terminated,
      court: caseItem.court,
      caseUrl: caseItem.caseUrl,
      type: "Personnel-linked",
      personnel,
      personnelNames: personnel.map((person) => person.name),
    });
  }

  const compareText = new Intl.Collator("en", {
    numeric: true,
    sensitivity: "base",
  }).compare;
  const getTime = (value?: string | null) =>
    value ? new Date(value).getTime() : 0;

  return [...casesById.values()].sort((left, right) => {
    const dateCompare = getTime(right.filed_date) - getTime(left.filed_date);
    if (dateCompare !== 0) return dateCompare;
    return compareText(left.title || "", right.title || "");
  });
};
