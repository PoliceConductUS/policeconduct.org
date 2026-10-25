#!/usr/bin/env node
/**
 * Build gate: refuse to ship a build that publishes a non-name as a person's
 * name.
 *
 * The field-level rules in src/lib/data/person-name.js stop these records from
 * being generated. This gate is the backstop that makes the rule an invariant
 * rather than a convention: thirteen modules query public.personnel, and any
 * one of them could assemble a display name without going through the shared
 * formatter. This checks the built artifact, so it holds regardless of which
 * code path produced the page.
 *
 * It reads the rendered <title> of every personnel page, which carries both the
 * displayed name and the agency, so it needs no database.
 *
 * Findings are split deliberately:
 *   - violations: decidable from rendered text alone, zero ambiguity. Exit 1.
 *   - warnings:   values that are plausibly a real name AND plausibly a source
 *                 placeholder. Reported for confirmation against the source
 *                 agency, never auto-resolved, never blocking.
 *
 * Usage:
 *   node scripts/verify-name-quality.mjs [--dist dist] [--json] [--limit N]
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { nameQualityRules } from "../src/lib/data/person-name.js";

const { FIXTURE_GIVEN_NAMES, AMBIGUOUS_NAME_LITERALS } = nameQualityRules;

/**
 * Tokens that are never a real name component in any naming tradition we
 * serve, so finding one inside a published name is unambiguously a defect.
 *
 * `null`, `none`, `true`, `na` and friends are deliberately absent -- they are
 * real surnames in the corpus. They are warned about instead.
 */
const PLACEHOLDER_NAME_TOKENS = new Set([
  "n/a",
  "n/a.",
  "n.a.",
  "nan",
  "unknown",
  "unk",
  "tbd",
  "placeholder",
  "notavailable",
  "notapplicable",
  "xxx",
  "xxxx",
  "???",
  "--",
]);

/** Agencies that exist only as test fixtures, by rendered display name. */
const FIXTURE_AGENCY_NAMES = new Set(["central texas police dept."]);

/** How much of each page to read; the <title> sits around 5 KB in. */
const HEAD_BYTES = 12_288;

const TITLE_RE = /<title>([\s\S]*?)<\/title>/;

const decodeEntities = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");

/**
 * Split `Personnel <name> | <agency> | PoliceConduct.org` into its parts.
 * Returns null when the title does not have that shape, which the caller
 * reports rather than silently skipping.
 *
 * @param {string} rawTitle
 */
export const parsePersonnelTitle = (rawTitle) => {
  const title = decodeEntities(rawTitle).replace(/\s+/g, " ").trim();
  const parts = title.split("|").map((part) => part.trim());
  if (parts.length < 2) {
    return null;
  }
  const lead = parts[0].replace(/^Personnel\s+/i, "").trim();
  if (!lead || lead === parts[0]) {
    return null;
  }
  const agency = parts[1].replace(/^Most recent:\s*/i, "").trim();
  return { name: lead, agency };
};

/**
 * Apply the rules that are decidable from a rendered name.
 *
 * @param {{slug: string, name: string, agency: string}} page
 * @returns {{violations: string[], warnings: string[]}}
 */
export const checkRenderedName = ({ name, agency }) => {
  /** @type {string[]} */
  const violations = [];
  /** @type {string[]} */
  const warnings = [];

  if (FIXTURE_AGENCY_NAMES.has(agency.toLowerCase())) {
    violations.push(`fixture-agency: employed by "${agency}"`);
  }

  const tokens = name.split(/\s+/).filter(Boolean);

  tokens.forEach((token, index) => {
    const bare = token.toLowerCase();
    const squashed = bare.replace(/[.\s]/g, "");

    if (
      PLACEHOLDER_NAME_TOKENS.has(bare) ||
      PLACEHOLDER_NAME_TOKENS.has(squashed)
    ) {
      violations.push(
        `placeholder-token: "${token}" published as part of the name`,
      );
      return;
    }

    if (!/\p{Letter}/u.test(token)) {
      // A number inside a published name asserts something false about the
      // person -- a badge or sequence number read as a generational suffix
      // ("155"), or a numeral read as a given name ("9").
      if (/\p{Number}/u.test(token)) {
        violations.push(
          `numeric-name-token: "${token}" published as part of the name`,
        );
        return;
      }
      // Punctuation alone is a source artifact in a real officer's record --
      // usually a hyphenated surname split across two fields. The person is
      // real, so this must never block the build; the field-level rule drops
      // the stray character from the rendered name.
      warnings.push(
        `punctuation-only-token: "${token}" rendered as a name component`,
      );
      return;
    }

    if (index === 0 && FIXTURE_GIVEN_NAMES.has(bare)) {
      violations.push(`fixture-given-name: given name "${token}"`);
      return;
    }

    if (AMBIGUOUS_NAME_LITERALS.has(bare)) {
      warnings.push(
        `ambiguous-name-literal: "${token}" is both a real surname and a source placeholder`,
      );
    }
  });

  // A trailing single letter is normally a dangling initial left behind when a
  // surname was absent at ingest. It can also be a real romanised surname, so
  // this never blocks -- the field-level rule catches the real cases, where the
  // surname column is genuinely empty.
  const last = tokens.at(-1);
  if (tokens.length > 1 && last && /^\p{Letter}\.?$/u.test(last)) {
    warnings.push(
      `possible-missing-surname: name ends in the single letter "${last}"`,
    );
  }

  return { violations, warnings };
};

/**
 * @param {string} distDir
 * @param {{limit?: number}} [options]
 */
export const scanDist = async (distDir, options = {}) => {
  const personnelDir = path.join(distDir, "personnel");
  /** @type {import("node:fs").Dirent[]} */
  let entries;
  try {
    entries = await readdir(personnelDir, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Cannot read ${personnelDir}. Run a build first.`, {
      cause: error,
    });
  }

  const slugs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const considered = options.limit ? slugs.slice(0, options.limit) : slugs;

  /** @type {{slug: string, name: string, agency: string, violations: string[], warnings: string[]}[]} */
  const findings = [];
  /** @type {string[]} */
  const unparsed = [];
  let checked = 0;

  for (const slug of considered) {
    const file = path.join(personnelDir, slug, "index.html");
    let head;
    try {
      const handle = await readFile(file, { encoding: "utf8", flag: "r" });
      head = handle.slice(0, HEAD_BYTES * 2);
    } catch {
      // Not every directory under personnel/ is a profile; roster pagination
      // directories have no index.html of this shape.
      continue;
    }
    const match = TITLE_RE.exec(head);
    if (!match) {
      continue;
    }
    const parsed = parsePersonnelTitle(match[1]);
    if (!parsed) {
      unparsed.push(slug);
      continue;
    }
    checked += 1;
    const page = { slug, ...parsed };
    const { violations, warnings } = checkRenderedName(page);
    if (violations.length || warnings.length) {
      findings.push({ ...page, violations, warnings });
    }
  }

  return {
    checked,
    unparsed,
    violations: findings.filter((f) => f.violations.length),
    warnings: findings.filter((f) => !f.violations.length && f.warnings.length),
  };
};

const parseArgs = (argv) => {
  const args = { dist: "dist", json: false, limit: 0 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") args.json = true;
    else if (arg === "--dist") args.dist = argv[(i += 1)];
    else if (arg === "--limit")
      args.limit = Number.parseInt(argv[(i += 1)], 10);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const result = await scanDist(args.dist, { limit: args.limit || undefined });

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log(`Checked ${result.checked} personnel pages in ${args.dist}.`);
    if (result.unparsed.length) {
      console.log(
        `\n${result.unparsed.length} page(s) had an unrecognised title shape; first few: ${result.unparsed.slice(0, 5).join(", ")}`,
      );
    }
    if (result.warnings.length) {
      console.log(
        `\nReview (${result.warnings.length}) -- confirm against the source agency, not blocking:`,
      );
      for (const f of result.warnings) {
        console.log(`  /personnel/${f.slug}/  ${f.warnings.join("; ")}`);
      }
    }
    if (result.violations.length) {
      console.log(`\nVIOLATIONS (${result.violations.length}):`);
      for (const f of result.violations) {
        console.log(`  /personnel/${f.slug}/  ${f.violations.join("; ")}`);
      }
      console.log(
        "\nThese pages publish a non-name as a person's name. Fix the source" +
          " record or add the rule exclusion before deploying.",
      );
    } else {
      console.log("\nNo name-quality violations.");
    }
  }

  process.exitCode = result.violations.length ? 1 : 0;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
