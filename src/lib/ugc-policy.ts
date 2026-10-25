/**
 * Personnel user-generated content policy.
 *
 * Community submissions about named individuals are suspended. Roster facts and
 * anonymous submissions previously rendered side by side on the same personnel
 * page, under the same `schema.org/Person` markup, with one shared footer
 * disclaimer standing in for both. A reader could not tell which claim was
 * which.
 *
 * TO RE-ENABLE: set PERSONNEL_UGC_SUSPENDED to false below, and set the
 * matching constant in the forms API Lambda
 * (infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs).
 * Both are required; the page controls the entry points and the Lambda controls
 * acceptance. Re-enable only when a moderation queue with a named operator and
 * a stated turnaround exists.
 *
 * This suspends intake only. It does not remove pages, roster data, existing
 * submissions, or search indexing.
 */
export const PERSONNEL_UGC_SUSPENDED = true;

/**
 * Form names the forms API rejects while personnel UGC is suspended. Mirrors
 * SUSPENDED_FORM_NAMES in the forms API Lambda; keep the two lists identical.
 */
export const PERSONNEL_UGC_FORM_NAMES = ["personnelNew", "officerEdit"];

/** Shown where a personnel submission entry point used to be. */
export const PERSONNEL_UGC_SUSPENDED_NOTICE =
  "We have paused community submissions about individual personnel while we " +
  "review how submitted information is sourced and labeled. Public records " +
  "listed here stay up. To report an error on this page, use the correction " +
  "and removal request form.";
