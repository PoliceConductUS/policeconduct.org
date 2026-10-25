#!/usr/bin/env node
/**
 * Reports how many submission verification links go unused, and why (INS-89).
 *
 * INS-89 raised the link window from 15 minutes to 24 hours and added a
 * re-send path. Done-when #3 of that issue requires the loss rate to be
 * diagnosed rather than merely reduced, measured before and after. This is the
 * measurement, committed so that "after" is the same arithmetic as "before"
 * and not a fresh ad-hoc query.
 *
 * Point it at a local copy of the `verify/` prefix:
 *
 *   aws s3 sync s3://policeconduct-submissions-.../submissions/verify/ /tmp/verify/
 *   node scripts/verification-loss-report.mjs --dir /tmp/verify --json
 *
 * There is no default directory on purpose. The records carry submitter email
 * addresses, so the path has to be named deliberately, and the output of this
 * script never contains one — only domains and mailbox providers, which is the
 * attribute that turned out to predict delivery.
 *
 * `--undeliverable-domain` is repeatable and takes domains independently shown
 * to be unable to receive our mail: no MX record, or a typosquat of a real
 * provider. That evidence comes from DNS, not from this store, so it is an
 * input rather than something the script infers. Example from the first run:
 *
 *   --undeliverable-domain smith.com   # no MX record at all
 *   --undeliverable-domain yshoo.com   # typosquat of yahoo.com, catch-all MX
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { buildVerificationLossReport } from "../src/lib/verification/loss-report.js";

const parseArgs = (argv) => {
  const options = { dir: null, json: false, undeliverableDomains: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (value === undefined) throw new Error(`${arg} requires a value.`);
      index += 1;
      return value;
    };
    if (arg === "--dir") options.dir = next();
    else if (arg === "--undeliverable-domain")
      options.undeliverableDomains.push(next());
    else if (arg === "--json") options.json = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.dir) {
    throw new Error(
      "--dir is required: a local directory of verify/*.json records.",
    );
  }
  return options;
};

const loadRecords = async (dir) => {
  const entries = await readdir(dir);
  const records = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const raw = await readFile(join(dir, entry), "utf8");
    try {
      records.push(JSON.parse(raw));
    } catch (_error) {
      // A record we cannot parse is a finding, not something to drop quietly.
      console.warn(`Skipping unparseable record: ${entry}`);
    }
  }
  return records;
};

const pct = (value) => (value === null ? "n/a" : `${value}%`);

const renderTable = (title, rates) => {
  const lines = [`${title}:`];
  for (const [key, value] of Object.entries(rates)) {
    lines.push(
      `  ${key.padEnd(28)} ${String(value.links).padStart(4)} links  ` +
        `${String(value.unused).padStart(4)} unused  ${pct(value.unusedPercent).padStart(6)}`,
    );
  }
  return lines.join("\n");
};

const render = (report) => {
  const {
    sample,
    overall,
    oneShotSubmitters,
    verifyLatencySeconds: latency,
  } = report;
  return [
    `Verification links: ${sample.links} from ${sample.addresses} addresses`,
    `Issued between ${sample.firstIssuedAt} and ${sample.lastIssuedAt}`,
    `Windows present (seconds): ${sample.issuedTtlSeconds.join(", ") || "none recorded"}`,
    "",
    `Unused, all links:            ${overall.unused}/${overall.links} (${pct(overall.unusedPercent)})`,
    `Unused, one-shot submitters:  ${oneShotSubmitters.unused}/${oneShotSubmitters.links} (${pct(oneShotSubmitters.unusedPercent)})`,
    "",
    `Verify latency (s): median ${latency.median}, p90 ${latency.p90}, max ${latency.max}, n=${latency.redeemed}`,
    `Tail pressure: ${report.tailPressure.inFinalTenth}/${report.tailPressure.redeemed} redeemed in the final tenth of their window; ` +
      `slowest used ${report.tailPressure.maxFractionOfWindow === null ? "n/a" : `${Math.round(report.tailPressure.maxFractionOfWindow * 100)}%`} of it`,
    "",
    renderTable("Unused by form (all links)", report.byForm),
    "",
    renderTable(
      "Unused by form (one-shot submitters only)",
      report.byFormOneShot,
    ),
    "",
    renderTable("Unused by mailbox provider", report.byMailboxProvider),
    "",
    renderTable("Unused by issued window (seconds)", report.byIssuedTtlSeconds),
    "",
    "Causes of unused links:",
    ...Object.entries(report.unusedLinkCauses).map(
      ([key, value]) => `  ${key.padEnd(28)} ${value}`,
    ),
    "",
    `Resends: ${report.resends.recordsWithAResend} issued, ${report.resends.replacedThenVerified} then verified`,
    `Joinable to a delivery outcome: ${report.deliveryEvidence.withProviderMessageId}/${sample.links} carry a provider message id`,
  ].join("\n");
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const records = await loadRecords(options.dir);
  const report = buildVerificationLossReport(records, {
    undeliverableDomains: options.undeliverableDomains,
  });
  console.log(options.json ? JSON.stringify(report, null, 2) : render(report));
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
