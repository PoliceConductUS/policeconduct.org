#!/usr/bin/env node
/**
 * Build the provenance ledger the data-access layer reads.
 *
 * The transitional load path (`seed.sql`) carries no provenance columns, so the
 * citation for a live row has to come from the only per-row evidence that
 * exists: the identity map written when the TCOLE public-records production was
 * loaded. This script turns that map into one line per row, and refuses to
 * write a line it cannot justify.
 *
 * What it will not do:
 *
 * - **Run without the source artifact.** The workbook's SHA-256 is recomputed
 *   and matched against both the load manifest and the registered attestation.
 *   No `--force`, no `--trust-manifest`. If the artifact is gone, the lineage
 *   is not re-derivable and the honest output is no ledger at all.
 * - **Invent an identity-match tier.** The manifest records aggregate match
 *   methods (124,383 unique-name, 5,579 name-plus-services, 6 decided by
 *   arbitrary duplicate ordering) and nothing per row, so every line is written
 *   `unknown`. That is disclosed to the reader rather than smoothed over. The
 *   re-pull is required to emit per-row match method; see INS-5.
 * - **Invent a retrieval date.** `processed_at_utc` is the date we processed the
 *   file. It is not a retrieval date and it is not written anywhere near one.
 *
 * Usage:
 *   node scripts/build-provenance-ledger.mjs \
 *     --dataset tx-tcole-2025-02-17-all-officers \
 *     --identity-dir <dir with personnel.yaml and agency-officers.yaml> \
 *     --manifest <manifest.json from the load> \
 *     --workbook <the production file itself> \
 *     [--out provenance]
 */

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import attestations from "../src/lib/data/provenance-attestations.json" with { type: "json" };

const parseArgs = (argv) => {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument ${token}.`);
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Option --${key} needs a value.`);
    }
    args[key] = value;
    index += 1;
  }
  return args;
};

const sha256OfFile = async (file) => {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    createReadStream(file)
      .on("error", reject)
      .on("data", (chunk) => {
        hash.update(chunk);
      })
      .on("end", resolve);
  });
  return hash.digest("hex");
};

/**
 * Pull `key: value` mappings out of one of the identity maps.
 *
 * The maps are flat YAML whose keys contain `|` and `:` (the agency-officers
 * key is a source tuple including dates), so the split is on the last `: `
 * rather than the first. Only the value — the canonical row id — is needed.
 */
export const parseIdentityMap = (contents) => {
  const ids = [];
  /**
   * Ids appended under an in-block comment.
   *
   * The TCOLE personnel map ends with five mappings under
   * `# Confirmed True-name identity corrections, 2026-09-21.` — hand-added
   * after the load, for the five people whose surname `True` the mapper had
   * coerced to a boolean. They are counted separately because "confirmed" by an
   * unrecorded method is a different kind of evidence from a generated mapping,
   * and the count belongs in the ledger manifest rather than in a comment
   * nobody reads.
   */
  const annotated = [];
  let inMappings = false;
  let afterComment = false;
  let lineNumber = 0;
  for (const line of contents.split("\n")) {
    lineNumber += 1;
    if (!inMappings) {
      if (line.trimEnd() === "mappings:") {
        inMappings = true;
      }
      continue;
    }
    if (!line.trim()) {
      continue;
    }
    if (/^\s*#/.test(line)) {
      afterComment = true;
      continue;
    }
    if (!/^\s/.test(line)) {
      inMappings = false;
      continue;
    }
    const match = /:\s*([A-Za-z0-9_-]+)\s*$/.exec(line);
    if (!match) {
      throw new Error(
        `Identity map line ${lineNumber} does not end in a canonical id: ${line.trim().slice(0, 80)}`,
      );
    }
    ids.push(match[1]);
    if (afterComment) {
      annotated.push(match[1]);
    }
  }
  return { ids, annotated };
};

const assertUnique = (ids, label) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }
  if (duplicates.size > 0) {
    throw new Error(
      `${label}: ${duplicates.size} canonical ids appear more than once in the identity map (first: ${[...duplicates][0]}). One source row maps to one published row; a duplicate means the map cannot say which source row a page came from.`,
    );
  }
  return seen;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const datasetId = args.dataset || "tx-tcole-2025-02-17-all-officers";
  const attestation = attestations.attestations.find(
    (entry) => entry.datasetId === datasetId,
  );
  if (!attestation) {
    throw new Error(
      `Dataset ${datasetId} has no attestation in src/lib/data/provenance-attestations.json. Register the dataset before building a ledger that cites it.`,
    );
  }
  for (const required of ["identity-dir", "manifest", "workbook"]) {
    if (!args[required]) {
      throw new Error(
        `--${required} is required. The ledger is derived from the production artifact and the identity map written when it was loaded; without both, a citation for these rows cannot be re-derived (INS-64 owns preserving them).`,
      );
    }
  }

  const manifest = JSON.parse(await readFile(args.manifest, "utf8"));
  const workbookSha = await sha256OfFile(args.workbook);
  if (workbookSha !== attestation.contentSha256) {
    throw new Error(
      `Workbook SHA-256 ${workbookSha} does not match the registered attestation ${attestation.contentSha256}. Refusing to write a ledger that cites an artifact we are not holding.`,
    );
  }
  if (manifest.raw_sha256 && manifest.raw_sha256 !== workbookSha) {
    throw new Error(
      `Load manifest records raw_sha256 ${manifest.raw_sha256}, which does not match the workbook on disk (${workbookSha}).`,
    );
  }
  if (manifest.dataset_id && manifest.dataset_id !== datasetId) {
    throw new Error(
      `Load manifest is for dataset ${manifest.dataset_id}, not ${datasetId}.`,
    );
  }

  const personnel = parseIdentityMap(
    await readFile(path.join(args["identity-dir"], "personnel.yaml"), "utf8"),
  );
  const agencyPersonnel = parseIdentityMap(
    await readFile(
      path.join(args["identity-dir"], "agency-officers.yaml"),
      "utf8",
    ),
  );
  const personnelIds = personnel.ids;
  const agencyPersonnelIds = agencyPersonnel.ids;
  assertUnique(personnelIds, "personnel.yaml");
  assertUnique(agencyPersonnelIds, "agency-officers.yaml");

  const lines = [
    `# Provenance ledger for ${datasetId}`,
    "# table\tid\tdatasetId\tidentityConfidence",
    "# identityConfidence is 'unknown' on every line: the load manifest records",
    "# aggregate match methods only, so no row can claim a tier it did not record.",
  ];
  for (const id of personnelIds) {
    lines.push(`personnel\t${id}\t${datasetId}\tunknown`);
  }
  for (const id of agencyPersonnelIds) {
    lines.push(`agency_personnel\t${id}\t${datasetId}\tunknown`);
  }

  const outDir = args.out || "provenance";
  await mkdir(outDir, { recursive: true });
  const ledgerPath = path.join(outDir, "ledger.tsv");
  const body = `${lines.join("\n")}\n`;
  await writeFile(ledgerPath, body, "utf8");

  const ledgerManifest = {
    datasetId,
    generatedAt: new Date().toISOString(),
    generatedBy: "scripts/build-provenance-ledger.mjs",
    inputs: {
      workbook: path.resolve(args.workbook),
      workbookSha256: workbookSha,
      loadManifest: path.resolve(args.manifest),
      identityDir: path.resolve(args["identity-dir"]),
    },
    counts: {
      personnel: personnelIds.length,
      agencyPersonnel: agencyPersonnelIds.length,
      personnelAddedUnderAnnotation: personnel.annotated.length,
      agencyPersonnelAddedUnderAnnotation: agencyPersonnel.annotated.length,
    },
    manifestCounts: manifest.mapped_counts || null,
    identityMatchMethods: manifest.personnel_match_methods || null,
    retrievalDateAttested: false,
    ledgerSha256: createHash("sha256").update(body).digest("hex"),
    notes:
      "retrievalDateAttested is false because no attested retrieval date exists for this production by any load path. The manifest's processed_at_utc is the date we processed the file. Until the request letter and the agency's response are preserved (INS-64), every row cited from this ledger renders at source_and_dataset_verified and says so.",
  };
  await writeFile(
    path.join(outDir, "ledger.manifest.json"),
    `${JSON.stringify(ledgerManifest, null, 2)}\n`,
    "utf8",
  );

  process.stdout.write(
    [
      `Wrote ${ledgerPath}`,
      `  personnel rows:        ${personnelIds.length.toLocaleString("en-US")}`,
      `  agency_personnel rows: ${agencyPersonnelIds.length.toLocaleString("en-US")}`,
      `  workbook sha256:       ${workbookSha}`,
      `  retrieval date:        unattested — citations render at source_and_dataset_verified`,
      "",
    ].join("\n"),
  );
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
