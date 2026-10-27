// Single source of truth for "is this agency assignment still current?".
//
// `agency_personnel` has no status column. `end_date` is the only signal that
// someone left an agency, so every surface that makes an employment claim has
// to read it the same way. Before this module the decision was re-derived in
// three places with three different meanings, and the personnel page did not
// consult `end_date` at all when choosing the headline assignment — it took
// `history[history.length - 1]` by array position. That published present-tense
// employment, including schema.org `worksFor`, for assignments our own source
// records as ended (INS-63 / INS-75).
//
// The rules, in the order they matter:
//
//  1. A null/absent `end_date` is CURRENT. That is the genuine open case — a
//     roster we hold with no separation date on file. It must never be swept
//     into "former" just because we lack a date.
//  2. An `end_date` strictly in the past is ENDED.
//  3. An `end_date` from today up to one year out is CURRENT. A scheduled
//     separation has not happened yet, so calling it "former" would be wrong
//     today.
//  4. An `end_date` more than a year out is ENDED, and `endDateImplausible` is
//     set. This bound matters more than it looks. The one such row in the
//     corpus is `2109-02-27` on a 2015 start — a typo, not a plan. Treating it
//     as current would convert a corrupt field into a confident present-tense
//     employment claim carrying `worksFor`, which is a *stronger* false claim
//     about a named person than the self-evidently broken date the page
//     already shows. Of the two unsupportable renderings, pick the one that
//     does not assert present employment, and surface the flag so the row can
//     be corrected at the source.
//  5. An unparseable `end_date` is CURRENT, and `endDateInvalid` is set so a
//     caller can refuse to render rather than guess. We hold a value we cannot
//     read; asserting "former" from it would be inventing a claim.

/**
 * @typedef {{ end_date?: string | Date | null }} AssignmentLike
 */

/**
 * Parse an `end_date` into a UTC day number, or null when absent/unparseable.
 * Compared at day granularity so a date-only column is not shifted by the
 * build machine's clock time or timezone.
 *
 * @param {string | Date | null | undefined} value
 * @returns {{ day: number | null; invalid: boolean }}
 */
const toUtcDay = (value) => {
  if (value === null || value === undefined) {
    return { day: null, invalid: false };
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return { day: null, invalid: true };
    }
    return {
      day: Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
      ),
      invalid: false,
    };
  }
  const raw = String(value).trim();
  if (!raw) {
    return { day: null, invalid: false };
  }
  // Prefer the leading YYYY-MM-DD so "2023-07-24" and "2023-07-24T00:00:00Z"
  // land on the same day regardless of the runtime's timezone.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    const [, y, m, d] = iso;
    return {
      day: Date.UTC(Number(y), Number(m) - 1, Number(d)),
      invalid: false,
    };
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { day: null, invalid: true };
  }
  return {
    day: Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    ),
    invalid: false,
  };
};

/**
 * Classify one assignment's employment status from its `end_date`.
 *
 * @param {AssignmentLike | null | undefined} assignment
 * @param {{ now?: Date }} [options]
 * @returns {{
 *   isCurrent: boolean,
 *   isEnded: boolean,
 *   endDate: string | null,
 *   endDateInvalid: boolean,
 *   endDateImplausible: boolean,
 * }}
 */
export const getAssignmentStatus = (assignment, options = {}) => {
  const rawEndDate = assignment?.end_date ?? null;
  const { day, invalid } = toUtcDay(rawEndDate);
  const endDate =
    rawEndDate === null || rawEndDate === undefined
      ? null
      : rawEndDate instanceof Date
        ? rawEndDate.toISOString()
        : String(rawEndDate).trim() || null;

  if (day === null) {
    // Rules 1 and 5: no readable separation date, so the association stands.
    return {
      isCurrent: true,
      isEnded: false,
      endDate,
      endDateInvalid: invalid,
      endDateImplausible: false,
    };
  }

  const now = options.now ?? new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  // Rule 3's horizon. A separation more than a year out is not a plan we should
  // read as present employment; it is what a mistyped year looks like.
  const horizon = Date.UTC(
    now.getUTCFullYear() + 1,
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const endDateImplausible = day > horizon; // rule 4
  const isEnded = day < today || endDateImplausible; // rules 2 and 4

  return {
    isCurrent: !isEnded,
    isEnded,
    endDate,
    endDateInvalid: false,
    endDateImplausible,
  };
};

/**
 * True when the assignment should be presented as present-tense employment.
 *
 * @param {AssignmentLike | null | undefined} assignment
 * @param {{ now?: Date }} [options]
 */
export const isCurrentAssignment = (assignment, options) =>
  getAssignmentStatus(assignment, options).isCurrent;

/**
 * True when the source records this assignment as over.
 *
 * @param {AssignmentLike | null | undefined} assignment
 * @param {{ now?: Date }} [options]
 */
export const isEndedAssignment = (assignment, options) =>
  getAssignmentStatus(assignment, options).isEnded;

/**
 * Pick the assignment a profile should headline, and say whether that choice
 * is a present-tense employment claim.
 *
 * Selection consults `end_date`, never array position: the most recently
 * started still-current assignment wins; if there is none, the most recently
 * ended one is headlined but reported as ended so callers can qualify it and
 * withhold `worksFor`.
 *
 * `history` is expected in ascending `start_date` order (see
 * `normalizeAgencyHistory`); ties fall back to that incoming order.
 *
 * @template {AssignmentLike & { start_date?: string | Date | null }} T
 * @param {readonly T[]} history
 * @param {{ now?: Date }} [options]
 * @returns {{
 *   assignment: T | null,
 *   isCurrent: boolean,
 *   endDate: string | null,
 *   endDateInvalid: boolean,
 *   endDateImplausible: boolean,
 * }}
 */
export const selectHeadlineAssignment = (history, options) => {
  const entries = Array.isArray(history) ? history : [];
  if (!entries.length) {
    return {
      assignment: null,
      isCurrent: false,
      endDate: null,
      endDateInvalid: false,
      endDateImplausible: false,
    };
  }

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const status = getAssignmentStatus(entries[index], options);
    if (status.isCurrent) {
      return {
        assignment: entries[index],
        isCurrent: true,
        endDate: status.endDate,
        endDateInvalid: status.endDateInvalid,
        endDateImplausible: status.endDateImplausible,
      };
    }
  }

  // Every assignment has ended. Headline the one that ended most recently so
  // the page's "most recent agency" claim matches the record, not array order.
  let best = entries[0];
  let bestStatus = getAssignmentStatus(best, options);
  let bestDay = toUtcDay(bestStatus.endDate).day;
  for (const entry of entries.slice(1)) {
    const status = getAssignmentStatus(entry, options);
    const day = toUtcDay(status.endDate).day;
    if (day !== null && (bestDay === null || day >= bestDay)) {
      best = entry;
      bestStatus = status;
      bestDay = day;
    }
  }

  return {
    assignment: best,
    isCurrent: false,
    endDate: bestStatus.endDate,
    endDateInvalid: bestStatus.endDateInvalid,
    endDateImplausible: bestStatus.endDateImplausible,
  };
};
