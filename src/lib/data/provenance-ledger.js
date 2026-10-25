/**
 * Where a row's citation comes from.
 *
 * Two load paths exist for this corpus and the issue asks the design to be
 * correct under both, so the resolver prefers in-row provenance and falls back
 * to a ledger file:
 *
 * 1. **Pipeline branch (`intake`).** Loaders write provenance onto the row
 *    itself — dataset id, retrieval date, content hash, match method. When
 *    those columns are present the row carries its own citation and no ledger
 *    is consulted. This is the branch the additive migrations on INS-5 build,
 *    and it is the one that will be true after the next load.
 * 2. **Transitional branch (`seed.sql`), which is production today.** No
 *    provenance columns exist in the schema at all. The citation has to come
 *    from outside the row, and the only per-row evidence that exists is the
 *    TCOLE identity map — `PUBLIC_GUID -> public.personnel.id`, recorded when
 *    the production was loaded. `scripts/build-provenance-ledger.mjs` turns
 *    that map plus the hash-verified workbook into the ledger this module
 *    reads.
 *
 * **Assumed branch for this change: the transitional one.** It is what the
 * deployed build reads, so it is the branch that decides what a reader sees
 * tonight. The in-row path is implemented and tested, and takes precedence
 * automatically the moment the columns appear.
 *
 * A row neither path covers gets no attestation, classifies as
 * `not_traceable`, and its fields are withheld. Default-deny is the point: a
 * row nobody told us about fails closed.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import attestationsFile from "./provenance-attestations.json" with { type: "json" };
import { classify } from "./provenance.js";
import { capClass } from "./field-suppression.js";

/**
 * @typedef {import("./provenance.js").Attestation} Attestation
 * @typedef {import("./provenance.js").IdentityConfidence} IdentityConfidence
 * @typedef {import("./provenance.js").ProvenanceClass} ProvenanceClass
 */

/** @type {{version: number, attestations: Attestation[]}} */
const registry = /** @type {any} */ (attestationsFile);

const attestationsById = new Map(
  registry.attestations.map((entry) => [entry.datasetId, entry]),
);

/**
 * The attestation for a dataset identifier, or `null` when unknown.
 *
 * @param {string} datasetId Dataset identifier.
 * @returns {Attestation | null} The attestation.
 */
export const attestationFor = (datasetId) =>
  attestationsById.get(datasetId) || null;

/**
 * Every attestation in the registry, in file order.
 *
 * @returns {readonly Attestation[]} The registry.
 */
export const allAttestations = () => registry.attestations;

/**
 * Whether provenance rules withhold fields, or only report on them.
 *
 * `enforce` is where this has to end up: an uncited field must not reach a
 * page. It is not the default yet for one measured reason. The ledger keys on
 * `public.personnel.id` values recorded when the production was loaded, and the
 * live database has been edited since without an audit trail (INS-18 rev 3
 * section 17). If the ids drifted, enforcing would withhold names on pages
 * whose agreement with the source was measured at 100% — a de facto takedown of
 * up to 129,929 pages, produced by a build flag, which is exactly what the
 * board declined to do on purpose (INS-11 section 1).
 *
 * The one measurement that closes this: ledger coverage against the database
 * the build actually reads. It needs the read-only credentials already carried
 * to the board as ask #1 on INS-11. Until then the build reports the number it
 * would have withheld, and withholds nothing on provenance grounds.
 *
 * Accuracy rules — badge, placeholders, coerced names, the epoch sentinel — are
 * enforced in both modes. They do not depend on the ledger.
 *
 * @typedef {"report" | "enforce"} EnforcementMode
 */

/**
 * The current enforcement mode.
 *
 * @returns {EnforcementMode} Mode from `PROVENANCE_ENFORCEMENT`.
 */
export const enforcementMode = () => {
  const raw = (process.env.PROVENANCE_ENFORCEMENT || "").trim().toLowerCase();
  if (raw === "enforce") {
    return "enforce";
  }
  if (raw === "" || raw === "report") {
    return "report";
  }
  throw new Error(
    `PROVENANCE_ENFORCEMENT must be "report" or "enforce", got ${raw}.`,
  );
};

const IDENTITY_CONFIDENCE_VALUES = new Set([
  "unique_name",
  "name_plus_services",
  "duplicate_order",
  "unknown",
]);

/**
 * @typedef {object} LedgerEntry
 * @property {string} datasetId Dataset the row traces to.
 * @property {IdentityConfidence} identityConfidence How the row was matched.
 */

/** @type {{loaded: boolean, path: string | null, entries: Map<string, LedgerEntry>} | null} */
let ledger = null;

/** @returns {string} Path the ledger is read from. */
const ledgerPath = () =>
  process.env.PROVENANCE_LEDGER ||
  path.join(process.cwd(), "provenance", "ledger.tsv");

/**
 * Read the ledger once.
 *
 * Format is one tab-separated record per line: `table`, row `id`, `datasetId`,
 * `identityConfidence`. Deliberately not JSON — it is a quarter of a million
 * lines, it has to be greppable by a person checking one officer's citation,
 * and a malformed line must fail loudly rather than take the whole file with
 * it.
 *
 * @returns {{loaded: boolean, path: string | null, entries: Map<string, LedgerEntry>}} The ledger.
 */
const loadLedger = () => {
  if (ledger) {
    return ledger;
  }
  const file = ledgerPath();
  /** @type {Map<string, LedgerEntry>} */
  const entries = new Map();
  /** @type {string | null} */
  let contents = null;
  try {
    contents = readFileSync(file, "utf8");
  } catch (error) {
    const code = /** @type {NodeJS.ErrnoException} */ (error).code;
    if (code !== "ENOENT") {
      throw error;
    }
  }
  if (contents === null) {
    ledger = { loaded: false, path: null, entries };
    return ledger;
  }
  let lineNumber = 0;
  for (const line of contents.split("\n")) {
    lineNumber += 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const [table, id, datasetId, identityConfidence] = trimmed.split("\t");
    if (!table || !id || !datasetId || !identityConfidence) {
      throw new Error(
        `Provenance ledger ${file} line ${lineNumber} is malformed: expected table, id, datasetId, identityConfidence.`,
      );
    }
    if (!attestationsById.has(datasetId)) {
      throw new Error(
        `Provenance ledger ${file} line ${lineNumber} cites dataset ${datasetId}, which has no attestation in provenance-attestations.json.`,
      );
    }
    if (!IDENTITY_CONFIDENCE_VALUES.has(identityConfidence)) {
      throw new Error(
        `Provenance ledger ${file} line ${lineNumber} has unknown identity confidence ${identityConfidence}.`,
      );
    }
    entries.set(`${table}:${id}`, {
      datasetId,
      identityConfidence: /** @type {IdentityConfidence} */ (
        identityConfidence
      ),
    });
  }
  ledger = { loaded: true, path: file, entries };
  return ledger;
};

/**
 * Drop the cached ledger. Tests only.
 *
 * @returns {void}
 */
export const resetLedgerCache = () => {
  ledger = null;
};

/**
 * True when a ledger file was found and read.
 *
 * @returns {boolean} Whether a ledger is loaded.
 */
export const ledgerLoaded = () => loadLedger().loaded;

/**
 * How many rows the ledger covers.
 *
 * @returns {number} Entry count.
 */
export const ledgerSize = () => loadLedger().entries.size;

/**
 * @typedef {object} RowProvenance
 * @property {Attestation | null} attestation Dataset behind the row, when one is established.
 * @property {IdentityConfidence} identityConfidence How the row was matched to the source.
 * @property {ProvenanceClass} provenanceClass Class after the contract's ceiling.
 * @property {"row" | "ledger" | "none"} origin Where the provenance was found.
 */

/**
 * @param {Record<string, unknown>} row Database row.
 * @returns {IdentityConfidence} Match tier recorded on the row.
 */
const identityConfidenceFromRow = (row) => {
  const raw = row.identity_match_method;
  if (typeof raw === "string" && IDENTITY_CONFIDENCE_VALUES.has(raw)) {
    return /** @type {IdentityConfidence} */ (raw);
  }
  return "unknown";
};

/**
 * Provenance carried on the row itself, when the schema has grown the columns.
 *
 * Reads only what a loader can attest. `provenance_retrieved_at` must be the
 * date the *source* produced the data; a loader that writes its own run time
 * there has fabricated a citation, which is why the column is read as-is and
 * never defaulted.
 *
 * @param {Record<string, unknown>} row Database row.
 * @returns {Attestation | null} Attestation from the row, or null.
 */
const attestationFromRow = (row) => {
  const datasetId = row.provenance_dataset_id;
  if (typeof datasetId !== "string" || !datasetId) {
    return null;
  }
  const known = attestationsById.get(datasetId);
  /**
   * @param {string} key Column name.
   * @returns {string | null} Non-empty string value, or null.
   */
  const asText = (key) => {
    const value = row[key];
    return typeof value === "string" && value ? value : null;
  };
  if (known) {
    const retrievedAt = asText("provenance_retrieved_at") || known.retrievedAt;
    return { ...known, retrievedAt };
  }
  const sourceName = asText("provenance_source_name");
  if (!sourceName) {
    throw new Error(
      `Row cites dataset ${datasetId}, which has no attestation in provenance-attestations.json and no provenance_source_name on the row. Register the dataset before publishing a field sourced to it.`,
    );
  }
  return {
    datasetId,
    sourceName,
    sourceKind: "agency_roster",
    recordsRequestId: asText("provenance_records_request_id"),
    sourceUrl: asText("provenance_source_url"),
    retrievedAt: asText("provenance_retrieved_at"),
    contentSha256: asText("provenance_content_sha256"),
    fields: [],
    notes: "Attested on the row by the loader that wrote it.",
  };
};

/**
 * Resolve the citation for one row of `table`.
 *
 * @param {string} table Table the row came from.
 * @param {Record<string, unknown>} row The row.
 * @returns {RowProvenance} What can be cited for it.
 */
export const resolveRowProvenance = (table, row) => {
  const fromRow = attestationFromRow(row);
  if (fromRow) {
    return {
      attestation: fromRow,
      identityConfidence: identityConfidenceFromRow(row),
      provenanceClass: capClass(classify(fromRow)),
      origin: "row",
    };
  }
  const id = row.id;
  const entry =
    typeof id === "string" ? loadLedger().entries.get(`${table}:${id}`) : null;
  if (!entry) {
    return {
      attestation: null,
      identityConfidence: "unknown",
      provenanceClass: "not_traceable",
      origin: "none",
    };
  }
  const attestation = attestationsById.get(entry.datasetId) || null;
  return {
    attestation,
    identityConfidence: entry.identityConfidence,
    provenanceClass: capClass(classify(attestation)),
    origin: "ledger",
  };
};
