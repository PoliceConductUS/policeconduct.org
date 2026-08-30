// Load a preview build's redirect map into the preview CloudFront KeyValueStore
// under a per-build namespace (r:<label>:<from> = <to>), pruning any stale keys
// in that namespace first. Phase A of openspec/changes/atomic-sha-deploys.
//
// Usage: node scripts/load-preview-redirects.mjs <kvs-arn> <namespace> <map.json>
//   namespace example: "r:pr-123:"
//   map.json shape:    [{ "from": "/old/", "to": "/new/", ... }, ...]
//
// Requires the aws CLI on PATH. update-keys accepts <=50 changes per call.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [kvsArn, namespace, mapPath] = process.argv.slice(2);
if (!kvsArn || !namespace || !mapPath) {
  console.error(
    "usage: load-preview-redirects.mjs <kvs-arn> <namespace> <map.json>",
  );
  process.exit(1);
}

const aws = (args) =>
  execFileSync("aws", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const etag = () =>
  aws([
    "cloudfront-keyvaluestore",
    "describe-key-value-store",
    "--kvs-arn",
    kvsArn,
    "--query",
    "ETag",
    "--output",
    "text",
  ]).trim();

// 1) Existing keys in this namespace (paginated) -> deletes.
const existing = [];
let nextToken = null;
do {
  const args = [
    "cloudfront-keyvaluestore",
    "list-keys",
    "--kvs-arn",
    kvsArn,
    "--output",
    "json",
  ];
  if (nextToken) args.push("--next-token", nextToken);
  const page = JSON.parse(aws(args));
  for (const item of page.Items || []) {
    if (item.Key && item.Key.startsWith(namespace)) existing.push(item.Key);
  }
  nextToken = page.NextToken || null;
} while (nextToken);

// 2) Desired keys from the redirect map.
let map = [];
try {
  map = JSON.parse(readFileSync(mapPath, "utf8"));
} catch (error) {
  console.error(`Could not read ${mapPath}: ${error.message}`);
  process.exit(1);
}
const puts = [];
for (const entry of map) {
  if (!entry || !entry.from || !entry.to) continue;
  puts.push({ key: namespace + entry.from, value: String(entry.to) });
}

// 3) Apply: delete stale keys, then put current ones — <=50 changes per call,
//    each call with a fresh ETag.
const chunk = (list, size) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) =>
    list.slice(i * size, i * size + size),
  );

for (const batch of chunk(existing, 50)) {
  aws([
    "cloudfront-keyvaluestore",
    "delete-keys",
    "--kvs-arn",
    kvsArn,
    "--if-match",
    etag(),
    "--deletes",
    ...batch.map((key) => `Key=${key}`),
  ]);
}

for (const batch of chunk(puts, 50)) {
  aws([
    "cloudfront-keyvaluestore",
    "update-keys",
    "--kvs-arn",
    kvsArn,
    "--if-match",
    etag(),
    "--puts",
    ...batch.map((p) => `Key=${p.key},Value=${p.value}`),
  ]);
}

console.log(
  `preview redirects: pruned ${existing.length}, loaded ${puts.length} under ${namespace}`,
);
