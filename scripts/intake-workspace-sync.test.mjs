import { spawn } from "node:child_process";
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readdir,
  mkdir,
  readFile,
  writeFile,
  symlink,
  rm,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runWorkspace, main } from "./intake-workspace-sync.mjs";
const roots = [];
afterEach(async () => {
  for (const p of roots.splice(0))
    await rm(p, { recursive: true, force: true });
});
async function fixture(leaf = "dev") {
  const base = await mkdtemp(path.join(os.tmpdir(), "workspace-sync-"));
  roots.push(base);
  const root = path.join(base, leaf);
  await mkdir(root);
  const versions = new Map(),
    calls = [];
  const aws = async (args) => {
    calls.push(args);
    const value = (flag) => args[args.indexOf(flag) + 1];
    if (args[1] === "get-bucket-versioning")
      return JSON.stringify({ Status: "Enabled" });
    if (args[1] === "get-bucket-tagging")
      return JSON.stringify({
        TagSet: [{ Key: "Purpose", Value: "intake-workspace" }],
      });
    if (args[1] === "list-objects-v2")
      return JSON.stringify({
        Contents: [...versions.keys()]
          .filter((k) => k.startsWith(value("--prefix")))
          .map((Key) => ({ Key })),
      });
    if (args[1] === "list-object-versions")
      return JSON.stringify({
        Versions: [...versions].flatMap(([Key, vs]) =>
          vs.map((_, i) => ({ Key, VersionId: String(i) })),
        ),
      });
    if (args[1] === "get-object") {
      const vs = versions.get(value("--key"));
      await writeFile(
        args.at(-1),
        vs[
          args.includes("--version-id")
            ? Number(value("--version-id"))
            : vs.length - 1
        ],
      );
      return "{}";
    }
    if (args[0] === "s3" && args[1] === "sync") {
      assert.ok(!args.includes("--recursive"));
      assert.ok(!args.includes("--delete"));
      if (args.includes("--dryrun")) return 1;
      let count = 0;
      const excluded = (key) =>
        (args.includes(".DS_Store") && key === ".DS_Store") ||
        (args.includes("*/.DS_Store") && key.endsWith("/.DS_Store"));
      if (args[2].startsWith("s3://")) {
        const prefix = args[2].replace("s3://fixture-workspaces/", "");
        for (const [key, versionsForKey] of versions) {
          if (!key.startsWith(prefix) || excluded(key)) continue;
          const file = path.join(args[3], key.slice(prefix.length));
          await mkdir(path.dirname(file), { recursive: true });
          await writeFile(file, versionsForKey.at(-1));
          count++;
        }
      } else {
        const prefix = args[3].replace("s3://fixture-workspaces/", "");
        for (const entry of await readdir(args[2], {
          recursive: true,
          withFileTypes: true,
        })) {
          if (!entry.isFile()) continue;
          const file = path.join(entry.parentPath, entry.name);
          const relative = path
            .relative(args[2], file)
            .split(path.sep)
            .join("/");
          if (excluded(relative)) continue;
          const key = prefix + relative;
          const prior = versions.get(key) ?? [];
          prior.push(await readFile(file, "utf8"));
          versions.set(key, prior);
          count++;
        }
      }
      return count;
    }
    throw Error("Unexpected AWS operation");
  };
  const run = (options = {}) =>
    runWorkspace(
      {
        operation: "sync",
        direction: "upload",
        bucket: "fixture-workspaces",
        ...options,
      },
      { env: { INTAKE_WORKSPACE: root }, aws },
    );
  return { base, root, versions, calls, run, aws };
}
for (const environment of ["dev", "preview", "production"])
  test(`upload isolates ${environment} and preserves mapping bytes`, async () => {
    const f = await fixture(environment);
    await mkdir(path.join(f.root, "state"));
    await writeFile(
      path.join(f.root, "state/mapping.yaml"),
      "stable-id: fixture\n",
    );
    const r = await f.run();
    assert.equal(r.exitCode, 0, r.stderr);
    assert.deepEqual(
      [...f.versions],
      [[`${environment}/state/mapping.yaml`, ["stable-id: fixture\n"]]],
    );
  });
test("download retains overwritten evidence in a backup and keeps destination-only files", async () => {
  const f = await fixture("preview");
  f.versions.set("preview/evidence.txt", ["remote"]);
  f.versions.set("production/evidence.txt", ["private"]);
  await writeFile(path.join(f.root, "evidence.txt"), "local");
  await writeFile(path.join(f.root, "extra.txt"), "keep");
  const r = await f.run({ direction: "download" });
  assert.equal(r.exitCode, 0, r.stderr);
  assert.equal(
    await readFile(path.join(f.root, "evidence.txt"), "utf8"),
    "remote",
  );
  assert.equal(await readFile(path.join(f.root, "extra.txt"), "utf8"), "keep");
  const backup = r.stdout.match(/Backup: (.+)/)[1];
  assert.equal(
    await readFile(path.join(backup, "evidence.txt"), "utf8"),
    "local",
  );
});
test("explicit old-version recovery preserves both S3 revisions", async () => {
  const f = await fixture(),
    file = path.join(f.root, "evidence.txt");
  await writeFile(file, "first");
  await f.run();
  await writeFile(file, "second");
  await f.run();
  const listed = await f.run({ operation: "versions", key: "evidence.txt" });
  assert.match(listed.stdout, /"VersionId": "0"/);
  const r = await f.run({
    operation: "restore",
    key: "evidence.txt",
    versionId: "0",
  });
  assert.equal(r.exitCode, 0, r.stderr);
  assert.equal(await readFile(file, "utf8"), "first");
  assert.deepEqual(f.versions.get("dev/evidence.txt"), ["first", "second"]);
});
for (const options of [
  { environment: "../production" },
  { direction: "sideways" },
  { bucket: "hosting/path" },
  { key: "../escape", operation: "restore", versionId: "0" },
])
  test(`rejects invalid options ${JSON.stringify(options)} before AWS`, async () => {
    const f = await fixture();
    assert.equal((await f.run(options)).exitCode, 1);
    assert.deepEqual(f.calls, []);
  });
test("missing and symlink workspaces fail before AWS", async () => {
  const f = await fixture();
  assert.equal(
    (
      await runWorkspace(
        {
          operation: "sync",
          direction: "upload",
          bucket: "fixture-workspaces",
        },
        { env: {}, aws: f.aws },
      )
    ).exitCode,
    1,
  );
  const alias = path.join(f.base, "alias");
  await symlink(f.root, alias);
  assert.equal(
    (
      await runWorkspace(
        {
          operation: "sync",
          direction: "upload",
          bucket: "fixture-workspaces",
        },
        { env: { INTAKE_WORKSPACE: alias }, aws: f.aws },
      )
    ).exitCode,
    1,
  );
  assert.deepEqual(f.calls, []);
});
test("remote traversal fails before any download", async () => {
  const f = await fixture();
  f.versions.set("dev/../escape", ["bad"]);
  assert.equal((await f.run({ direction: "download" })).exitCode, 1);
  assert.ok(!f.calls.some((a) => a[1] === "get-object"));
});
for (const direction of ["upload", "download"])
  test(`dry-run ${direction} never transfers bytes`, async () => {
    const f = await fixture();
    await writeFile(path.join(f.root, "a"), "local");
    f.versions.set("dev/a", ["remote"]);
    assert.equal((await f.run({ direction, dryRun: true })).exitCode, 0);
    assert.equal(await readFile(path.join(f.root, "a"), "utf8"), "local");
    assert.deepEqual(f.versions.get("dev/a"), ["remote"]);
    assert.ok(!f.calls.some((a) => ["cp", "get-object"].includes(a[1])));
  });
test("syncs all folder names on upload and download", async () => {
  const f = await fixture();
  for (const dir of ["dev-copy", "nested/dev-copy"]) {
    await mkdir(path.join(f.root, dir), { recursive: true });
    await writeFile(path.join(f.root, dir, "private"), "omit");
  }
  await writeFile(path.join(f.root, "keep"), "keep");
  const up = await f.run();
  assert.equal(up.exitCode, 0, up.stderr);
  assert.deepEqual([...f.versions.keys()].sort(), [
    "dev/dev-copy/private",
    "dev/keep",
    "dev/nested/dev-copy/private",
  ]);
  f.versions.set("dev/other/dev-copy/private", ["never"]);
  const down = await f.run({ direction: "download" });
  assert.equal(down.exitCode, 0, down.stderr);
  assert.equal(
    await readFile(path.join(f.root, "other/dev-copy/private"), "utf8"),
    "never",
  );
  const restored = await f.run({
    operation: "restore",
    key: "dev-copy/private",
    versionId: "0",
  });
  assert.equal(restored.exitCode, 0, restored.stderr);
});
for (const [response, message] of [
  ["{}", "versioning"],
  ['{"Status":"Suspended"}', "versioning"],
])
  test(`refuses unversioned bucket ${response}`, async () => {
    const f = await fixture();
    const r = await runWorkspace(
      {
        operation: "sync",
        direction: "upload",
        bucket: "fixture-workspaces",
      },
      { env: { INTAKE_WORKSPACE: f.root }, aws: async () => response },
    );
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, new RegExp(message));
  });
test("refuses hosting bucket without workspace purpose tag", async () => {
  const f = await fixture();
  const r = await runWorkspace(
    {
      operation: "sync",
      direction: "upload",
      bucket: "fixture-workspaces",
    },
    {
      env: { INTAKE_WORKSPACE: f.root },
      aws: async (args) =>
        args[1] === "get-bucket-versioning"
          ? ' {"Status":"Enabled"}'
          : '{"TagSet":[]}',
    },
  );
  assert.equal(r.exitCode, 1);
  assert.match(r.stderr, /not tagged/);
});
test("AWS errors fail loudly", async () => {
  const f = await fixture();
  const r = await runWorkspace(
    {
      operation: "sync",
      direction: "upload",
      bucket: "fixture-workspaces",
    },
    {
      env: { INTAKE_WORKSPACE: f.root },
      aws: async () => {
        throw Error("AccessDenied");
      },
    },
  );
  assert.equal(r.exitCode, 1);
  assert.match(r.stderr, /AccessDenied/);
});
test("CLI rejects missing command and unknown options", async () => {
  await assert.rejects(() => main([]), /Usage/);
  await assert.rejects(() => main(["sync", "--delete"]), /Unknown option/);
});

test("missing bucket is rejected before AWS calls", async () => {
  const f = await fixture();
  assert.equal((await f.run({ bucket: undefined })).exitCode, 1);
  assert.deepEqual(f.calls, []);
});
test("conflicting remote file and directory keys fail before download", async () => {
  const f = await fixture();
  f.versions.set("dev/a", ["file"]);
  f.versions.set("dev/a/b", ["nested"]);
  assert.equal((await f.run({ direction: "download" })).exitCode, 1);
  assert.ok(!f.calls.some((a) => a[1] === "get-object"));
});
test("versions lists only the exact requested key", async () => {
  const f = await fixture();
  f.versions.set("dev/a", ["first"]);
  f.versions.set("dev/ab", ["other"]);
  const r = await f.run({ operation: "versions", key: "a" });
  assert.equal(r.exitCode, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout).Versions, [
    { Key: "dev/a", VersionId: "0" },
  ]);
});

test("whole-folder push and pull preserve all subfolders", async () => {
  const f = await fixture("workspace");
  for (const folder of [
    "dev",
    "preview",
    "clearinghouse-api",
    "dev-copy",
    "dev/dev-copy",
  ]) {
    await mkdir(path.join(f.root, folder), { recursive: true });
    await writeFile(path.join(f.root, folder, "evidence.txt"), folder);
  }
  const pushed = await f.run({ environment: undefined });
  assert.equal(pushed.exitCode, 0, pushed.stderr);
  assert.deepEqual([...f.versions.keys()].sort(), [
    "workspace/clearinghouse-api/evidence.txt",
    "workspace/dev-copy/evidence.txt",
    "workspace/dev/dev-copy/evidence.txt",
    "workspace/dev/evidence.txt",
    "workspace/preview/evidence.txt",
  ]);
  await writeFile(path.join(f.root, "dev/evidence.txt"), "changed");
  const dry = await f.run({
    environment: undefined,
    direction: "download",
    dryRun: true,
  });
  assert.equal(dry.exitCode, 0, dry.stderr);
  assert.equal(
    await readFile(path.join(f.root, "dev/evidence.txt"), "utf8"),
    "changed",
  );
  const pulled = await f.run({ environment: undefined, direction: "download" });
  assert.equal(pulled.exitCode, 0, pulled.stderr);
  assert.equal(
    await readFile(path.join(f.root, "dev/evidence.txt"), "utf8"),
    "dev",
  );
});

test("sync reports AWS skipped files and forwards dry-run without writes", async () => {
  const f = await fixture();
  await writeFile(path.join(f.root, "a"), "same");
  const calls = [];
  const aws = async (args) => {
    if (args[0] !== "s3") return f.aws(args);
    calls.push(args);
    return 0; // AWS determined all files were unchanged.
  };
  for (const dryRun of [true, false]) {
    const result = await runWorkspace(
      {
        operation: "sync",
        direction: "upload",
        bucket: "fixture-workspaces",
        dryRun,
      },
      { env: { INTAKE_WORKSPACE: f.root }, aws },
    );
    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /0 files (planned|transferred)/);
    assert.equal(calls.at(-1)[1], "sync");
    assert.equal(calls.at(-1).includes("--dryrun"), dryRun);
    assert.ok(!calls.at(-1).includes("--delete"));
  }
});

test("push delegates traversal to AWS and skips nested symlinks", async () => {
  const f = await fixture("workspace");
  await symlink(f.base, path.join(f.root, "escape"));
  const calls = [];
  const aws = async (args) => {
    calls.push(args);
    if (args[0] === "s3") return 0;
    return f.aws(args);
  };
  const result = await runWorkspace(
    {
      operation: "sync",
      direction: "upload",
      bucket: "fixture-workspaces",
      dryRun: true,
    },
    { env: { INTAKE_WORKSPACE: f.root }, aws },
  );
  assert.equal(result.exitCode, 0, result.stderr);
  const sync = calls.find((args) => args[1] === "sync");
  assert.equal(sync[3], "s3://fixture-workspaces/workspace/");
  assert.ok(sync.includes("--dryrun"));
  assert.ok(sync.includes("--no-follow-symlinks"));
  assert.equal(f.versions.size, 0);
});

for (const direction of ["upload", "download"]) {
  test(
    `${direction} streams AWS output before the process exits`,
    { timeout: 10000 },
    async () => {
      const f = await fixture();
      const bin = path.join(f.root, "bin");
      await mkdir(bin);
      const marker = path.join(f.root, "progress-seen");
      await writeFile(
        path.join(bin, "aws"),
        `#!/bin/sh
case "$2" in
  get-bucket-versioning) echo '{"Status":"Enabled"}' ;;
  get-bucket-tagging) echo '{"TagSet":[{"Key":"Purpose","Value":"intake-workspace"}]}' ;;
  list-objects-v2) echo '{"Contents":[]}' ;;
  sync)
    printf 'Completed 1 MiB\\r'
    while [ ! -f "$PROGRESS_MARKER" ]; do sleep 0.05; done
    echo '${direction}: fixture'
    ;;
esac
`,
        { mode: 0o755 },
      );
      const child = spawn(
        process.execPath,
        [
          "scripts/intake-workspace-sync.mjs",
          "sync",
          "--direction",
          direction,
          "--bucket",
          "fixture-workspaces",
        ],
        {
          env: {
            ...process.env,
            PATH: bin + path.delimiter + process.env.PATH,
            INTAKE_WORKSPACE: f.root,
            PROGRESS_MARKER: marker,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let output = "",
        errors = "",
        observed = false;
      child.stdout.on("data", (chunk) => {
        output += chunk;
        if (!observed && output.includes("Completed 1 MiB")) {
          observed = true;
          writeFile(marker, "seen").catch(() => child.kill());
        }
      });
      child.stderr.on("data", (chunk) => {
        errors += chunk;
      });
      const timer = setTimeout(() => child.kill(), 5000);
      const code = await new Promise((resolve, reject) => {
        child.on("error", reject);
        child.on("close", resolve);
      });
      clearTimeout(timer);
      assert.equal(code, 0, errors + output);
      assert.ok(
        observed,
        "progress must arrive while AWS is waiting for acknowledgement",
      );
      assert.match(output, /1 files transferred/);
      assert.ok(
        output.indexOf("Validating workspace storage") <
          output.indexOf("Completed 1 MiB"),
      );
    },
  );
}

for (const direction of ["upload", "download"])
  test(`${direction} excludes root and nested Finder metadata`, async () => {
    const f = await fixture();
    const files = [
      ".DS_Store",
      "nested/deep/.DS_Store",
      "nested/evidence.json",
    ];
    for (const key of files) {
      if (direction === "upload") {
        await mkdir(path.dirname(path.join(f.root, key)), { recursive: true });
        await writeFile(path.join(f.root, key), "fixture");
      } else f.versions.set(`dev/${key}`, ["fixture"]);
    }
    const result = await f.run({ direction });
    assert.equal(result.exitCode, 0, result.stderr);
    if (direction === "upload")
      assert.deepEqual([...f.versions.keys()], ["dev/nested/evidence.json"]);
    else {
      assert.equal(
        await readFile(path.join(f.root, "nested/evidence.json"), "utf8"),
        "fixture",
      );
      for (const key of files.slice(0, 2))
        await assert.rejects(readFile(path.join(f.root, key)), {
          code: "ENOENT",
        });
    }
    const dry = await f.run({ direction, dryRun: true });
    assert.equal(dry.exitCode, 0, dry.stderr);
    for (const call of f.calls.filter((args) => args[1] === "sync")) {
      assert.ok(call.includes(".DS_Store"));
      assert.ok(call.includes("*/.DS_Store"));
    }
  });
