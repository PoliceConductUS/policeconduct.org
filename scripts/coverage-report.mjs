#!/usr/bin/env node
/**
 * Generates the agency coverage report (INS-7) from live data.
 *
 * Reads the corpus through the same database door the site build uses, so the
 * report cannot drift from what we actually publish from.
 *
 *   DATABASE_URL=postgres://... node scripts/coverage-report.mjs \
 *     --out docs/coverage-report.md \
 *     --json docs/coverage-report.json \
 *     --cross-check "seed.sql dump=3003"
 *
 * `--cross-check` is repeatable and exists because more than one store claims to
 * hold our corpus. Passing the others in makes a disagreement a reported finding
 * instead of something only the person running the script notices.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { withDb } from "../src/lib/db.js";
import { measureHeldAgencies } from "../src/lib/coverage/held-counts.js";
import { summarizeClassifications } from "../src/lib/coverage/agency-types.js";
import { classifyHeldAgencies } from "../src/lib/coverage/classify-held-agencies.js";
import {
  buildCoverageReport,
  renderCoverageReportMarkdown,
} from "../src/lib/coverage/report.js";

/** Matches `/Users/<name>` and `/home/<name>`, the shapes the repo gate flags. */
const HOME_PATH = /\/(?:Users|home)\/[^/\s]+/;

const parseArgs = (argv) => {
  const options = { out: null, json: null, crossChecks: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new Error(`${arg} requires a value.`);
      }
      index += 1;
      return value;
    };
    if (arg === "--out") {
      options.out = next();
    } else if (arg === "--json") {
      options.json = next();
    } else if (arg === "--cross-check") {
      const raw = next();
      const separator = raw.lastIndexOf("=");
      if (separator === -1) {
        throw new Error(`--cross-check expects "store=count", got "${raw}".`);
      }
      const store = raw.slice(0, separator).trim();
      const count = Number.parseInt(raw.slice(separator + 1), 10);
      if (!store || !Number.isInteger(count)) {
        throw new Error(
          `--cross-check expects "store=count" with an integer count, got "${raw}".`,
        );
      }
      // The store label is rendered into a report that gets committed to a
      // public repository. An absolute home path there leaks the committer's
      // account name, which the repo's personal-data gate rejects — fail here
      // instead, where the message can say what to do about it.
      if (HOME_PATH.test(store)) {
        throw new Error(
          `--cross-check store label "${store}" contains an absolute home directory path. Name the store, not its location on your machine — the report is committed to a public repository.`,
        );
      }
      options.crossChecks.push({ store, count });
    } else {
      throw new Error(`Unknown argument "${arg}".`);
    }
  }
  return options;
};

const write = async (path, contents) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
  console.log(`wrote ${path}`);
};

/**
 * Host, port and database name from DATABASE_URL, with the credentials dropped.
 * The report is committed to a public repository, so the connection string
 * itself must never reach it.
 */
const describeTarget = () => {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    const database = url.pathname.replace(/^\//, "") || "(default)";
    return `${url.hostname}:${url.port || "5432"}/${database}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const connectionTarget = describeTarget();

  const roster = JSON.parse(
    await readFile(
      new URL(
        "../src/lib/coverage/data/tcole-department-types.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

  const { measurement, classification } = await withDb(async (client) => {
    const measured = await measureHeldAgencies(client, { connectionTarget });
    // Every held agency, so a state is only ever reported as fully classified
    // when the classifier actually saw all of its rows.
    const { rows } = await client.query(
      `select id, name, upper(btrim(state)) as state from public.agency`,
    );
    return {
      measurement: measured,
      classification: summarizeClassifications(
        classifyHeldAgencies(rows, roster),
      ),
    };
  });

  const report = buildCoverageReport({
    measurement,
    corpusCrossChecks: options.crossChecks,
    classification,
  });
  const markdown = renderCoverageReportMarkdown(report);

  if (options.out) {
    await write(options.out, markdown);
  }
  if (options.json) {
    await write(options.json, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (!options.out && !options.json) {
    process.stdout.write(markdown);
  }

  // A report that claims coverage it cannot defend is the failure mode this
  // issue was opened to prevent, so assert it here rather than trusting review.
  //
  // Until INS-79 this read `achievedPercentagesReported !== 0`, because no
  // numerator could be placed in a denominator's universe. Now that some can,
  // the guard checks the property that actually matters and that will still
  // matter when more states are classified: a percentage may only appear for a
  // state where every held agency carries a sourced type. Deleting the guard
  // along with the condition it used to enforce is how a control disappears.
  const fullyClassified = new Set(
    classification
      .filter((row) => row.numeratorComplete)
      .map((row) => row.code),
  );
  for (const state of report.states) {
    for (const reading of [state.generalPurpose, state.allAgency]) {
      if (reading.coverage && !fullyClassified.has(state.code)) {
        throw new Error(
          `Coverage report claimed an achieved percentage for ${state.code}, which has ` +
            `agencies with no sourced type. A percentage requires a numerator drawn from ` +
            `the denominator's universe; this one is not.`,
        );
      }
    }
  }

  console.error(
    `coverage report: ${report.national.held} agencies held, ` +
      `${report.summary.jurisdictionsWithRecords} jurisdictions with records, ` +
      `${report.summary.jurisdictionsWithoutRecords} with none, ` +
      `${report.summary.universeMismatches} universe mismatches, ` +
      `${report.summary.achievedPercentagesReported} achieved percentages from ` +
      `${report.summary.jurisdictionsFullyClassified} fully classified jurisdictions, ` +
      `${report.summary.unclassifiedHeld} agencies still untyped.`,
  );
};

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error.message);
    process.exit(1);
  },
);
