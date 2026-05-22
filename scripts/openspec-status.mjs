#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const explicitChange = process.env.OPENSPEC_CHANGE || process.argv[2];
const changesDir = join(process.cwd(), "openspec", "changes");

function runStatus(change) {
  const result = spawnSync("openspec", ["status", "--change", change], {
    stdio: "inherit",
  });

  process.exit(result.status ?? 1);
}

if (explicitChange) {
  runStatus(explicitChange);
}

const changes = readdirSync(changesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "archive")
  .map((entry) => entry.name)
  .filter((name) => existsSync(join(changesDir, name, ".openspec.yaml")))
  .sort((a, b) => a.localeCompare(b));

if (changes.length === 1) {
  runStatus(changes[0]);
}

if (changes.length === 0) {
  console.error("No OpenSpec changes with .openspec.yaml were found.");
} else {
  console.error("Multiple OpenSpec changes found. Choose one:");
  for (const change of changes) {
    console.error(`  - ${change}`);
  }
}

console.error("\nRun: npm run openspec:status -- <change-name>");
process.exit(1);
