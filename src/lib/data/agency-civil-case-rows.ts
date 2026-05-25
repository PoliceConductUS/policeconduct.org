import type { loadAgencyDetail } from "#src/lib/data/agency-detail.js";

export type CivilCaseRow = {
  id: string;
  slug: string;
  title?: string | null;
  cause_number?: string | null;
  filed_date?: string | null;
  court?: string | null;
  caseUrl: string;
  type: "Direct" | "Personnel-linked" | "Direct + personnel-linked";
  personnelNames: string[];
};

type CivilCaseOfficerName = {
  first_name?: string | null;
  last_name?: string | null;
};

const getOfficerName = (officer: CivilCaseOfficerName) =>
  [officer.first_name, officer.last_name].filter(Boolean).join(" ");

export const buildAgencyCivilCaseRows = (
  data: Awaited<ReturnType<typeof loadAgencyDetail>>,
) => {
  const casesById = new Map<string, CivilCaseRow>();

  for (const caseItem of data.civilCases) {
    casesById.set(caseItem.id, {
      id: caseItem.id,
      slug: caseItem.slug,
      title: caseItem.title,
      cause_number: caseItem.cause_number,
      filed_date: caseItem.filed_date,
      court: caseItem.court,
      caseUrl: caseItem.caseUrl,
      type: "Direct",
      personnelNames: (caseItem.officers || [])
        .map((officer: CivilCaseOfficerName) => getOfficerName(officer))
        .filter(Boolean),
    });
  }

  for (const caseItem of data.personnelLinkedCivilCases) {
    const existing = casesById.get(caseItem.id);
    const personnelNames = (caseItem.links || [])
      .map((link) => getOfficerName(link.officer))
      .filter(Boolean);

    if (existing) {
      existing.type = "Direct + personnel-linked";
      existing.personnelNames = [
        ...new Set([...existing.personnelNames, ...personnelNames]),
      ];
      continue;
    }

    casesById.set(caseItem.id, {
      id: caseItem.id,
      slug: caseItem.slug,
      title: caseItem.title,
      cause_number: caseItem.cause_number,
      filed_date: caseItem.filed_date,
      court: caseItem.court,
      caseUrl: caseItem.caseUrl,
      type: "Personnel-linked",
      personnelNames,
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
