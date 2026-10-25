/**
 * Name-quality rules for published personnel records.
 *
 * We publish claims about named human beings, so a name field that carries a
 * source placeholder, a test fixture, or a language literal is not a cosmetic
 * defect -- it is a false statement about a person. This module is the single
 * place those rules live, so that page generation, listings, and the build gate
 * cannot disagree about what is publishable.
 *
 * Two deliberate design constraints, both learned from the live TCOLE corpus:
 *
 * 1. Rules are scoped PER FIELD, never applied to a whole record. `Null`,
 *    `None`, `True`, `Sample`, `Tester` and `Officer` are all real surnames
 *    held by real officers in the corpus, and `Na` is a real name component.
 *    A token-based sweep across every field would unpublish 25+ real people.
 *    Only the suffix field has a genuinely closed vocabulary, so only the
 *    suffix field gets an allow-list.
 *
 * 2. Ambiguity is reported, never resolved. Where a value could plausibly be
 *    either a real name or a source placeholder, the record publishes and the
 *    value is flagged for confirmation against the source agency. Guessing
 *    would substitute our inference for a public record.
 *
 * @see scripts/verify-name-quality.mjs for the build-time gate.
 */

/**
 * Suffixes we will render. Generational suffixes are a closed set in practice,
 * which is what makes an allow-list safe here and unsafe on any other field.
 * Anything outside this set is withheld from the displayed name and reported,
 * rather than printed verbatim.
 */
const RENDERABLE_SUFFIXES = new Set([
  "jr",
  "jr.",
  "sr",
  "sr.",
  "i",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "vii",
  "viii",
  "ix",
  "x",
]);

/**
 * Given names that identify a test fixture rather than a person. Kept to values
 * that are not plausible given names in any naming tradition we serve.
 *
 * Note what is NOT here: `Test` and `Tester` as SURNAMES. Both are real
 * surnames in the corpus, held by officers at real agencies. A fixture whose
 * surname is `Test` is excluded by its fixture agency instead -- see
 * FIXTURE_AGENCY_SLUGS.
 */
const FIXTURE_GIVEN_NAMES = new Set([
  "test",
  "tester",
  "testing",
  "testuser",
  "user",
  "demo",
  "dummy",
  "example",
  "placeholder",
  "asdf",
  "qwerty",
  "foo",
  "bar",
  "baz",
  "xxx",
]);

/**
 * Agencies that exist only as test fixtures. Every person attached to one is a
 * fixture regardless of how ordinary their name looks, which is how we exclude
 * a fixture whose surname is a real surname, without having to decide whether it
 * is their real surname.
 *
 * Add an entry only with evidence that the agency is not real -- no ORI, a
 * placeholder address, and a roster made up entirely of fixtures.
 */
const FIXTURE_AGENCY_SLUGS = new Set(["central-texas-police-dept-04ebcf"]);

/**
 * Values that are in-band placeholders in at least one source dataset AND are
 * also real surnames. These never cause a withhold; they are reported so the
 * true value can be confirmed with the source agency.
 */
const AMBIGUOUS_NAME_LITERALS = new Set([
  "null",
  "none",
  "true",
  "false",
  "na",
  "n/a",
  "nan",
  "nil",
]);

/** @param {unknown} value */
const text = (value) => (typeof value === "string" ? value.trim() : "");

/** A value with no letters in it is not a name component. */
const hasNoLetters = (value) => value.length > 0 && !/\p{Letter}/u.test(value);

/** Distinguishes "155" from "-": a number asserts something, punctuation does not. */
const hasDigit = (value) => /\p{Number}/u.test(value);

/**
 * @typedef {object} PersonNameFields
 * @property {unknown} [prefix]
 * @property {unknown} [first_name]
 * @property {unknown} [middle_name]
 * @property {unknown} [last_name]
 * @property {unknown} [suffix]
 * @property {unknown} [slug]
 */

/**
 * @typedef {object} NameQualityFinding
 * @property {"withhold"|"review"} action
 * @property {string} rule
 * @property {string} field
 * @property {string} detail
 */

/**
 * @typedef {object} NameQualityResult
 * @property {boolean} publishable  false when no page may be generated
 * @property {string} displayName   the name safe to render (empty if withheld)
 * @property {NameQualityFinding[]} findings
 */

/**
 * Classify a personnel row's name fields.
 *
 * @param {PersonNameFields} fields
 * @param {{agencySlugs?: readonly string[]}} [context] employing agency slugs
 * @returns {NameQualityResult}
 */
export const classifyPersonName = (fields, context = {}) => {
  /** @type {NameQualityFinding[]} */
  const findings = [];
  const prefix = text(fields.prefix);
  const first = text(fields.first_name);
  const middle = text(fields.middle_name);
  const last = text(fields.last_name);
  const suffix = text(fields.suffix);

  const withhold = (rule, field, detail) => {
    findings.push({ action: "withhold", rule, field, detail });
  };
  const review = (rule, field, detail) => {
    findings.push({ action: "review", rule, field, detail });
  };

  // Rule: a fixture agency's roster is entirely fixtures.
  for (const slug of context.agencySlugs ?? []) {
    if (FIXTURE_AGENCY_SLUGS.has(String(slug))) {
      withhold("fixture-agency", "agency", `agency ${slug} is a test fixture`);
    }
  }

  // Rule: we cannot identify a human without both a given name and a surname.
  // A blank surname is how a source's literal "NULL" reaches us after the
  // loader reads it as absence, so this is also the null-literal backstop.
  if (!first) {
    withhold("missing-identity-field", "first_name", "given name is empty");
  }
  if (!last) {
    withhold("missing-identity-field", "last_name", "surname is empty");
  }

  // Rule: a name component with no letters in it is not a name. The two cases
  // are not equally serious, and treating them the same would unpublish real
  // officers:
  //
  //   - A component containing a digit ("9", "155") asserts something false
  //     about the person. In an identity field we also no longer know who the
  //     record is about, so the record is withheld.
  //   - A component that is only punctuation ("-", "'", ".", "`") is a source
  //     artifact in a real person's record -- typically a hyphenated surname
  //     split across two fields, or an apostrophe given name. Those officers
  //     are real, so the component is dropped from the rendered name and
  //     flagged. We do not rejoin the parts, because whether the true name
  //     hyphenates or spaces the two halves is a question for the source.
  const dropped = new Set();
  for (const [field, value] of [
    ["prefix", prefix],
    ["first_name", first],
    ["middle_name", middle],
    ["last_name", last],
  ]) {
    if (!hasNoLetters(value)) {
      continue;
    }
    if (hasDigit(value) && (field === "first_name" || field === "last_name")) {
      withhold(
        "numeric-identity-field",
        field,
        `${field} is ${JSON.stringify(value)}, which does not identify a person`,
      );
      continue;
    }
    dropped.add(field);
    review(
      "non-name-component",
      field,
      `${field} is ${JSON.stringify(value)}; dropped from the rendered name, true form needs source confirmation`,
    );
  }

  // Rule: reserved fixture given names.
  if (FIXTURE_GIVEN_NAMES.has(first.toLowerCase())) {
    withhold(
      "fixture-given-name",
      "first_name",
      `given name ${JSON.stringify(first)} is a fixture marker`,
    );
  }

  // Rule: suffix is a closed vocabulary. Anything else is withheld from the
  // rendered name but does not withhold the person, because the rest of the
  // name is still public-record data.
  let renderSuffix = "";
  if (suffix) {
    if (RENDERABLE_SUFFIXES.has(suffix.toLowerCase())) {
      renderSuffix = suffix;
    } else {
      review(
        "unrecognized-suffix",
        "suffix",
        `suffix ${JSON.stringify(suffix)} is not a generational suffix; not rendered`,
      );
    }
  }

  // Report-only: values that are both a real surname and a source placeholder.
  for (const [field, value] of [
    ["first_name", first],
    ["middle_name", middle],
    ["last_name", last],
  ]) {
    if (AMBIGUOUS_NAME_LITERALS.has(value.toLowerCase())) {
      review(
        "ambiguous-name-literal",
        field,
        `${JSON.stringify(value)} is both a real surname and a source placeholder; confirm with the source agency`,
      );
    }
  }

  const publishable = !findings.some((f) => f.action === "withhold");
  const displayName = publishable
    ? [
        dropped.has("prefix") ? "" : prefix,
        dropped.has("first_name") ? "" : first,
        dropped.has("middle_name") ? "" : middle,
        dropped.has("last_name") ? "" : last,
        renderSuffix,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return { publishable, displayName, findings };
};

/**
 * The displayed name for a personnel row, with unrenderable parts removed.
 * Returns an empty string when the record is not publishable at all, so a
 * caller that forgets to check `publishable` renders nothing rather than a
 * placeholder.
 *
 * @param {PersonNameFields} fields
 * @param {{agencySlugs?: readonly string[]}} [context]
 * @returns {string}
 */
export const formatPersonName = (fields, context) =>
  classifyPersonName(fields, context).displayName;

/**
 * @param {PersonNameFields} fields
 * @param {{agencySlugs?: readonly string[]}} [context]
 * @returns {boolean}
 */
export const isPublishablePerson = (fields, context) =>
  classifyPersonName(fields, context).publishable;

/**
 * The suffix, if it is one we will render, otherwise an empty string.
 *
 * For callers that format a name in some shape other than first-to-last --
 * roster cards use "Last, First Suffix" -- so that they can apply the suffix
 * rule without reimplementing it.
 *
 * @param {unknown} suffix
 * @returns {string}
 */
export const renderableSuffix = (suffix) => {
  const value = text(suffix);
  return RENDERABLE_SUFFIXES.has(value.toLowerCase()) ? value : "";
};

export const nameQualityRules = Object.freeze({
  RENDERABLE_SUFFIXES,
  FIXTURE_GIVEN_NAMES,
  FIXTURE_AGENCY_SLUGS,
  AMBIGUOUS_NAME_LITERALS,
});
