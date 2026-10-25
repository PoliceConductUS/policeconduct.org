/**
 * The single place personnel field exposure is decided.
 *
 * Every read of a personnel table that feeds a published page goes through the
 * column list here instead of `select *`. A column suppressed by the contract
 * is never fetched, so it cannot reach a template, a schema.org graph, a
 * `data-` attribute, or an inline prefill payload.
 *
 * Nothing here withholds a page or a row. Suppression drops one field from the
 * select list; every personnel and agency page renders and publishes exactly as
 * before, minus that field.
 *
 * Suppressed fields are omitted, never replaced with a placeholder. Rendering
 * "Not publicly listed" asserts the record was checked and found empty, which
 * is a claim we cannot source.
 *
 * Two layers, and the difference matters:
 *
 * - **The select list** (`projection`, `assertNoSuppressedColumns`) keeps a
 *   suppressed *column* out of the process entirely.
 * - **The cited projection** (`citeRow`, `projectedText`) decides per *value*
 *   whether it may render, and attaches the citation it renders with. In
 *   `enforce` mode a value with no citation is not returned at all, so a
 *   template cannot render it by accident.
 *
 * The contract both layers read is `field-suppression.v3.json`. It is data, not
 * code, so a policy change is reviewable as a diff by someone who does not read
 * TypeScript.
 */

import { evaluateField, suppressedColumnReasons } from "./field-suppression.js";
import { enforcementMode, resolveRowProvenance } from "./provenance-ledger.js";
import { toCitation } from "./provenance.js";

/**
 * @typedef {import("./provenance.js").Citation} Citation
 * @typedef {import("./provenance.js").SourceKind} SourceKind
 * @typedef {import("./provenance.js").Withheld} Withheld
 * @typedef {import("./provenance-ledger.js").RowProvenance} RowProvenance
 */

/**
 * Columns a published page may read from `public.agency_personnel`.
 *
 * @type {readonly string[]}
 */
export const AGENCY_PERSONNEL_COLUMNS = Object.freeze([
  "id",
  "agency_id",
  "personnel_id",
  "title",
  "badge_number",
  "license_id",
  "start_date",
  "end_date",
]);

/**
 * Columns a published page may read from `public.personnel`.
 *
 * The identity columns are here because they are what the pages publish; being
 * listed is permission to *fetch*, not permission to render. Whether a value
 * reaches the reader is `citeRow`'s decision.
 *
 * @type {readonly string[]}
 */
export const PERSONNEL_COLUMNS = Object.freeze([
  "id",
  "slug",
  "prefix",
  "first_name",
  "middle_name",
  "last_name",
  "suffix",
  "deceased_on",
  "deceased_message",
  "deceased_source",
  "created_at",
  "updated_at",
]);

/**
 * Provenance columns read when the schema carries them.
 *
 * None of these exist in production today — `provenance`, `citation`,
 * `retrieved_at`, `attribution` and `evidence` occur zero times across every
 * migration. They are listed so that the day the additive migrations on INS-5
 * land, the reads pick them up without a second change, and so the names are
 * decided once here rather than three times at three call sites.
 *
 * @type {readonly string[]}
 */
export const PROVENANCE_COLUMNS = Object.freeze([
  "provenance_dataset_id",
  "provenance_source_name",
  "provenance_records_request_id",
  "provenance_source_url",
  "provenance_retrieved_at",
  "provenance_content_sha256",
  "identity_match_method",
]);

/**
 * Fields withheld from every published page by the suppression contract.
 *
 * Keyed by `table.column`. Derived from `field-suppression.v3.json` so there is
 * one list, not two that drift.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const SUPPRESSED_COLUMNS = Object.freeze(suppressedColumnReasons());

/** @type {Readonly<Record<string, readonly string[]>>} */
const columnsFor = Object.freeze({
  agency_personnel: AGENCY_PERSONNEL_COLUMNS,
  personnel: PERSONNEL_COLUMNS,
});

/**
 * @param {string} table Table name.
 * @returns {readonly string[]} Every column the projection knows about.
 */
const knownColumns = (table) => {
  const columns = columnsFor[table];
  if (!columns) {
    throw new Error(
      `No personnel projection is defined for table ${table}. Add its columns to personnel-projection.js before reading it on a published page.`,
    );
  }
  return columns;
};

/**
 * True when `table.column` is withheld from published pages.
 *
 * @param {string} table Table name.
 * @param {string} column Column name.
 * @returns {boolean} Whether the column is suppressed.
 */
export const isSuppressed = (table, column) =>
  Object.hasOwn(SUPPRESSED_COLUMNS, `${table}.${column}`);

/**
 * The columns of `table` published pages may read, in declaration order.
 *
 * @param {string} table Table name.
 * @returns {string[]} Publishable columns.
 */
export const publishableColumns = (table) =>
  knownColumns(table).filter((column) => !isSuppressed(table, column));

/**
 * SQL select list for `table`, qualified by `alias`, with suppressed columns
 * omitted. Use in place of `select *` on every published personnel read.
 *
 * Provenance columns are not included: they do not exist in the schema yet and
 * naming them would break every read. `projectionWithProvenance` is the call to
 * switch to once the migrations land.
 *
 * @param {string} table Table name.
 * @param {string} alias SQL alias for the table.
 * @returns {string} Select list.
 */
export const projection = (table, alias) =>
  publishableColumns(table)
    .map((column) => `${alias}.${column}`)
    .join(", ");

/**
 * The same select list plus the provenance columns.
 *
 * Only safe against a database whose schema carries them. Kept separate rather
 * than feature-flagged inside `projection` so that the two cases are visible at
 * the call site instead of depending on an environment variable.
 *
 * @param {string} table Table name.
 * @param {string} alias SQL alias for the table.
 * @returns {string} Select list including provenance columns.
 */
export const projectionWithProvenance = (table, alias) =>
  [...publishableColumns(table), ...PROVENANCE_COLUMNS]
    .map((column) => `${alias}.${column}`)
    .join(", ");

/**
 * Fail the build if a suppressed column reached a row.
 *
 * `projection()` prevents this for the reads it owns. This catches the case it
 * cannot own: a hand-written join that reintroduces `select *` or `ao.*`.
 *
 * @param {string} table Table name.
 * @param {readonly Record<string, unknown>[]} rows Rows that came back.
 * @returns {void}
 */
export const assertNoSuppressedColumns = (table, rows) => {
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

/**
 * One value as the page is allowed to have it.
 *
 * `uncited` is reachable only in `report` enforcement mode, and it exists so
 * that the gap is visible in the type system and on the page instead of being
 * invisible. In `enforce` mode an uncited value is absent from the projection
 * and a template has nothing to render.
 *
 * @template T
 * @typedef {{kind: "cited", value: T, citation: Citation, disclosures: readonly string[]} | {kind: "uncited", value: T, ruleId: string, reason: string}} ProjectedValue
 */

/**
 * @typedef {object} CitedRow
 * @property {string} table Table the row came from.
 * @property {string | null} slug The row's published slug, when it has one.
 * @property {RowProvenance} provenance What can be cited for the row.
 * @property {Readonly<Record<string, ProjectedValue<unknown>>>} values Values the page may render, keyed by column.
 * @property {readonly Withheld[]} withheld Values withheld, with the rule that withheld them. Never rendered.
 * @property {boolean} rowWithheld True when the whole row failed a rule, not just one field.
 */

/**
 * @param {unknown} value Raw column value.
 * @returns {boolean} Whether there is nothing to publish.
 */
const isEmptyValue = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim() === "");

/**
 * Decide, field by field, what one row may publish.
 *
 * The order is deliberate. Provenance is resolved first, because the class it
 * produces is an input to the suppression rules; then each value is evaluated;
 * then a citation is attached only if the attestation actually covers that
 * field. The last step is what stops a dataset being cited for a column it
 * never contained — which is how badge number stays uncitable to a production
 * with no badge column, even if someone writes the dataset id onto the row.
 *
 * @param {string} table Table the row came from.
 * @param {Record<string, unknown>} row The row.
 * @param {{slug?: string | null, columns?: readonly string[]}} [options] Slug override and column subset.
 * @returns {CitedRow} What the page may render.
 */
export const citeRow = (table, row, options = {}) => {
  const enforceProvenanceRules = enforcementMode() === "enforce";
  const provenance = resolveRowProvenance(table, row);
  const slug =
    options.slug !== undefined
      ? options.slug
      : typeof row.slug === "string"
        ? row.slug
        : null;
  const columns = options.columns || publishableColumns(table);
  /** @type {Record<string, ProjectedValue<unknown>>} */
  const values = {};
  /** @type {Withheld[]} */
  const withheld = [];
  let rowWithheld = false;

  for (const column of columns) {
    if (!Object.hasOwn(row, column)) {
      continue;
    }
    const value = row[column];
    if (isEmptyValue(value)) {
      continue;
    }
    const decision = evaluateField({
      table,
      column,
      value,
      slug,
      provenanceClass: provenance.provenanceClass,
      identityConfidence: provenance.identityConfidence,
      enforceProvenanceRules,
    });
    if (decision.kind === "withhold") {
      withheld.push(
        Object.freeze({
          table,
          column,
          reason: decision.reason,
          ruleId: decision.ruleId,
          provenanceClass: provenance.provenanceClass,
        }),
      );
      if (decision.scope === "row") {
        rowWithheld = true;
      }
      continue;
    }
    const attestation = provenance.attestation;
    const coversField =
      attestation !== null &&
      (attestation.fields.length === 0 ||
        attestation.fields.includes(`${table}.${column}`));
    if (!attestation || !coversField) {
      const reason = attestation
        ? `Dataset ${attestation.datasetId} does not source ${table}.${column}, so it cannot be cited for it.`
        : `No attestation covers ${table}.${column} for this row.`;
      if (enforceProvenanceRules) {
        withheld.push(
          Object.freeze({
            table,
            column,
            reason,
            ruleId: "no-established-channel",
            provenanceClass: provenance.provenanceClass,
          }),
        );
        continue;
      }
      values[column] = {
        kind: "uncited",
        value,
        ruleId: "no-established-channel",
        reason,
      };
      continue;
    }
    values[column] = {
      kind: "cited",
      value,
      citation: toCitation(
        attestation,
        provenance.identityConfidence,
        provenance.provenanceClass,
      ),
      disclosures: decision.disclosures,
    };
  }

  if (rowWithheld) {
    for (const [column, projected] of Object.entries(values)) {
      withheld.push(
        Object.freeze({
          table,
          column,
          reason:
            "A row-scoped suppression rule fired, so no field of this row may be attributed to its source.",
          ruleId:
            projected.kind === "cited"
              ? "identity-collision-risk"
              : projected.ruleId,
          provenanceClass: provenance.provenanceClass,
        }),
      );
      delete values[column];
    }
  }

  return {
    table,
    slug,
    provenance,
    values: Object.freeze(values),
    withheld: Object.freeze(withheld),
    rowWithheld,
  };
};

/**
 * A projected string value, or `null` when the page may not render it.
 *
 * @param {CitedRow} cited Row as projected.
 * @param {string} column Column to read.
 * @returns {ProjectedValue<string> | null} The value and how it may render.
 */
export const projectedText = (cited, column) => {
  const projected = cited.values[column];
  if (!projected) {
    return null;
  }
  return /** @type {ProjectedValue<string>} */ ({
    ...projected,
    value: String(projected.value),
  });
};

/**
 * The raw value when the page may render it, else `null`.
 *
 * @param {CitedRow} cited Row as projected.
 * @param {string} column Column to read.
 * @returns {unknown} The value, or null.
 */
export const projectedValue = (cited, column) => {
  const projected = cited.values[column];
  return projected ? projected.value : null;
};

/**
 * The origin kind of a row's values, for the roster-versus-submitted treatment.
 *
 * @param {CitedRow} cited Row as projected.
 * @returns {SourceKind | null} Source kind, or null when nothing is established.
 */
export const rowSourceKind = (cited) =>
  cited.provenance.attestation?.sourceKind || null;
