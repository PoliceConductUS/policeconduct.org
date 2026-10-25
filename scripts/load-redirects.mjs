// Publish a build's { redirects: [{ from, to, status: 301 }] } map to one
// namespace in a CloudFront KeyValueStore, preserving all other namespaces.
// Usage: node scripts/load-redirects.mjs <kvs-arn> <r:prod:|r:pr-N:> <map.json>
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [kvsArn, namespace, mapPath] = process.argv.slice(2);
if (!kvsArn || !/^r:(?:prod|pr-[1-9]\d*):$/.test(namespace || "") || !mapPath) {
  throw new Error(
    "usage: load-redirects.mjs <kvs-arn> <r:prod:|r:pr-N:> <map.json>",
  );
}

function validatePath(path, source) {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    // eslint-disable-next-line no-control-regex -- Reject control characters in redirect paths.
    /[\\\s?#\x00-\x1f\x7f]/.test(path)
  ) {
    throw new Error(`Invalid redirect path: ${JSON.stringify(path)}`);
  }
  if (
    path.includes("*") &&
    (!source || !path.endsWith("/*") || path.indexOf("*") !== path.length - 1)
  ) {
    throw new Error(`Invalid redirect wildcard: ${path}`);
  }
}

// Complete map validation happens before any AWS writes.
const map = JSON.parse(readFileSync(mapPath, "utf8"));
if (!map || !Array.isArray(map.redirects))
  throw new Error("Invalid redirect map: expected { redirects: [...] }");
const desired = new Map();
for (const entry of map.redirects) {
  if (!entry || entry.status !== 301)
    throw new Error("Invalid redirect entry: status must be 301");
  validatePath(entry.from, true);
  validatePath(entry.to, false);
  const key = namespace + entry.from;
  if (Buffer.byteLength(key) > 512 || Buffer.byteLength(entry.to) > 1024) {
    throw new Error(
      `Invalid redirect: key or value exceeds KVS byte limit (${entry.from})`,
    );
  }
  if (desired.has(key) && desired.get(key) !== entry.to)
    throw new Error(`Conflicting redirect: ${entry.from}`);
  desired.set(key, entry.to);
}
for (const [key, target] of desired) {
  let prefix = target;
  let redirected = desired.has(namespace + target);
  while (!redirected && prefix.includes("/")) {
    prefix = prefix.slice(0, prefix.lastIndexOf("/"));
    redirected = desired.has(namespace + prefix + "/*");
  }
  if (redirected)
    throw new Error(`Redirect chain or cycle: ${key} -> ${target}`);
}

const aws = (args) =>
  JSON.parse(
    execFileSync(
      "aws",
      ["cloudfront-keyvaluestore", ...args, "--output", "json"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 16 * 1024 * 1024,
      },
    ),
  );

const existing = new Map();
let nextToken;
do {
  const args = ["list-keys", "--kvs-arn", kvsArn, "--no-paginate"];
  if (nextToken) args.push("--next-token", nextToken);
  const page = aws(args);
  for (const item of page.Items || []) existing.set(item.Key, item.Value);
  nextToken = page.NextToken;
} while (nextToken);

const bytes = (key, value) => Buffer.byteLength(key) + Buffer.byteLength(value);
let totalBytes = 0;
for (const [key, value] of existing) {
  if (!key.startsWith(namespace)) totalBytes += bytes(key, value);
}
for (const [key, value] of desired) totalBytes += bytes(key, value);
if (totalBytes > 5 * 1024 * 1024)
  throw new Error(
    "Redirect map exceeds the 5 MB KVS store limit including other namespaces",
  );

const deletes = [...existing.keys()]
  .filter((key) => key.startsWith(namespace) && !desired.has(key))
  .map((Key) => ({ Key }));
const puts = [...desired]
  .filter(([key, value]) => existing.get(key) !== value)
  .map(([Key, Value]) => ({ Key, Value }));

// Apply shrinking replacements before growing entries so intermediate batches
// also fit the store limit, even when the store starts at capacity.
const growth = ({ Key, Value }) =>
  bytes(Key, Value) - (existing.has(Key) ? bytes(Key, existing.get(Key)) : 0);
puts.sort((a, b) => growth(a) - growth(b));

// Delete stale entries first so a full store has room for replacement keys.
// Each batch uses a fresh metadata ETag and JSON to preserve literal paths.
for (const [field, changes] of [
  ["Deletes", deletes],
  ["Puts", puts],
]) {
  for (let offset = 0; offset < changes.length; offset += 50) {
    const { ETag } = aws(["describe-key-value-store", "--kvs-arn", kvsArn]);
    aws([
      "update-keys",
      "--cli-input-json",
      JSON.stringify({
        KvsARN: kvsArn,
        IfMatch: ETag,
        [field]: changes.slice(offset, offset + 50),
      }),
    ]);
  }
}
console.log(
  `redirects: removed ${deletes.length}, updated ${puts.length} under ${namespace}`,
);
