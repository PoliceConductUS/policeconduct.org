/**
 * Whether a value in the `cause_number` slot identifies a court record.
 *
 * `public.civil_cases.cause_number` is `NOT NULL`. Some cases have no docket to
 * put there — a pre-litigation settlement was never filed, and for several filed
 * cases the docket was never captured — so the loader manufactures a value from
 * the caption and the year. INS-18 §11 measured 17 of 102 published
 * person-to-lawsuit associations carrying such a value, across 9 distinct cases.
 * Six of the nine pair a manufactured docket with a real, named federal court,
 * which is the most misleading combination available: the court is checkable, so
 * the pair reads as a citation, and the docket resolves to nothing.
 *
 * So the rule is an allowlist, not a blocklist. A value is published only when
 * its shape is one a court actually issues. Anything else is withheld, because
 * the cost of publishing a fabricated identifier is far higher than the cost of
 * withholding a real one whose shape we do not yet recognize.
 *
 * Suppressed values are replaced with `null`, never with a placeholder. "Not
 * listed" or "—" would assert the record was checked and found empty, which is a
 * claim we cannot source (AGENTS.md, Templates/Critical Fields).
 *
 * Enforcement is in `src/lib/db.js`, so every read is covered including
 * `select *` and including reads whose only published surface is an inline UGC
 * prefill payload. Cohort B is the proof that template guards are not enough:
 * the association is published *only* through those payloads, where no template
 * conditional runs.
 */

/**
 * @typedef {"absent"
 *   | "federal_docket"
 *   | "state_docket"
 *   | "synthetic_placeholder"
 *   | "unrecognized"} CauseNumberKind
 */

/** Federal docket: office number, two-digit year, case type, sequence. */
const FEDERAL_DOCKET = /^\d{1,2}:\d{2}-[a-z]{2,5}-\d{3,6}(?:-[a-z]{1,5})*$/i;

/** Characters a docket number is made of. Anything else is not one. */
const DOCKET_CHARACTERS = /^[a-z0-9][a-z0-9 ./:-]*$/i;

/**
 * The loader's placeholder shape: upper-case words from the case caption and
 * the place, then the year. `GRAY-BALTIMORE-2015`, `DIALLO-NYC-2000`.
 *
 * Checked before the state-docket rule, and redundant with it for every value
 * INS-18 measured. It stays because naming the generator shape explicitly is
 * what lets the build gate report *why* a value was withheld.
 */
const CAPTION_YEAR_PLACEHOLDER =
  /^[a-z][a-z.'’]*(?:[ -][a-z.'’]+)*-(?:19|20)\d{2}$/;

/** @param {string} run */
const isYearLike = (run) => run.length === 4 && /^(?:19|20)/.test(run);

/**
 * A court identifier carries a filing sequence, not just a year — a court has
 * to tell apart the cases filed in the same year. `20-CI-003134` and
 * `CVH-20230069` do; `GRAY-BALTIMORE-2015` does not, and that absence is what
 * distinguishes the manufactured values from the real state dockets.
 *
 * @param {string} value
 */
const hasFilingSequence = (value) => {
  const runs = value.match(/\d+/g) ?? [];
  return (
    runs.some((run) => run.length >= 3 && !isYearLike(run)) ||
    runs.filter((run) => run.length >= 2).length >= 2
  );
};

/**
 * @param {unknown} value
 * @returns {CauseNumberKind}
 */
export const classifyCauseNumber = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "absent";
  }
  const candidate = value.trim();
  if (FEDERAL_DOCKET.test(candidate)) {
    return "federal_docket";
  }
  if (CAPTION_YEAR_PLACEHOLDER.test(candidate.toLowerCase())) {
    return "synthetic_placeholder";
  }
  if (!DOCKET_CHARACTERS.test(candidate) || !hasFilingSequence(candidate)) {
    return "unrecognized";
  }
  return "state_docket";
};

/** Kinds a published page may show. */
const PUBLISHABLE_KINDS = new Set(["federal_docket", "state_docket"]);

/** @param {CauseNumberKind} kind */
export const isPublishableCauseNumberKind = (kind) =>
  PUBLISHABLE_KINDS.has(kind);

/**
 * The value a published page may show, or `null`.
 *
 * Returns the stored string unchanged when it is publishable. Normalizing it
 * here would mean the site shows an identifier that is not the one on record.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export const publishableCauseNumber = (value) =>
  isPublishableCauseNumberKind(classifyCauseNumber(value))
    ? /** @type {string} */ (value)
    : null;

/**
 * Replace every non-publishable `cause_number` in a result set with `null`.
 *
 * Keyed on the column name rather than on the query, so a `select *`, a named
 * select and a join all get the same treatment.
 *
 * @template {Record<string, unknown>} Row
 * @param {Row[] | undefined} rows
 * @returns {Row[] | undefined}
 */
export const redactCauseNumbers = (rows) => {
  if (!Array.isArray(rows)) {
    return rows;
  }
  for (const row of rows) {
    if (row && typeof row === "object" && Object.hasOwn(row, "cause_number")) {
      // @ts-expect-error -- narrowing a generic row's known column
      row.cause_number = publishableCauseNumber(row.cause_number);
    }
  }
  return rows;
};

/**
 * A Postgres client whose query results carry no manufactured cause number.
 *
 * A proxy rather than a hand-written facade: the one thing that must not happen
 * is a read path that reaches Postgres without passing through here, and
 * enumerating the parts of the `pg` client we forward is exactly the kind of
 * list that goes stale. Everything but `query` passes through untouched.
 *
 * @template {{ query: (...args: never[]) => unknown }} Client
 * @param {Client} client
 * @returns {Client}
 */
export const suppressCauseNumbers = (client) =>
  new Proxy(client, {
    get(target, property, receiver) {
      if (property !== "query") {
        return Reflect.get(target, property, receiver);
      }
      return async (/** @type {never[]} */ ...args) => {
        const result = /** @type {{ rows?: Record<string, unknown>[] }} */ (
          await target.query(...args)
        );
        redactCauseNumbers(result?.rows);
        return result;
      };
    },
  });
