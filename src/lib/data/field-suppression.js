/**
 * The suppression contract, evaluated.
 *
 * `field-suppression.v3.json` is the contract; this file is the only thing that
 * reads it. Every rule in it is one of a small number of shapes, and each shape
 * is handled here explicitly — an unrecognised shape throws rather than being
 * skipped, because a suppression rule that silently does nothing is worse than
 * no rule at all.
 *
 * The rules divide into two kinds, and the distinction decides what the build
 * is allowed to do with them:
 *
 * - **Provenance rules** withhold a field because we cannot show where it came
 *   from (`no-established-channel`, `retrieval-date-missing`).
 * - **Accuracy rules** withhold a field because the value is wrong about a
 *   named person even though its lineage is perfect
 *   (`source-placeholder-as-data`, `name-literal-coercion`,
 *   `epoch-sentinel-start-date`, `traceable-but-not-correct`, both badge
 *   rules).
 *
 * Accuracy rules are enforced unconditionally. Provenance rules follow the
 * ledger's measured coverage — see `enforcementMode` in
 * `provenance-ledger.js`.
 */

import contract from "./field-suppression.v3.json" with { type: "json" };
import { compareClasses, isRenderableClass } from "./provenance.js";

/**
 * @typedef {import("./provenance.js").ProvenanceClass} ProvenanceClass
 * @typedef {import("./provenance.js").IdentityConfidence} IdentityConfidence
 */

/**
 * @typedef {object} SuppressionRule
 * @property {string} id Rule identifier, stable across revisions.
 * @property {"suppress_field" | "quarantine_row" | "cap_class" | "disclose"} action What firing does.
 * @property {Record<string, any>} match The shape that decides when it fires.
 * @property {ProvenanceClass} [capAt] Ceiling class, for `cap_class`.
 * @property {string} reason Why, in the contract's words. Recorded, not rendered.
 * @property {string} evidence Where the measurement behind the rule lives.
 * @property {string} decidedBy Who decided it.
 */

/**
 * @typedef {object} SuppressionContract
 * @property {number} version Contract revision.
 * @property {string} title Human-readable title.
 * @property {string} reconstructedFrom Where the contract came from.
 * @property {string} enforcementPoint Where it is enforced.
 * @property {string[]} insufficientEnforcementPoints Places that look like enforcement and are not.
 * @property {string} defaultForUncitedFields What happens to a field with no citation.
 * @property {SuppressionRule[]} rules The rules.
 */

/** @type {SuppressionContract} */
export const SUPPRESSION_CONTRACT = /** @type {any} */ (contract);

/** Rules that withhold a value because it is wrong, not because it is uncited. */
const ACCURACY_RULE_IDS = new Set([
  "badge-number-unsourceable",
  "badge-number-in-prose",
  "source-placeholder-as-data",
  "name-literal-coercion",
  "epoch-sentinel-start-date",
  "traceable-but-not-correct",
]);

/**
 * True when the rule withholds for accuracy and is enforced unconditionally.
 *
 * @param {string} ruleId Rule identifier.
 * @returns {boolean} Whether the rule is an accuracy rule.
 */
export const isAccuracyRule = (ruleId) => ACCURACY_RULE_IDS.has(ruleId);

/**
 * `table.column` entries withheld from every published page by a column rule.
 *
 * This is the select-list input: these columns are never fetched, so no join,
 * payload or structured-data graph can reintroduce them.
 *
 * @returns {Readonly<Record<string, string>>} Reason keyed by `table.column`.
 */
export const suppressedColumnReasons = () => {
  /** @type {Record<string, string>} */
  const entries = {};
  for (const rule of SUPPRESSION_CONTRACT.rules) {
    if (rule.action !== "suppress_field" || rule.match.kind !== "column") {
      continue;
    }
    for (const field of rule.match.fields) {
      entries[field] = `${rule.id}: ${rule.reason}`;
    }
  }
  return Object.freeze(entries);
};

/**
 * The strongest class the contract permits, whatever an attestation claims.
 *
 * @returns {ProvenanceClass} The ceiling.
 */
export const classCeiling = () => {
  /** @type {ProvenanceClass} */
  let ceiling = "traceable";
  for (const rule of SUPPRESSION_CONTRACT.rules) {
    if (rule.action !== "cap_class") {
      continue;
    }
    const capAt = rule.capAt;
    if (!capAt) {
      throw new Error(
        `Suppression rule ${rule.id} has action cap_class with no capAt class.`,
      );
    }
    if (compareClasses(capAt, ceiling) < 0) {
      ceiling = capAt;
    }
  }
  return ceiling;
};

/**
 * Apply the contract's class ceiling to a classification.
 *
 * @param {ProvenanceClass} value Class an attestation earned.
 * @returns {ProvenanceClass} The class the contract permits.
 */
export const capClass = (value) =>
  compareClasses(value, classCeiling()) > 0 ? classCeiling() : value;

/**
 * @param {unknown} value Raw column value.
 * @returns {string} Lowercased, trimmed token form.
 */
const normalizeToken = (value) => String(value).trim().toLowerCase();

/** @type {Map<string, RegExp>} */
const compiledPatterns = new Map();

/**
 * @param {SuppressionRule} rule Rule being evaluated.
 * @returns {RegExp} Compiled narrative pattern.
 */
const patternFor = (rule) => {
  const key = `${rule.id}:${rule.match.pattern}:${rule.match.flags || ""}`;
  const existing = compiledPatterns.get(key);
  if (existing) {
    return existing;
  }
  const compiled = new RegExp(rule.match.pattern, rule.match.flags || "");
  compiledPatterns.set(key, compiled);
  return compiled;
};

/**
 * @typedef {object} FieldContext
 * @property {string} table Table being read.
 * @property {string} column Column being considered.
 * @property {unknown} value The value as the database holds it.
 * @property {string | null} [slug] Row slug, when the row backs a published URL.
 * @property {ProvenanceClass} provenanceClass Class the row resolved to.
 * @property {IdentityConfidence} identityConfidence Match tier for the row.
 * @property {boolean} enforceProvenanceRules False while ledger coverage is unmeasured. Accuracy rules ignore it.
 */

/**
 * @typedef {{kind: "render", disclosures: string[]} | {kind: "withhold", ruleId: string, reason: string, scope: "field" | "row"}} FieldDecision
 */

/**
 * @param {string[]} fields Rule's field list.
 * @param {string} table Table being read.
 * @param {string} column Column being considered.
 * @returns {boolean} Whether the rule covers this field.
 */
const appliesToField = (fields, table, column) =>
  fields.includes(`${table}.${column}`);

/**
 * Decide whether one field value may render.
 *
 * Returns `withhold` on the first rule that fires, so the recorded reason is
 * the strongest statement available about why the reader is not seeing it.
 *
 * @param {FieldContext} context What is known about the field.
 * @returns {FieldDecision} The decision.
 */
export const evaluateField = (context) => {
  const { table, column, value, slug, identityConfidence } = context;
  /** @type {string[]} */
  const disclosures = [];

  for (const rule of SUPPRESSION_CONTRACT.rules) {
    const enforced = context.enforceProvenanceRules || isAccuracyRule(rule.id);
    const match = rule.match;
    const scope = rule.action === "quarantine_row" ? "row" : "field";

    switch (match.kind) {
      case "column": {
        if (enforced && appliesToField(match.fields, table, column)) {
          return {
            kind: "withhold",
            ruleId: rule.id,
            reason: rule.reason,
            scope,
          };
        }
        break;
      }
      case "value_token": {
        if (
          enforced &&
          appliesToField(match.fields, table, column) &&
          value !== null &&
          value !== undefined &&
          match.tokens.includes(normalizeToken(value))
        ) {
          return {
            kind: "withhold",
            ruleId: rule.id,
            reason: rule.reason,
            scope,
          };
        }
        break;
      }
      case "value_equals": {
        if (
          enforced &&
          appliesToField(match.fields, table, column) &&
          value !== null &&
          value !== undefined &&
          match.values.includes(String(value).trim())
        ) {
          return {
            kind: "withhold",
            ruleId: rule.id,
            reason: rule.reason,
            scope,
          };
        }
        break;
      }
      case "narrative_pattern": {
        if (
          enforced &&
          appliesToField(match.fields, table, column) &&
          typeof value === "string" &&
          patternFor(rule).test(value)
        ) {
          return {
            kind: "withhold",
            ruleId: rule.id,
            reason: rule.reason,
            scope,
          };
        }
        break;
      }
      case "uncited": {
        if (enforced && !isRenderableClass(context.provenanceClass)) {
          return {
            kind: "withhold",
            ruleId: rule.id,
            reason: rule.reason,
            scope,
          };
        }
        break;
      }
      case "row_enumeration": {
        if (
          enforced &&
          appliesToField(match.fields, table, column) &&
          slug &&
          match.slugs.includes(slug)
        ) {
          return {
            kind: "withhold",
            ruleId: rule.id,
            reason: rule.reason,
            scope,
          };
        }
        break;
      }
      case "identity_confidence": {
        if (match.suppress.includes(identityConfidence)) {
          return {
            kind: "withhold",
            ruleId: rule.id,
            reason: rule.reason,
            scope: "row",
          };
        }
        if (match.disclose.includes(identityConfidence)) {
          disclosures.push(rule.id);
        }
        break;
      }
      case "provenance_class": {
        // Enforced in classify() and capClass(), not per field.
        break;
      }
      default: {
        throw new Error(
          `Suppression contract rule ${rule.id} has an unrecognised match shape ${String(match.kind)}.`,
        );
      }
    }
  }

  return { kind: "render", disclosures };
};
