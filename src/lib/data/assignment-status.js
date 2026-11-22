import { isReportedDate, storedDate } from "./annotation-values.js";

/**
 * Count of current assignments; moves to an intake database view
 * (supply-site-display-data). These two predicates exist only so the agency
 * personnel counts keep the meaning they had before commit 84c5cec. They are
 * not used for labels or to pick an assignment.
 * @typedef {{effective_value: unknown}} SourceValue
 * @typedef {{end_date?: string | Date | null, start_date?: string | Date | null, data_source_values?: {end_date?: SourceValue, start_date?: SourceValue} | null}} CountedAssignment
 */

/** @param {string | Date | null | undefined} stored
 * @param {SourceValue | undefined} sourceValue */
const countedDate = (stored, sourceValue) => {
  const value = storedDate(stored ?? null);
  const date =
    value === null && sourceValue !== undefined
      ? sourceValue.effective_value
      : value;
  return date == null ? null : String(date);
};

/** @param {CountedAssignment} assignment
 * @param {{now?: Date}} options */
const countedStatus = (assignment, options) => {
  const today = (options.now ?? new Date()).toISOString().slice(0, 10);
  const endDate = countedDate(
    assignment.end_date,
    assignment.data_source_values?.end_date,
  );
  const startDate = countedDate(
    assignment.start_date,
    assignment.data_source_values?.start_date,
  );
  const endValid = isReportedDate(endDate);
  const startValid = isReportedDate(startDate);
  const startUncertain =
    startDate !== null && (!startValid || String(startDate) > today);
  const reversedDates =
    startValid && endValid && String(endDate) < String(startDate);
  return {
    isCurrent: endDate === null && !startUncertain,
    isEnded:
      endValid && String(endDate) < today && !startUncertain && !reversedDates,
  };
};

/** @param {CountedAssignment} assignment
 * @param {{now?: Date}} [options] */
export const isCurrentAssignment = (assignment, options = {}) =>
  countedStatus(assignment, options).isCurrent;

/** @param {CountedAssignment} assignment
 * @param {{now?: Date}} [options] */
export const isEndedAssignment = (assignment, options = {}) =>
  countedStatus(assignment, options).isEnded;

/** Preserve reported calendar dates independently of the server time zone.
 * @param {string} value */
export const formatAssignmentDate = (value) =>
  isReportedDate(value)
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : value;
