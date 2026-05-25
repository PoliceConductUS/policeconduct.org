import { withDb } from "#src/lib/db.js";

export const CIVIL_CASES_PAGE_SIZE = 25;

export type CivilCaseListItem = {
  id: string;
  slug: string;
  title: string;
  cause_number: string | null;
  court: string | null;
  filed_date: string;
  date_terminated: string | null;
  claims_summary: string | null;
};

const requireString = (
  row: Record<string, unknown>,
  fieldName: string,
  rowLabel: string,
) => {
  const value = row[fieldName];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Civil case ${rowLabel} is missing required ${fieldName}.`);
  }
  return value;
};

const requireDateString = (
  row: Record<string, unknown>,
  fieldName: string,
  rowLabel: string,
) => {
  const value = row[fieldName];
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return requireString(row, fieldName, rowLabel);
};

const toCivilCaseListItem = (
  row: Record<string, unknown>,
): CivilCaseListItem => {
  const id = requireString(row, "id", String(row.id || row.slug || "row"));

  return {
    id,
    slug: requireString(row, "slug", id),
    title: requireString(row, "title", id),
    cause_number:
      typeof row.cause_number === "string" && row.cause_number.trim()
        ? row.cause_number
        : null,
    court: typeof row.court === "string" ? row.court : null,
    filed_date: requireDateString(row, "filed_date", id),
    date_terminated:
      row.date_terminated instanceof Date &&
      !Number.isNaN(row.date_terminated.getTime())
        ? row.date_terminated.toISOString().slice(0, 10)
        : typeof row.date_terminated === "string" && row.date_terminated.trim()
          ? row.date_terminated
          : null,
    claims_summary:
      typeof row.claims_summary === "string" ? row.claims_summary : null,
  };
};

export const loadCivilCaseList = async (): Promise<CivilCaseListItem[]> => {
  return withDb(async (client) => {
    const result = await client.query(
      `
        select
          id,
          slug,
          title,
          cause_number,
          court,
          filed_date,
          date_terminated,
          claims_summary
        from public.civil_cases
        order by filed_date desc, title asc, cause_number asc
      `,
    );

    return result.rows.map(toCivilCaseListItem);
  });
};
