/**
 * Enforce the INS-11 §3 personnel field suppression list.
 *
 * Two modes, because the two things that can go wrong are different:
 *
 *   --source (default)   A read path reintroduces a suppressed column, by
 *                        naming it or by going back to `select *` on a
 *                        personnel table. Runs without a database, so it runs
 *                        on every CI job.
 *
 *   --build <dist>       A suppressed value reached rendered HTML anyway —
 *                        through a `data-` attribute, an inline prefill
 *                        payload, or schema.org markup. This is the check that
 *                        matters, because the failure mode INS-34 names is a
 *                        value hidden from the reader and still shipped in the
 *                        page source. Runs after `astro build`.
 *
 * Exit non-zero fails the build, which is the point: a deploy over ~130,040
 * pages about named individuals is a publication event, not a refresh.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const PROJECTION_SOURCE = "src/lib/data/personnel-projection.ts";
const PERSONNEL_TABLES = ["officers", "agency_officers"];

/** Paths allowed to name a suppressed column: the suppression list itself. */
const SOURCE_ALLOWLIST = new Set([PROJECTION_SOURCE]);

const BUILD_SCAN_EXTENSIONS = new Set([".html", ".json", ".xml"]);

/**
 * Pages that ask a submitter for a badge number rather than publishing one.
 *
 * A form input labelled "Badge number" asserts nothing about a named person, so
 * it is not the exposure this check exists to stop. Exact paths only — a prefix
 * would silently exempt record pages underneath it.
 */
export const SUBMISSION_FORM_PATHS = new Set([
  "/report/new/index.html",
  "/personnel/new/index.html",
  "/personnel/suggest-edit/index.html",
  "/civil-cases/new/index.html",
  "/civil-cases/suggest-edit/index.html",
  "/agency/new/index.html",
  "/agency/suggest-edit/index.html",
  "/help-center/index.html",
]);

/** Path of a built file relative to dist, with a leading slash. */
export const distPath = (distDir, filePath) =>
  `/${path.relative(distDir, filePath).replaceAll(path.sep, "/")}`;

const toRelative = (filePath) =>
  path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");

const walk = async (dir) => {
  const found = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await walk(full)));
    } else {
      found.push(full);
    }
  }
  return found;
};

/**
 * Read the suppression list out of the projection module.
 *
 * The projection module stays the single source of truth. This parses it
 * rather than duplicating the list, and `validate-personnel-suppression.test.mjs`
 * pins the parse result so a refactor that breaks the parse fails loudly
 * instead of silently validating nothing.
 */
export const readSuppressedColumns = (projectionSource) => {
  const block = projectionSource.match(
    /SUPPRESSED_COLUMNS[^=]*=\s*\n?\s*Object\.freeze\(\{([\s\S]*?)\n\s*\}\);/,
  );
  if (!block) {
    throw new Error(
      `Could not find SUPPRESSED_COLUMNS in ${PROJECTION_SOURCE}. The suppression validator parses that declaration; update the parser rather than removing the list.`,
    );
  }
  const keys = [...block[1].matchAll(/"([a-z_]+)\.([a-z_]+)":/g)].map(
    ([, table, column]) => ({ table, column }),
  );
  if (keys.length === 0) {
    throw new Error(
      `SUPPRESSED_COLUMNS in ${PROJECTION_SOURCE} parsed as empty. Suppression would be unenforced; refusing to pass.`,
    );
  }
  return keys;
};

/** `select *` or `alias.*` reads against a personnel table. */
export const findWildcardPersonnelReads = (text) => {
  const findings = [];
  for (const table of PERSONNEL_TABLES) {
    // The gap may not cross a quote, backtick or semicolon, so a `select *`
    // against one table cannot be paired with a later, unrelated `from` in a
    // different SQL string.
    const pattern = new RegExp(
      String.raw`select\s+(?:distinct\s+)?(?:\*|[a-z_]+\.\*)[^;"'\`]{0,300}?from\s+public\.${table}\b`,
      "gi",
    );
    for (const match of text.matchAll(pattern)) {
      findings.push({ table, snippet: match[0].replace(/\s+/g, " ").trim() });
    }
  }
  return findings;
};

const scanSource = async (suppressed) => {
  const files = (await walk(path.resolve("src"))).filter((file) =>
    [".ts", ".js", ".astro", ".mjs"].includes(path.extname(file)),
  );
  const errors = [];
  for (const file of files) {
    const relative = toRelative(file);
    if (SOURCE_ALLOWLIST.has(relative)) {
      continue;
    }
    const text = await fs.readFile(file, "utf8");
    for (const { table, column } of suppressed) {
      if (new RegExp(String.raw`\b${column}\b`).test(text)) {
        errors.push(
          `${relative}: names suppressed column ${table}.${column}. Suppressed fields are omitted from the projection in ${PROJECTION_SOURCE}; nothing else may read them.`,
        );
      }
    }
    for (const { table, snippet } of findWildcardPersonnelReads(text)) {
      errors.push(
        `${relative}: wildcard read of public.${table} (${snippet}). Use projection("${table}", alias) so a future migration cannot publish a new column.`,
      );
    }
  }
  return errors;
};

/**
 * Rendered-HTML assertions. Each looks for a suppressed value surviving into
 * page source, not merely into the visible DOM.
 */
export const findRenderedLeaks = (text, suppressed) => {
  const leaks = [];
  const hasBadge = suppressed.some(
    ({ table, column }) =>
      table === "agency_officers" && column === "badge_number",
  );
  if (!hasBadge) {
    return leaks;
  }
  // Inline prefill payloads ship as JSON inside `define:vars` script blocks.
  for (const match of text.matchAll(/"badgeNumber"\s*:\s*"([^"]*)"/g)) {
    if (match[1].trim()) {
      leaks.push(`inline payload badgeNumber="${match[1]}"`);
    }
  }
  // Visible labels and table headers.
  for (const pattern of [
    />\s*Badge\s*(?:#|[Nn]umber)?\s*</g,
    /"badge_number"/g,
    /data-badge/g,
  ]) {
    for (const match of text.matchAll(pattern)) {
      leaks.push(`badge surface ${JSON.stringify(match[0].trim())}`);
    }
  }
  return leaks;
};

const scanBuild = async (distDir, suppressed) => {
  const root = path.resolve(distDir);
  const all = (await walk(root)).filter((file) =>
    BUILD_SCAN_EXTENSIONS.has(path.extname(file)),
  );
  if (all.length === 0) {
    throw new Error(
      `No rendered files found under ${distDir}. Run this after astro build.`,
    );
  }
  const files = all.filter(
    (file) => !SUBMISSION_FORM_PATHS.has(distPath(root, file)),
  );
  const errors = [];
  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    for (const leak of findRenderedLeaks(text, suppressed)) {
      errors.push(`${toRelative(file)}: ${leak}`);
    }
  }
  return { errors, scanned: files.length, skipped: all.length - files.length };
};

const main = async () => {
  const args = process.argv.slice(2);
  const buildIndex = args.indexOf("--build");
  const projectionSource = await fs.readFile(
    path.resolve(PROJECTION_SOURCE),
    "utf8",
  );
  const suppressed = readSuppressedColumns(projectionSource);
  const listed = suppressed
    .map(({ table, column }) => `${table}.${column}`)
    .join(", ");

  if (buildIndex === -1) {
    const errors = await scanSource(suppressed);
    if (errors.length) {
      console.error(
        `Personnel suppression check failed (${errors.length} problem${errors.length === 1 ? "" : "s"}):`,
      );
      for (const error of errors) {
        console.error(`  - ${error}`);
      }
      process.exitCode = 1;
      return;
    }
    console.log(`Personnel suppression (source): clean. Suppressed: ${listed}`);
    return;
  }

  const distDir = args[buildIndex + 1] || "dist";
  const { errors, scanned } = await scanBuild(distDir, suppressed);
  if (errors.length) {
    console.error(
      `Suppressed personnel fields reached rendered HTML (${errors.length}):`,
    );
    for (const error of errors.slice(0, 50)) {
      console.error(`  - ${error}`);
    }
    if (errors.length > 50) {
      console.error(`  ... and ${errors.length - 50} more`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `Personnel suppression (build): clean across ${scanned} rendered files. Suppressed: ${listed}`,
  );
};

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
