import { opendir, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  loadReleaseCoverage,
  loadReleaseRoster,
} from "../src/lib/data/coverage.ts";
import { pageNews, releaseAliases } from "../src/lib/data/release-news.ts";

const staticRoot = resolve("dist");
const dataRoot = resolve(".release/data");
const { agencies, personnel, assignments } = await loadReleaseRoster();
const coverage = await loadReleaseCoverage();

// Enumerating the actual outputs also accounts for release-specific route gates.
async function builtPaths(root, prefix = "/") {
  const paths = new Set();
  async function walk(directory, path) {
    for await (const entry of await opendir(directory)) {
      if (entry.isDirectory())
        await walk(join(directory, entry.name), path + entry.name + "/");
      else if (entry.name === "index.html") paths.add(path);
    }
  }
  await walk(root, prefix);
  return paths;
}
const paths = await builtPaths(staticRoot);
async function writePage(path, data) {
  const dir = join(dataRoot, path);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.json"), JSON.stringify(data));
}
if (!paths.has("/"))
  throw new Error("Missing original homepage in website build");
await writePage("/", pageNews(coverage.home, coverage.ranking));
await writeFile(
  join(dataRoot, "alias.json"),
  JSON.stringify(releaseAliases(coverage.articles.values())),
);
const coveragePaths = [];
for (const [entities, index] of [
  [agencies, coverage.agencies],
  [personnel, coverage.personnel],
]) {
  for (const entity of entities) {
    if (!paths.has(entity.path)) {
      entity.path = null;
      continue;
    }
    const group = index.get(entity.id);
    if (group?.size) coveragePaths.push(entity.path);
    // Empty destinations have the insertion template in their original page.
    // Persist their empty news baseline as well as populated page objects.
    await writePage(
      entity.path,
      pageNews(Array.from(group?.values() ?? [], (entry) => entry.article)),
    );
  }
}
await writeFile(
  join(dataRoot, "dynamic.json"),
  JSON.stringify({ agencies, personnel, assignments, coveragePaths }),
);
