/** @param {Record<string, string | undefined>} env */
export function internalAnnotationsEnabled(env) {
  return env.DATA_ANNOTATIONS_INTERNAL === "1";
}
/** Internal staging only. Public rollout remains a separate release action. */
export const annotationsEnabled = internalAnnotationsEnabled(process.env);
