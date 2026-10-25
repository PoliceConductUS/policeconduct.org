/**
 * Assignment date plausibility.
 *
 * We publish claims about named human beings, so a stored `end_date` that cannot
 * be true must not reach a page. This module decides whether an assignment's
 * separation date is publishable; it never invents or adjusts a date.
 *
 * Why suppression rather than a data correction: the implausible values we have
 * are faithful copies of a custodian record. The TCOLE Public Information Act
 * production of 2025-02-10 itself carries `END_DATE = 2109-02-27` for one
 * Contract Jailer assignment and 24 rows whose `END_DATE` precedes their
 * `ST_DATE`. Overwriting our copy would break the re-pull-and-diff model, and
 * clearing the column is not neutral either: `end_date is null` is this corpus's
 * encoding for *currently employed*, so clearing it would publish a confident
 * present-tense employment claim in place of a false date. Instead the stored
 * value stays, the separation itself still reads as having happened — a
 * populated `END_DATE` is the source's separation signal — and only the
 * unusable date value is withheld from publication. See INS-88.
 *
 * Thresholds are measured, not guessed. In the 210,190-row assignment corpus the
 * longest genuine completed assignment is 50.8 years; the next longest span is
 * the 93.9-year 2109 row. `MAX_ASSIGNMENT_YEARS` sits between them with room on
 * both sides.
 */

/**
 * Longest span we will publish as a single completed assignment. Above this the
 * pair is treated as a source defect rather than a long career.
 */
export const MAX_ASSIGNMENT_YEARS = 70;

const DAYS_PER_YEAR = 365.25;
const MS_PER_DAY = 86_400_000;

/**
 * @param {string | Date | null | undefined} value
 * @returns {Date | null}
 */
const toDate = (value) => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Why an assignment's `end_date` is not publishable, or `null` when it is.
 *
 * `now` is injectable so a build is reproducible under test; it defaults to the
 * build's own clock, which is what makes "has not happened yet" meaningful.
 *
 * @param {string | Date | null | undefined} startDate
 * @param {string | Date | null | undefined} endDate
 * @param {{ now?: Date }} [options]
 * @returns {"before-start" | "in-the-future" | "span-too-long" | null}
 */
export const endDateDefect = (startDate, endDate, options = {}) => {
  const end = toDate(endDate);
  if (!end) {
    // No separation date recorded. Absence is not a defect: it is how this
    // corpus says "still serving".
    return null;
  }
  const now = options.now ?? new Date();
  if (end.getTime() > now.getTime()) {
    // A separation that has not happened cannot be published as one that has.
    return "in-the-future";
  }
  const start = toDate(startDate);
  if (!start) {
    // Nothing to compare against; the date stands on its own.
    return null;
  }
  if (end.getTime() < start.getTime()) {
    return "before-start";
  }
  const years = (end.getTime() - start.getTime()) / MS_PER_DAY / DAYS_PER_YEAR;
  return years > MAX_ASSIGNMENT_YEARS ? "span-too-long" : null;
};

/**
 * True when the stored `end_date` cannot be true and must not be published.
 *
 * @param {string | Date | null | undefined} startDate
 * @param {string | Date | null | undefined} endDate
 * @param {{ now?: Date }} [options]
 * @returns {boolean}
 */
export const isEndDateImplausible = (startDate, endDate, options = {}) =>
  endDateDefect(startDate, endDate, options) !== null;

/**
 * The `end_date` a page may publish: the stored value when it can be true, and
 * `null` when it cannot. Callers must keep deriving "ended vs. current" from the
 * presence of the stored `end_date`, not from this result — withholding an
 * unusable date must not promote a separated assignment to current employment.
 *
 * @template {string | Date} T
 * @param {string | Date | null | undefined} startDate
 * @param {T | null | undefined} endDate
 * @param {{ now?: Date }} [options]
 * @returns {T | null}
 */
export const publishableEndDate = (startDate, endDate, options = {}) =>
  isEndDateImplausible(startDate, endDate, options) ? null : (endDate ?? null);

/**
 * Whole months an assignment contributes to a tenure total. An assignment whose
 * `end_date` is unusable contributes nothing rather than a fabricated span — a
 * 2109 separation on a 2015 start otherwise reads as 93 years of service.
 *
 * @param {string | Date | null | undefined} startDate
 * @param {string | Date | null | undefined} endDate
 * @param {{ now?: Date }} [options]
 * @returns {number}
 */
export const assignmentMonths = (startDate, endDate, options = {}) => {
  const start = toDate(startDate);
  if (!start) {
    return 0;
  }
  if (endDate && isEndDateImplausible(startDate, endDate, options)) {
    return 0;
  }
  const end = toDate(endDate) ?? options.now ?? new Date();
  return Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 +
      end.getMonth() -
      start.getMonth(),
  );
};
