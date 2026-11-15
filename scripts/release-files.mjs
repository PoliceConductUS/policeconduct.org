import { createHash } from "node:crypto";
import {
  openSync,
  closeSync,
  readSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const [mode, releaseId] = process.argv.slice(2);
if (!releaseId || !["--record", "--verify"].includes(mode))
  throw new Error("Expected --record or --verify and a release ID");
const inventory = createHash("sha256").update(releaseId + "\n");
const buffer = Buffer.allocUnsafe(64 * 1024);

function visit(dir) {
  const files = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of files) {
    const path = join(dir, entry.name);
    if (path === "dist/.prerender") continue;
    if (entry.isDirectory()) {
      visit(path);
      continue;
    }
    const hash = createHash("sha256");
    const fd = openSync(path, "r");
    try {
      let bytes;
      while ((bytes = readSync(fd, buffer)))
        hash.update(buffer.subarray(0, bytes));
    } finally {
      closeSync(fd);
    }
    inventory.update(JSON.stringify([path, hash.digest("hex")]) + "\n");
  }
}
visit("dist");
visit(".release/data");
const digest = inventory.digest("hex");
if (mode === "--record") writeFileSync(".release/files.sha256", digest);
else if (digest !== readFileSync(".release/files.sha256", "utf8"))
  throw new Error(
    "Local release files have changed since build completion. Rebuild before upload.",
  );
