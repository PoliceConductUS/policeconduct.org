/**
 * Applies the name-quality rules to the personnel table.
 *
 * Four routes generate personnel pages, each with a differently shaped query.
 * Rather than repeat the rule in each of them -- which is how a rule decays
 * into a convention that one call site forgets -- each route asks this module
 * once for the set of slugs that must not be published, and filters on it.
 *
 * @see src/lib/data/person-name.js for the rules themselves.
 * @see scripts/verify-name-quality.mjs for the build gate that proves no route
 *      slipped one through.
 */

import { classifyPersonName } from "./person-name.js";

/**
 * Name fields plus every agency the person is attached to, which the
 * fixture-agency rule needs.
 *
 * `left join` is deliberate: a person with no agency row must still be
 * classified, so that an unattached fixture is caught rather than skipped.
 */
const WITHHELD_QUERY = `
select
  o.slug,
  o.prefix,
  o.first_name,
  o.middle_name,
  o.last_name,
  o.suffix,
  coalesce(
    array_agg(distinct a.slug) filter (where a.slug is not null),
    '{}'
  ) as agency_slugs
from public.personnel o
left join public.agency_personnel ao
  on ao.personnel_id = o.id
left join public.agency a
  on a.id = ao.agency_id
group by
  o.id,
  o.slug,
  o.prefix,
  o.first_name,
  o.middle_name,
  o.last_name,
  o.suffix
`;

/**
 * @typedef {object} NameQualityReport
 * @property {Set<string>} withheldSlugs slugs that must not generate a page
 * @property {{slug: string, rules: string[], details: string[]}[]} withheld
 * @property {{slug: string, rules: string[], details: string[]}[]} review
 * @property {number} total
 */

/**
 * Classify every personnel row.
 *
 * @param {import("pg").PoolClient} client
 * @returns {Promise<NameQualityReport>}
 */
export const loadNameQualityReport = async (client) => {
  const { rows } = await client.query(WITHHELD_QUERY);

  /** @type {Set<string>} */
  const withheldSlugs = new Set();
  /** @type {{slug: string, rules: string[], details: string[]}[]} */
  const withheld = [];
  /** @type {{slug: string, rules: string[], details: string[]}[]} */
  const review = [];

  for (const row of rows) {
    const result = classifyPersonName(row, { agencySlugs: row.agency_slugs });
    if (!result.findings.length) {
      continue;
    }
    const pick = (action) => result.findings.filter((f) => f.action === action);
    const entry = (findings) => ({
      slug: row.slug,
      rules: [...new Set(findings.map((f) => f.rule))],
      details: findings.map((f) => `${f.field}: ${f.detail}`),
    });

    if (!result.publishable) {
      withheldSlugs.add(row.slug);
      withheld.push(entry(pick("withhold")));
      continue;
    }
    review.push(entry(pick("review")));
  }

  return { withheldSlugs, withheld, review, total: rows.length };
};

/**
 * The set of slugs that must not generate a page. Logs a one-line summary so
 * that a build which drops records says so in its output rather than silently
 * shrinking the corpus.
 *
 * @param {import("pg").PoolClient} client
 * @returns {Promise<Set<string>>}
 */
export const loadWithheldPersonnelSlugs = async (client) => {
  const report = await loadNameQualityReport(client);
  if (report.withheld.length) {
    const counts = new Map();
    for (const item of report.withheld) {
      for (const rule of item.rules) {
        counts.set(rule, (counts.get(rule) ?? 0) + 1);
      }
    }
    const breakdown = [...counts]
      .map(([rule, count]) => `${rule}=${count}`)
      .join(", ");
    console.log(
      `[name-quality] withholding ${report.withheld.length} of ${report.total} personnel records (${breakdown}); ${report.review.length} flagged for review`,
    );
  }
  return report.withheldSlugs;
};
