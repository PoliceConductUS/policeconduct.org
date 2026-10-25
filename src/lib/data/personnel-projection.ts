/**
 * The single place personnel field exposure is decided.
 *
 * Every read of `public.agency_personnel` that feeds a published page goes
 * through the column list here instead of `select *`. A column named in
 * `SUPPRESSED_COLUMNS` is never fetched, so it cannot reach a template, a
 * schema.org graph, a `data-` attribute, or an inline prefill payload.
 *
 * Nothing here withholds a page or a row. Suppression drops one field from the
 * select list; every personnel and agency page renders and publishes exactly as
 * before, minus that field.
 *
 * Suppressed fields are omitted, never replaced with a placeholder. Rendering
 * "Not publicly listed" asserts the record was checked and found empty, which
 * is a claim we cannot source.
 */

/** Columns a published page may read from `public.agency_personnel`. */
export const AGENCY_PERSONNEL_COLUMNS = [
  "id",
  "agency_id",
  "personnel_id",
  "title",
  "badge_number",
  "license_id",
  "start_date",
  "end_date",
] as const;

/**
 * Fields withheld from every published page until per-field lineage exists.
 *
 * Keyed by `table.column`. Removing an entry publishes the field corpus-wide.
 */
export const SUPPRESSED_COLUMNS: Readonly<Record<string, string>> =
  Object.freeze({
    "agency_personnel.badge_number":
      "INS-34: the TCOLE production carries no badge-number column, so every badge value we hold is hand-authored with no retrieval date. A wrong badge number routes a real allegation onto the wrong human being.",
  });

const columnsFor: Readonly<Record<string, readonly string[]>> = Object.freeze({
  agency_personnel: AGENCY_PERSONNEL_COLUMNS,
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

/** The columns of `table` published pages may read, in declaration order. */
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
 * `projection()` prevents this for the reads it owns. This catches the case it
 * cannot own: a hand-written join that reintroduces `select *` or `ao.*`.
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
