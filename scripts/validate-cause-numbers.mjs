/**
 * Enforce the INS-42 cause-number rule.
 *
 * Two modes, because the two things that can go wrong are different:
 *
 *   --source (default)   The enforcement point was removed. `src/lib/db.js`
 *                        stopped routing results through `suppressCauseNumbers`,
 *                        which would silently republish every manufactured
 *                        docket at once. Runs without a database.
 *
 *   --build <dist>       A manufactured docket reached rendered output anyway,
 *                        through a path that never went through `withDb`: a
 *                        hard-coded value, a cached projection file, a fixture.
 *                        Runs after `astro build`.
 *
 * Exit non-zero fails the build. A fabricated court identifier paired with a
 * real court reads as a citation and resolves to nothing, so it has to stop the
 * publication event rather than be reported after it.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import {
  classifyCauseNumber,
  isPublishableCauseNumberKind,
} from "../src/lib/data/cause-number.js";

const DB_SOURCE = "src/lib/db.js";
const PREDICATE_SOURCE = "src/lib/data/cause-number.js";
const DEFAULT_DIST_DIR = "dist";
const SCANNED_EXTENSIONS = new Set([".html", ".json", ".xml"]);
const MAX_REPORTED = 50;

/**
 * The loader's placeholder shape as it appears in rendered output: upper-case
 * words then a year, `GRAY-BALTIMORE-2015`.
 *
 * Deliberately not anchored to a "Cause number" label. The surface INS-18
 * measured is the inline UGC prefill payload, where the value ships inside a
 * `Caption — docket — court — path` summary string with no label anywhere near
 * it. Anchoring to the label would miss exactly the surface this exists for.
 */
const PLACEHOLDER_IN_OUTPUT = /\b[A-Z][A-Z.']*(?:-[A-Z.']+)+-(?:19|20)\d{2}\b/g;

/**
 * Strings that match the placeholder shape and are not cause numbers.
 *
 * Values, never paths — a path entry would exempt a whole page. Add an entry
 * only with the reason it is not a docket, and expect the gate to fail once
 * first: a loud failure on a dataset identifier is the cost of not having to
 * guess which part of a page is a docket slot.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const NON_DOCKET_IDENTIFIERS = Object.freeze({});

/** @param {string} filePath */
const toRelativePath = (filePath) =>
  path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");

/** @param {string} dir */
const walk = async (dir) => {
  const files = [];
  const pending = [dir];
  while (pending.length > 0) {
    const current = pending.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(full);
      } else if (entry.isFile() && SCANNED_EXTENSIONS.has(path.extname(full))) {
        files.push(full);
      }
    }
  }
  return files.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
};

/**
 * Manufactured dockets in one rendered file's source — not its visible DOM.
 * A value hidden from the reader and still shipped in the page source is
 * published: a crawler, a scraper and "view source" all receive it.
 *
 * @param {string} text
 * @returns {{ value: string; kind: string }[]}
 */
export const findManufacturedDockets = (text) => {
  const found = new Map();
  for (const [value] of text.matchAll(PLACEHOLDER_IN_OUTPUT)) {
    if (Object.hasOwn(NON_DOCKET_IDENTIFIERS, value) || found.has(value)) {
      continue;
    }
    const kind = classifyCauseNumber(value);
    if (!isPublishableCauseNumberKind(kind)) {
      found.set(value, { kind, value });
    }
  }
  return [...found.values()];
};

/**
 * The enforcement point is present and applied.
 *
 * `withDb` is the only place every read passes through, so a suppression rule
 * applied anywhere else is incomplete by construction. This asserts the wiring
 * rather than the behaviour; the behaviour is pinned in
 * `validate-cause-numbers.test.mjs`.
 *
 * @param {string} dbSource
 * @returns {string[]}
 */
export const findEnforcementGaps = (dbSource) => {
  const errors = [];
  if (!/import\s*\{[^}]*\bsuppressCauseNumbers\b[^}]*\}/.test(dbSource)) {
    errors.push(
      `${DB_SOURCE} does not import suppressCauseNumbers from ${PREDICATE_SOURCE}. Cause-number suppression would be unenforced on every read.`,
    );
  }
  if (!/fn\(\s*suppressCauseNumbers\(client\)\s*\)/.test(dbSource)) {
    errors.push(
      `${DB_SOURCE} does not hand withDb's callback a suppressed client. Every read would publish manufactured cause numbers again, including the UGC prefill payloads no template conditional covers.`,
    );
  }
  return errors;
};

/**
 * @param {string} distDir
 */
const scanBuild = async (distDir) => {
  const root = path.resolve(distDir);
  const stat = await fs.stat(root).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(
      `Generated site directory not found: ${toRelativePath(root)}. Run npm run build first.`,
    );
  }
  const files = await walk(root);
  if (files.length === 0) {
    throw new Error(
      `No rendered files found under ${toRelativePath(root)}. Run this after astro build.`,
    );
  }
  const errors = [];
  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    for (const { value, kind } of findManufacturedDockets(text)) {
      errors.push(
        `${toRelativePath(file)}: ${value} (${kind}) identifies no court record.`,
      );
    }
  }
  return { errors, scanned: files.length };
};

const report = (/** @type {string[]} */ errors, /** @type {string} */ lead) => {
  console.error(`${lead} (${errors.length}):`);
  for (const error of errors.slice(0, MAX_REPORTED)) {
    console.error(`  - ${error}`);
  }
  if (errors.length > MAX_REPORTED) {
    console.error(`  ... ${errors.length - MAX_REPORTED} more not shown.`);
  }
  process.exitCode = 1;
};

const main = async () => {
  const args = process.argv.slice(2);
  const buildIndex = args.indexOf("--build");

  if (buildIndex === -1) {
    const dbSource = await fs.readFile(path.resolve(DB_SOURCE), "utf8");
    const errors = findEnforcementGaps(dbSource);
    if (errors.length > 0) {
      report(errors, "Cause-number suppression is not wired in");
      return;
    }
    console.log(
      `Cause-number suppression (source): enforced in ${DB_SOURCE} for every read.`,
    );
    return;
  }

  const distDir = args[buildIndex + 1] || DEFAULT_DIST_DIR;
  const { errors, scanned } = await scanBuild(distDir);
  if (errors.length > 0) {
    report(errors, "Manufactured cause numbers reached rendered output");
    console.error(
      "A value in a docket slot that resolves to no court record is withheld, not rendered as a placeholder. Fix the read path; do not add the value to NON_DOCKET_IDENTIFIERS unless it is genuinely not a cause number.",
    );
    return;
  }
  console.log(
    `Cause-number suppression (build): clean across ${scanned} rendered file(s).`,
  );
};

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
