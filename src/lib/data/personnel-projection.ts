/**
 * The single place personnel field exposure is decided.
 *
 * Every read of `public.officers` or `public.agency_officers` that feeds a
 * published page goes through the column lists here. Two consequences follow,
 * and both are the point:
 *
 * 1. A column that is not named here is never fetched, so it cannot reach a
 *    template, a schema.org graph, a `data-` attribute, or an inline prefill
 *    payload. A future migration that adds a column publishes nothing.
 * 2. Suppressing a field is a one-line change here, not an audit of every
 *    template that might touch it.
 *
 * `SUPPRESSED_COLUMNS` implements the Executive Director's INS-11 §3 ruling:
 * a field about a named human being is not published until its lineage exists.
 * Suppression is enforced by omission from the SQL select list — the value does
 * not leave Postgres — so a template cannot leak it even by accident.
 *
 * Suppressed fields are omitted, never replaced with a placeholder. Rendering
 * "Not publicly listed" or "Unknown" asserts the record was checked and found
 * empty, which is a claim we cannot source (AGENTS.md, Templates/Critical
 * Fields).
 */

/** Columns a published page is allowed to read from `public.officers`. */
export const OFFICER_COLUMNS = [
  "id",
  "slug",
  "first_name",
  "last_name",
  "suffix",
  "deceased_on",
  "deceased_message",
  "updated_at",
] as const;

/** Columns a published page is allowed to read from `public.agency_officers`. */
export const AGENCY_OFFICER_COLUMNS = [
  "id",
  "agency_id",
  "officer_id",
  "license_type",
  "badge_number",
  "start_date",
  "end_date",
] as const;

/**
 * Fields withheld from every published page until per-field lineage exists.
 *
 * Keyed by `table.column`. Removing an entry publishes the field corpus-wide,
 * so entries come out only on a Data Integrity & Publication Risk Reviewer
 * decision recorded on the issue named in `decidedBy`.
 */
export const SUPPRESSED_COLUMNS: Readonly<Record<string, string>> =
  Object.freeze({
    "agency_officers.badge_number":
      "INS-11 §3 / INS-34: a wrong badge number routes a real allegation onto the wrong human being. No load path captures a retrieval date (INS-18), so no badge value is traceable.",
  });

const columnsFor: Readonly<Record<string, readonly string[]>> = Object.freeze({
  officers: OFFICER_COLUMNS,
  agency_officers: AGENCY_OFFICER_COLUMNS,
});

const knownColumns = (table: string): readonly string[] => {
  const columns = columnsFor[table];
  if (!columns) {
    throw new Error(
      `No personnel projection is defined for table ${table}. Add its columns to personnel-projection.ts before reading it on a published page.`,
    );
  }
  return columns;
};

/** True when `table.column` is withheld from published pages. */
export const isSuppressed = (table: string, column: string): boolean =>
  Object.hasOwn(SUPPRESSED_COLUMNS, `${table}.${column}`);

/** The columns of `table` that published pages may read, in declaration order. */
export const publishableColumns = (table: string): string[] =>
  knownColumns(table).filter((column) => !isSuppressed(table, column));

/**
 * SQL select list for `table`, qualified by `alias`, with suppressed columns
 * omitted. Use in place of `select *` on every published personnel read.
 */
export const projection = (table: string, alias: string): string =>
  publishableColumns(table)
    .map((column) => `${alias}.${column}`)
    .join(", ");

/**
 * Fail the build if a suppressed column reached a row.
 *
 * `projection()` already prevents this for reads it owns. This catches the case
 * it cannot own: a hand-written join that reintroduces `select *` or an alias
 * such as `ao.*`. Personnel pages are built once per deploy, so failing here
 * stops the publication event rather than reporting on it afterwards.
 */
export const assertNoSuppressedColumns = (
  table: string,
  rows: readonly Record<string, unknown>[],
): void => {
  const suppressed = knownColumns(table).filter((column) =>
    isSuppressed(table, column),
  );
  for (const row of rows) {
    for (const column of suppressed) {
      if (Object.hasOwn(row, column)) {
        throw new Error(
          `Suppressed field ${table}.${column} reached a published page projection. ${SUPPRESSED_COLUMNS[`${table}.${column}`]}`,
        );
      }
    }
  }
};
