/**
 * The provenance contract every published personnel field passes through.
 *
 * The rule this module exists to make structural: **a field with no citation
 * does not render.** Not by convention and not by template discipline — a
 * template cannot render what it cannot receive, and the only way to receive a
 * personnel field value is through the cited projection, which cannot produce
 * one without an attestation that survives classification and the suppression
 * rules.
 *
 * Three things this module deliberately refuses to do:
 *
 * 1. **Bulk-attribute.** An attestation covers a row because that row was
 *    resolved to a source record, one row at a time, through the identity map
 *    (see `provenance-ledger.js`). A row with no ledger entry is
 *    `not_traceable` and its fields are withheld. "Appears to trace largely to
 *    TCOLE" is not provenance, and stamping it corpus-wide would convert an
 *    acknowledged gap into a false specific claim.
 * 2. **Call something traceable that has no retrieval date.** `classify()`
 *    cannot return `traceable` without an attested retrieval date, whatever
 *    else is known. Nothing in the live corpus clears that bar today (INS-18
 *    report rev 3 section 15); the honest class is
 *    `source_and_dataset_verified`, and the citation says in those words that
 *    the retrieval date is unattested.
 * 3. **Overstate identity.** TCOLE and `public.personnel` share no key, so the
 *    row-to-row mapping is name-based. A citation carries the tier of the match
 *    that produced it, because a per-row citation that hides a name collision
 *    claims more than we measured (INS-18 section 19, 5,801 collision rows).
 */

/**
 * How a value reached us. Rendered to the reader; do not add kinds silently.
 *
 * @typedef {"public_records_request" | "agency_roster" | "court_record" | "community_submission" | "editorial"} SourceKind
 */

/**
 * What the evidence behind a value actually supports.
 *
 * - `traceable` — named source, dataset identifier, attested retrieval date.
 * - `source_and_dataset_verified` — named source, dataset identifier, verified
 *   content hash; retrieval date unattested.
 * - `source_identity_only` — a source is named, with no dataset behind it.
 * - `not_traceable` — no established channel.
 *
 * The gap between the top two classes is one field, an attested retrieval date,
 * and it is the whole distance between "we can cite this" and "we cannot".
 *
 * @typedef {"traceable" | "source_and_dataset_verified" | "source_identity_only" | "not_traceable"} ProvenanceClass
 */

/**
 * How confidently a row was matched to its source record.
 *
 * TCOLE's production and `public.personnel` share no key, so every match is
 * name-based. The tiers are the match methods the identity map recorded.
 *
 * @typedef {"unique_name" | "name_plus_services" | "duplicate_order" | "unknown"} IdentityConfidence
 */

/**
 * A dataset we can cite, and exactly what about it is attested.
 *
 * @typedef {object} Attestation
 * @property {string} datasetId Dataset identifier, e.g. `tx-tcole-2025-02-17-all-officers`.
 * @property {string} sourceName The body that produced the data, spelled as it should be read.
 * @property {SourceKind} sourceKind How the data reached us.
 * @property {string | null} recordsRequestId Records-request identifier, when the channel was a records request.
 * @property {string | null} sourceUrl Public URL for the dataset, when one exists.
 * @property {string | null} retrievedAt The date the SOURCE produced or published the data, attested by the source. `null` when we hold no attestation. The date we processed a file is not this field, and writing it here would fabricate the citation.
 * @property {string | null} contentSha256 SHA-256 of the artifact as held, recomputed and matched to a manifest.
 * @property {readonly string[]} fields `table.column` entries this dataset is capable of sourcing.
 * @property {string} notes Why this attestation reads the way it does, for the audit trail.
 */

/**
 * What a reader is told about one rendered value.
 *
 * @typedef {object} Citation
 * @property {ProvenanceClass} provenanceClass How far the evidence goes.
 * @property {string} sourceName The body that produced the data.
 * @property {SourceKind} sourceKind How the data reached us.
 * @property {string} datasetId Dataset identifier.
 * @property {string | null} recordsRequestId Records-request identifier, when one exists.
 * @property {string | null} sourceUrl Public URL, when one exists.
 * @property {string | null} retrievedAt Attested retrieval date, or `null` when none exists.
 * @property {boolean} retrievalDateAttested False whenever `retrievedAt` is null; stated, never implied.
 * @property {string | null} contentSha256 Verified hash of the artifact we hold.
 * @property {IdentityConfidence} identityConfidence How this row was matched to the source.
 */

/**
 * Why a field was withheld. Recorded for the build report, never rendered.
 *
 * @typedef {object} Withheld
 * @property {string} table Table the field belongs to.
 * @property {string} column Column withheld.
 * @property {string} reason Why, in the contract's words.
 * @property {string | null} ruleId Suppression rule that fired.
 * @property {ProvenanceClass} provenanceClass Class the row resolved to.
 */

/** @type {Readonly<Record<ProvenanceClass, number>>} */
const CLASS_RANK = Object.freeze({
  not_traceable: 0,
  source_identity_only: 1,
  source_and_dataset_verified: 2,
  traceable: 3,
});

/**
 * The class an attestation earns from what it actually attests.
 *
 * Deliberately not configurable. The load-bearing line is the retrieval-date
 * check: an attestation that names a source, names a dataset and verifies a
 * hash is still not `traceable`, because a citation without a retrieval date
 * cannot tell a reader how old the claim is.
 *
 * @param {Attestation | null} attestation Dataset attestation, or null.
 * @returns {ProvenanceClass} The class it earns.
 */
export const classify = (attestation) => {
  if (!attestation || !attestation.sourceName) {
    return "not_traceable";
  }
  if (!attestation.datasetId) {
    return "source_identity_only";
  }
  if (attestation.retrievedAt) {
    return "traceable";
  }
  if (attestation.contentSha256) {
    return "source_and_dataset_verified";
  }
  return "source_identity_only";
};

/**
 * The weakest class allowed to render a personnel field.
 *
 * `source_and_dataset_verified` renders because the alternative is withholding
 * 129,929 names whose agreement with the source production was measured at
 * 100% (INS-18 rev 3 section 15) — a coverage loss with no accuracy gain, and a
 * de facto takedown the board declined on INS-11 section 1. What that class may
 * *not* do is pretend to a retrieval date: `retrievalDateAttested` is false on
 * every one of those citations and the renderer says so in words.
 *
 * Raising this to `traceable` is the finishing move once INS-64 preserves the
 * request letter and the agency's response, and it is a one-line change here.
 *
 * @type {ProvenanceClass}
 */
export const MINIMUM_RENDERABLE_CLASS = "source_and_dataset_verified";

/**
 * True when a class is strong enough to render under current policy.
 *
 * @param {ProvenanceClass} value Class to test.
 * @returns {boolean} Whether it may render.
 */
export const isRenderableClass = (value) =>
  CLASS_RANK[value] >= CLASS_RANK[MINIMUM_RENDERABLE_CLASS];

/**
 * Compare two classes by strength. Negative when `left` is weaker.
 *
 * @param {ProvenanceClass} left Left class.
 * @param {ProvenanceClass} right Right class.
 * @returns {number} Difference in rank.
 */
export const compareClasses = (left, right) =>
  CLASS_RANK[left] - CLASS_RANK[right];

/**
 * Build the reader-facing citation for an attestation and a matched row.
 *
 * The class is passed in rather than re-derived. There is exactly one place a
 * class is computed — `resolveRowProvenance`, which applies the contract's
 * ceiling — and a citation that recomputed it would quietly disagree with the
 * decision the suppression rules were evaluated against. That disagreement is
 * the shape of bug that publishes a stronger claim than the gate allowed.
 *
 * @param {Attestation} attestation Dataset attestation.
 * @param {IdentityConfidence} identityConfidence Match tier for this row.
 * @param {ProvenanceClass} provenanceClass The class already resolved for the row.
 * @returns {Citation} The citation to render.
 */
export const toCitation = (attestation, identityConfidence, provenanceClass) =>
  Object.freeze({
    provenanceClass,
    sourceName: attestation.sourceName,
    sourceKind: attestation.sourceKind,
    datasetId: attestation.datasetId,
    recordsRequestId: attestation.recordsRequestId,
    sourceUrl: attestation.sourceUrl,
    retrievedAt: attestation.retrievedAt,
    retrievalDateAttested: Boolean(attestation.retrievedAt),
    contentSha256: attestation.contentSha256,
    identityConfidence,
  });

/**
 * Whether a value came from a record an authority keeps, or from something a
 * person told us.
 *
 * The page must not let these two look alike. A state licensing roster and an
 * anonymous web form are both "data we hold" and nothing else about them is
 * comparable.
 *
 * @param {SourceKind} kind Source kind to test.
 * @returns {boolean} True for anything a member of the public or our own staff wrote.
 */
export const isSubmittedSource = (kind) =>
  kind === "community_submission" || kind === "editorial";

/**
 * Short reader-facing label for where a value came from.
 *
 * @param {SourceKind} kind Source kind to label.
 * @returns {string} Plain-language label.
 */
export const sourceKindLabel = (kind) => {
  switch (kind) {
    case "public_records_request":
      return "Government records request";
    case "agency_roster":
      return "Official roster";
    case "court_record":
      return "Court record";
    case "community_submission":
      return "Sent in by the public";
    case "editorial":
      return "Written by our staff";
    default:
      throw new Error(`Unknown source kind ${kind}.`);
  }
};

/**
 * One sentence telling the reader how far the evidence goes.
 *
 * `source_and_dataset_verified` is the sentence that matters: it names the
 * dataset, says the copy was hash-checked, and says the retrieval date is
 * missing. Vague is survivable. Specific and wrong is not.
 *
 * @param {Citation} citation Citation to describe.
 * @returns {string} Plain-language disclosure.
 */
export const classDisclosure = (citation) => {
  switch (citation.provenanceClass) {
    case "traceable":
      return "We checked this against the records we received from the source.";
    case "source_and_dataset_verified":
      return "We matched this to the exact records file we received. We do not have a dated receipt from the source, so we cannot say when the source produced it.";
    case "source_identity_only":
      return "We know which organization this came from, but not which records release.";
    case "not_traceable":
      return "We cannot show where this came from.";
    default:
      throw new Error(`Unknown provenance class ${citation.provenanceClass}.`);
  }
};

/**
 * Extra sentence when the row-to-source match is not certain.
 *
 * Returns `null` for `unique_name`, which needs no caveat.
 *
 * @param {Citation} citation Citation to describe.
 * @returns {string | null} Plain-language caveat, or null.
 */
export const identityDisclosure = (citation) => {
  switch (citation.identityConfidence) {
    case "unique_name":
      return null;
    case "name_plus_services":
      return "More than one person in the source records shares this name. We matched this record using their work history.";
    case "duplicate_order":
      return "More than one person in the source records shares this name, and we cannot tell which one this record belongs to.";
    case "unknown":
      return "We do not have a record of how this profile was matched to the source records.";
    default:
      throw new Error(
        `Unknown identity confidence ${citation.identityConfidence}.`,
      );
  }
};
