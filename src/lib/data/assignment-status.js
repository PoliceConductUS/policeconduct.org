import { isReportedDate, reportedDate } from "./annotation-values.js";

/**
 * Only a genuinely absent effective separation date supports an open assignment.
 * Preserve unreadable and future source dates without inferring current or former
 * employment. Date-only comparison matches the annotation SQL predicate.
 * @param {{end_date?: string | Date | null, start_date?: string | Date | null, data_source_values?: {end_date?: {effective_value: unknown}, start_date?: {effective_value: unknown}}} | null | undefined} assignment
 * @param {{now?: Date}} [options]
 */
export const getAssignmentStatus = (assignment, options = {}) => {
  const raw = reportedDate(
    assignment?.end_date ?? null,
    assignment?.data_source_values?.end_date,
  );
  const endDate = raw == null ? null : String(raw);
  const valid = isReportedDate(endDate);
  const today = (options.now ?? new Date()).toISOString().slice(0, 10);
  const startRaw = reportedDate(
    assignment?.start_date ?? null,
    assignment?.data_source_values?.start_date,
  );
  const startDate = startRaw == null ? null : String(startRaw);
  const startValid = isReportedDate(startDate);
  const startUncertain =
    startDate !== null && (!startValid || startDate > today);
  const reversedDates = startValid && valid && endDate < startDate;
  const isCurrent = assignment != null && endDate === null && !startUncertain;
  const isEnded = valid && endDate < today && !startUncertain && !reversedDates;
  return {
    isCurrent,
    isEnded,
    isUnknown: !isCurrent && !isEnded,
    endDate,
    endDateInvalid: endDate !== null && !valid,
    endDateImplausible: valid && endDate >= today,
  };
};

/** @param {Parameters<typeof getAssignmentStatus>[0]} assignment
 * @param {Parameters<typeof getAssignmentStatus>[1]} [options] */
export const isCurrentAssignment = (assignment, options) =>
  getAssignmentStatus(assignment, options).isCurrent;
/** @param {Parameters<typeof getAssignmentStatus>[0]} assignment
 * @param {Parameters<typeof getAssignmentStatus>[1]} [options] */
export const isEndedAssignment = (assignment, options) =>
  getAssignmentStatus(assignment, options).isEnded;

/**
 * Prefer an open assignment; otherwise select the latest confirmed end date.
 * If uncertain dates exist, retain the latest-started record as context without
 * claiming it is the most recent employer.
 * @template { {end_date?: string | Date | null, start_date?: string | Date | null, data_source_values?: {end_date?: {effective_value: unknown}}} } T
 * @param {readonly T[]} history
 * @param {Parameters<typeof getAssignmentStatus>[1]} [options]
 */
export const selectHeadlineAssignment = (history, options) => {
  const entries = [...history];
  const current = entries.findLast((entry) =>
    isCurrentAssignment(entry, options),
  );
  const uncertain = entries.some(
    (entry) => getAssignmentStatus(entry, options).isUnknown,
  );
  const assignment =
    current ??
    (uncertain
      ? entries.at(-1)
      : entries
          .sort((a, b) =>
            String(getAssignmentStatus(a, options).endDate).localeCompare(
              String(getAssignmentStatus(b, options).endDate),
            ),
          )
          .at(-1)) ??
    null;
  const status = getAssignmentStatus(assignment, options);
  return {
    ...status,
    assignment,
    isCurrent: assignment !== null && status.isCurrent,
    hasUncertainHistory: uncertain,
  };
};

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
