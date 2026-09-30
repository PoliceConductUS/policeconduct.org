import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const script = resolve("scripts/load-redirects.mjs");
const entry = (from, to) => ({ from, to, status: 301, source: "test" });
function run(map, initial = [], namespace = "r:prod:") {
  const dir = mkdtempSync(join(tmpdir(), "redirect-loader-"));
  try {
    writeFileSync(
      join(dir, "map.json"),
      typeof map === "string" ? map : JSON.stringify(map),
    );
    writeFileSync(
      join(dir, "state.json"),
      JSON.stringify({ items: initial, calls: [], etag: 0 }),
    );
    writeFileSync(
      join(dir, "aws"),
      `#!/usr/bin/env node
const fs = require('node:fs');
const file = process.env.TEST_STATE;
const state = JSON.parse(fs.readFileSync(file));
const args = process.argv.slice(2);
state.calls.push(args);
let result;
switch (args[1]) {
  case 'list-keys': {
    const index = args.indexOf('--next-token');
    const offset = index < 0 ? 0 : Number(args[index + 1]);
    result = {Items: state.items.slice(offset, offset + 37)};
    if (offset + 37 < state.items.length) result.NextToken = String(offset + 37);
    break;
  }
  case 'describe-key-value-store': result = {ETag: String(state.etag)}; break;
  case 'update-keys': {
    const input = JSON.parse(args[args.indexOf('--cli-input-json') + 1]);
    if (input.IfMatch !== String(state.etag)) throw Error('stale ETag');
    if ((input.Puts?.length || 0) + (input.Deletes?.length || 0) > 50) throw Error('oversized batch');
    for (const item of input.Deletes || []) state.items = state.items.filter(x => x.Key !== item.Key);
    for (const item of input.Puts || []) {
      state.items = state.items.filter(x => x.Key !== item.Key);
      state.items.push(item);
    }
    if (state.items.reduce((sum, item) => sum + Buffer.byteLength(item.Key) + Buffer.byteLength(item.Value), 0) > 5 * 1024 * 1024) throw Error("store full");
    state.etag++;
    result = {ETag: String(state.etag)};
    break;
  }
  default: throw Error('unexpected AWS command ' + args[1]);
}
fs.writeFileSync(file, JSON.stringify(state));
process.stdout.write(JSON.stringify(result));
`,
      { mode: 0o755 },
    );
    const result = spawnSync(
      process.execPath,
      [script, "arn:test", namespace, join(dir, "map.json")],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${dir}:${process.env.PATH}`,
          TEST_STATE: join(dir, "state.json"),
        },
      },
    );
    return {
      ...result,
      ...JSON.parse(readFileSync(join(dir, "state.json"), "utf8")),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const writes = (result) =>
  result.calls.filter((call) => call[1] === "update-keys");

test("loads the generated envelope, preserves other namespaces, and writes only differences", () => {
  const result = run(
    {
      redirects: [
        entry("/same/", "/current/"),
        entry("/old/", "/new/"),
        entry("/old/", "/new/"),
      ],
    },
    [
      { Key: "r:prod:/same/", Value: "/current/" },
      { Key: "r:prod:/old/", Value: "/outdated/" },
      { Key: "r:prod:/stale/", Value: "/gone/" },
      { Key: "r:pr-8:/other/", Value: "/other-target/" },
    ],
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    result.items.sort((a, b) => a.Key.localeCompare(b.Key)),
    [
      { Key: "r:pr-8:/other/", Value: "/other-target/" },
      { Key: "r:prod:/old/", Value: "/new/" },
      { Key: "r:prod:/same/", Value: "/current/" },
    ],
  );
  const inputs = writes(result).map((call) =>
    JSON.parse(call[call.indexOf("--cli-input-json") + 1]),
  );
  assert.deepEqual(
    inputs.flatMap((x) => x.Puts || []),
    [{ Key: "r:prod:/old/", Value: "/new/" }],
  );
  assert.deepEqual(
    inputs.flatMap((x) => x.Deletes || []),
    [{ Key: "r:prod:/stale/" }],
  );
});

test("supports terminal wildcard sources and safely encodes CLI-sensitive path characters", () => {
  const result = run(
    {
      redirects: [entry("/old/*", "/new/"), entry("/comma,a/", '/quote"a,=b/')],
    },
    [],
    "r:pr-123:",
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.items, [
    { Key: "r:pr-123:/old/*", Value: "/new/" },
    { Key: "r:pr-123:/comma,a/", Value: '/quote"a,=b/' },
  ]);
});

test("empty envelope deletes only the requested namespace", () => {
  const result = run(
    { redirects: [] },
    [
      { Key: "r:pr-1:/old/", Value: "/new/" },
      { Key: "r:prod:/old/", Value: "/new/" },
    ],
    "r:pr-1:",
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.items, [{ Key: "r:prod:/old/", Value: "/new/" }]);
});

test("unchanged maps perform no writes", () => {
  const result = run({ redirects: [entry("/old/", "/new/")] }, [
    { Key: "r:prod:/old/", Value: "/new/" },
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(writes(result).length, 0);
});

for (const [name, map] of [
  ["malformed JSON", "{"],
  ["array instead of envelope", []],
  ["missing redirects", {}],
  ["invalid entry", { redirects: [null] }],
  ["non-301 status", { redirects: [{ ...entry("/a/", "/b/"), status: 302 }] }],
  [
    "external destination",
    { redirects: [entry("/a/", "https://example.com/")] },
  ],
  [
    "protocol relative destination",
    { redirects: [entry("/a/", "//example.com/")] },
  ],
  ["relative source", { redirects: [entry("a/", "/b/")] }],
  ["backslash destination", { redirects: [entry("/a/", "/\\example.com/")] }],
  ["query destination", { redirects: [entry("/a/", "/b/?x=1")] }],
  ["fragment destination", { redirects: [entry("/a/", "/b/#x")] }],
  ["nonterminal wildcard", { redirects: [entry("/a/*/b/", "/b/")] }],
  ["wildcard destination", { redirects: [entry("/a/*", "/b/*")] }],
  [
    "conflicting duplicates",
    { redirects: [entry("/a/", "/b/"), entry("/a/", "/c/")] },
  ],
  ["self redirect", { redirects: [entry("/a/", "/a/")] }],
  ["chain", { redirects: [entry("/a/", "/b/"), entry("/b/", "/c/")] }],
  ["cycle", { redirects: [entry("/a/", "/b/"), entry("/b/", "/a/")] }],
  [
    "wildcard chain",
    { redirects: [entry("/a/", "/b/c/"), entry("/b/*", "/c/")] },
  ],
  ["wildcard self redirect", { redirects: [entry("/a/*", "/a/b/")] }],
  [
    "oversized multibyte key",
    { redirects: [entry("/" + "é".repeat(260), "/b/")] },
  ],
  [
    "oversized multibyte value",
    { redirects: [entry("/a/", "/" + "é".repeat(520))] },
  ],
]) {
  test(`rejects ${name} before any writes`, () => {
    const result = run(map, [{ Key: "r:prod:/existing/", Value: "/target/" }]);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /SyntaxError|Invalid redirect|Conflicting redirect|Redirect chain or cycle/,
    );
    assert.equal(writes(result).length, 0);
    assert.deepEqual(result.items, [
      { Key: "r:prod:/existing/", Value: "/target/" },
    ]);
  });
}

test("validates namespace before any writes", () => {
  const result = run({ redirects: [] }, [], "r:");
  assert.notEqual(result.status, 0);
  assert.equal(writes(result).length, 0);
});

test("paginates inventory and uses current ETags for batches of at most 50 changes", () => {
  const result = run(
    {
      redirects: Array.from({ length: 101 }, (_, i) =>
        entry(`/old-${i}/`, `/new-${i}/`),
      ),
    },
    Array.from({ length: 51 }, (_, i) => ({
      Key: `r:prod:/stale-${i}/`,
      Value: "/new/",
    })),
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.items.length, 101);
  assert.ok(writes(result).length >= 4);
  assert.ok(result.calls.filter((x) => x[1] === "list-keys").length >= 2);
});

test("rejects a desired store exceeding 5 MB including other namespaces before writes", () => {
  const result = run({ redirects: [entry("/old/", "/new/")] }, [
    { Key: "r:pr-1:/large/", Value: "x".repeat(5 * 1024 * 1024) },
  ]);
  assert.notEqual(result.status, 0);
  assert.equal(writes(result).length, 0);
});

function deploy(
  scriptName,
  args = [],
  { unchanged = false, failSync = false } = {},
) {
  const dir = mkdtempSync(join(tmpdir(), "redirect-deploy-"));
  try {
    for (const name of ["scripts", "dist", "bin", ".deploy-cache"])
      mkdirSync(join(dir, name));
    writeFileSync(
      join(dir, "scripts", scriptName),
      readFileSync(resolve("scripts", scriptName)),
    );
    writeFileSync(join(dir, "dist/index.html"), "content");
    writeFileSync(
      join(dir, "dist/_redirect-map.json"),
      JSON.stringify({ redirects: [] }),
    );
    if (unchanged) {
      const manifest = spawnSync(
        "bash",
        [
          "-c",
          'find . -type f -print0 | xargs -0 shasum | sed "s|  \\./|  |" | sort -k2',
        ],
        { cwd: join(dir, "dist"), encoding: "utf8" },
      );
      assert.equal(manifest.status, 0, manifest.stderr);
      writeFileSync(join(dir, ".deploy-cache/d"), manifest.stdout);
    }
    const log = join(dir, "calls");
    writeFileSync(log, "");
    for (const tool of ["aws", "node"])
      writeFileSync(
        join(dir, "bin", tool),
        `#!/usr/bin/env bash\nprintf '%s\\n' '${tool} '"$*" >> "$TEST_LOG"\n${tool === "aws" && failSync ? 'if [[ "$1 $2" == "s3 sync" ]]; then exit 23; fi' : ""}\n`,
        { mode: 0o755 },
      );
    const result = spawnSync(
      "bash",
      [join(dir, "scripts", scriptName), ...args],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${dir}/bin:${process.env.PATH}`,
          TEST_LOG: log,
          S3_BUCKET: "prod",
          CLOUDFRONT_DIST_ID: "prod-dist",
          KVS_ARN: "prod-kvs",
          PR_NUMBER: "12",
          S3_BUCKET_PREVIEW: "preview",
          CLOUDFRONT_DIST_PREVIEW: "preview-dist",
          KVS_ARN_PREVIEW: "preview-kvs",
          SYNC_MAX_ATTEMPTS: "1",
        },
      },
    );
    return {
      ...result,
      calls: readFileSync(log, "utf8").trim().split("\n").filter(Boolean),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("preview publishes redirects after S3 sync and before invalidation", () => {
  const result = deploy("deploy-preview-sync.sh");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.calls[0], /^aws s3 sync /);
  assert.equal(
    result.calls[1],
    "node scripts/load-redirects.mjs preview-kvs r:pr-12: dist/_redirect-map.json",
  );
  assert.match(result.calls[2], /^aws cloudfront create-invalidation /);
});

test("failed preview sync does not publish redirects", () => {
  const result = deploy("deploy-preview-sync.sh", [], { failSync: true });
  assert.equal(result.status, 23, result.stderr);
  assert.equal(result.calls.length, 1);
});

test("production publishes redirects even without content changes", () => {
  const result = deploy("deploy-incremental.sh", ["--skip-build"], {
    unchanged: true,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    result.calls.includes(
      "node scripts/load-redirects.mjs prod-kvs r:prod: dist/_redirect-map.json",
    ),
  );
});

test("production dry-run never mutates AWS or invokes loader", () => {
  for (const unchanged of [false, true]) {
    const result = deploy(
      "deploy-incremental.sh",
      ["--skip-build", "--dry-run"],
      { unchanged },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.calls, []);
  }
});

test("production publishes redirects after content sync and before invalidation", () => {
  const result = deploy("deploy-incremental.sh", ["--skip-build"]);
  assert.equal(result.status, 0, result.stderr);
  const sync = result.calls.findIndex((x) => x.startsWith("aws s3 sync "));
  const loader = result.calls.indexOf(
    "node scripts/load-redirects.mjs prod-kvs r:prod: dist/_redirect-map.json",
  );
  const invalidation = result.calls.findIndex((x) =>
    x.startsWith("aws cloudfront create-invalidation "),
  );
  assert.ok(
    sync >= 0 && loader > sync && invalidation > loader,
    result.calls.join("\n"),
  );
});

test("failed production sync does not publish redirects", () => {
  const result = deploy("deploy-incremental.sh", ["--skip-build"], {
    failSync: true,
  });
  assert.equal(result.status, 23, result.stderr);
  assert.equal(result.calls.length, 1);
});

test("shrinks existing values before growing values to stay within capacity during publication", () => {
  const entries = Array.from({ length: 51 }, (_, i) => ({
    Key: `r:prod:/old-${i}/`,
    Value: "/b/",
  }));
  entries.push({ Key: "r:prod:/shrink/", Value: "/" + "x".repeat(900) });
  const used = entries.reduce(
    (sum, item) =>
      sum + Buffer.byteLength(item.Key) + Buffer.byteLength(item.Value),
    0,
  );
  const otherKey = "r:pr-1:/large/";
  entries.push({
    Key: otherKey,
    Value: "x".repeat(5 * 1024 * 1024 - used - Buffer.byteLength(otherKey)),
  });
  const result = run(
    {
      redirects: [
        ...Array.from({ length: 51 }, (_, i) =>
          entry(`/old-${i}/`, "/longer-value/"),
        ),
        entry("/shrink/", "/b/"),
      ],
    },
    entries,
  );
  assert.equal(result.status, 0, result.stderr);
});
