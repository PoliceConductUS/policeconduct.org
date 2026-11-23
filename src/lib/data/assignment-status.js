import { isReportedDate } from "./annotation-values.js";

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
