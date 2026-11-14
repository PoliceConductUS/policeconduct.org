import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

for (const [name, script, args, builds] of [
  ["preview sync", "deploy-preview-sync.sh", [], false],
  ["preview build", "deploy-preview.sh", [], true],
  ["production build", "deploy-incremental.sh", [], true],
  [
    "production existing build",
    "deploy-incremental.sh",
    ["--skip-build"],
    false,
  ],
]) {
  for (const fails of [true, false]) {
    test(`${name}: ${fails ? "failed coverage stops publishing" : "coverage precedes publishing"}`, () => {
      const root = mkdtempSync(
        join(resolve(tmpdir()), "deploy-release-guard-"),
      );
      try {
        mkdirSync(join(root, "scripts"));
        mkdirSync(join(root, "bin"));
        mkdirSync(join(root, "dist"));
        writeFileSync(join(root, "dist/index.html"), "fixture");
        writeFileSync(
          join(root, "dist/robots.txt"),
          "User-agent: *\nDisallow: /\n",
        );
        mkdirSync(join(root, ".release/data"), { recursive: true });
        writeFileSync(join(root, ".release/data/index.json"), "{}");
        writeFileSync(
          join(root, ".release/data/alias.json"),
          JSON.stringify({ CoverageLink: {} }),
        );
        writeFileSync(join(root, ".release/data/dynamic.json"), "{}");
        const preview = name.startsWith("preview");
        const releaseId =
          (preview ? "pr-123" : "prod") +
          "-d4a88441-6cef-49c8-a679-791cb5ae4e64";
        writeFileSync(join(root, ".release/id"), releaseId);
        for (const file of [
          "deploy-preview.sh",
          "upload-release.sh",
          "release-files.mjs",
          "deploy-preview-sync.sh",
          "deploy-incremental.sh",
        ]) {
          copyFileSync(
            new URL(file, import.meta.url),
            join(root, "scripts", file),
          );
        }
        const seal = spawnSync(
          process.execPath,
          ["scripts/release-files.mjs", "--record", releaseId],
          { cwd: root },
        );
        assert.equal(seal.status, 0, seal.stderr.toString());
        const log = join(root, "calls");
        writeFileSync(log, "");
        for (const [command, body] of Object.entries({
          npm: 'echo "npm $*" >> "$CALL_LOG"\nif [[ "$*" == "run validate:redirects" ]]; then exit "$COVERAGE_EXIT"; fi',
          aws: 'echo "aws $*" >> "$CALL_LOG"\nexit 71',
          node: 'if [[ "$1" == scripts/release-files.mjs ]]; then exec "$TEST_NODE" "$@"; fi\necho "node $*" >> "$CALL_LOG"\nexit 72',
        })) {
          writeFileSync(
            join(root, "bin", command),
            `#!/usr/bin/env bash\n${body}\n`,
            { mode: 0o755 },
          );
        }
        const result = spawnSync(
          "bash",
          [join(root, "scripts", script), ...args],
          {
            encoding: "utf8",
            env: {
              ...process.env,
              // Shell startup files must not replace the fixture command PATH.
              BASH_ENV: "/dev/null",
              ENV: "/dev/null",
              PATH: `${join(root, "bin")}:${process.env.PATH}`,
              TEST_NODE: process.execPath,
              CALL_LOG: log,
              COVERAGE_EXIT: fails ? "42" : "0",
              PR_NUMBER: preview ? "123" : "",
              RELEASE_DATA_BUCKET: "fixture-data",
              RELEASE_DATA_BUCKET_PREVIEW: "fixture-preview-data",
              S3_BUCKET_PREVIEW: "fixture-preview",
              KVS_ARN_PREVIEW: "fixture-preview-kvs",
              CLOUDFRONT_DIST_PREVIEW: "fixture-preview-dist",
              S3_BUCKET: "fixture-production",
              KVS_ARN: "fixture-production-kvs",
              CLOUDFRONT_DIST_ID: "fixture-production-dist",
              GIT_COMMIT_SHA: "fixture",
              GIT_COMMIT_DIRTY: "0",
              SYNC_MAX_ATTEMPTS: "1",
            },
          },
        );
        const calls = readFileSync(log, "utf8").trim().split("\n");
        const expected = [
          ...(builds ? ["npm run build"] : []),
          "npm run validate:redirects",
        ];
        assert.deepEqual(
          calls.slice(0, expected.length),
          expected,
          result.stdout + result.stderr,
        );
        if (fails) {
          assert.equal(result.status, 42, result.stderr);
          assert.deepEqual(
            calls,
            expected,
            "No AWS or redirect loader calls may occur",
          );
        } else {
          assert.equal(result.status, 71, result.stdout + result.stderr);
          assert.match(
            calls[expected.length],
            new RegExp(
              "aws s3 sync dist/ s3://fixture-(preview|production)/builds/" +
                releaseId +
                "/static/",
            ),
          );
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  }
}

test("successful builds bind matching distinct IDs to the site and private roster; failed builds cannot deploy", () => {
  const dir = mkdtempSync(join(resolve(tmpdir()), "build-release-"));
  try {
    mkdirSync(join(dir, "scripts"));
    mkdirSync(join(dir, "bin"));
    copyFileSync(
      new URL("build-release.mjs", import.meta.url),
      join(dir, "scripts/build-release.mjs"),
    );
    writeFileSync(
      join(dir, "scripts/write-release-news.mjs"),
      "import fs from 'node:fs'; fs.mkdirSync('.release/data'); fs.writeFileSync('.release/data/dynamic.json', process.env.RELEASE_ID);",
    );
    writeFileSync(
      join(dir, "bin/npm"),
      '#!/bin/sh\ntest "$1 $2" = "run build:site" && mkdir -p dist && echo "$RELEASE_ID" > dist/index.html && exit "$BUILD_EXIT"\n',
      { mode: 0o755 },
    );
    copyFileSync(
      new URL("release-files.mjs", import.meta.url),
      join(dir, "scripts/release-files.mjs"),
    );
    const ids = new Set();
    for (const [pr, exit] of [
      ["", "0"],
      ["", "0"],
      ["42", "0"],
      ["42", "1"],
    ]) {
      const result = spawnSync(
        process.execPath,
        ["scripts/build-release.mjs"],
        {
          cwd: dir,
          env: {
            ...process.env,
            PATH: join(dir, "bin") + ":" + process.env.PATH,
            PR_NUMBER: pr,
            BUILD_EXIT: exit,
          },
        },
      );
      if (exit !== "0") {
        assert.notEqual(result.status, 0);
        assert.throws(() => readFileSync(join(dir, ".release/id")), {
          code: "ENOENT",
        });
        assert.throws(
          () => readFileSync(join(dir, ".release/data/dynamic.json")),
          { code: "ENOENT" },
        );
        continue;
      }
      assert.equal(result.status, 0, result.stderr.toString());
      const id = readFileSync(join(dir, ".release/id"), "utf8").trim();
      assert.match(id, pr ? /^pr-42-/ : /^prod-/);
      assert.equal(
        readFileSync(join(dir, "dist/index.html"), "utf8").trim(),
        id,
      );
      assert.equal(
        readFileSync(join(dir, ".release/data/dynamic.json"), "utf8"),
        id,
      );
      if (pr)
        assert.equal(
          readFileSync(join(dir, "dist/robots.txt"), "utf8"),
          "User-agent: *\nDisallow: /\n",
        );
      const check = () =>
        spawnSync(
          process.execPath,
          ["scripts/release-files.mjs", "--verify", id],
          { cwd: dir },
        );
      assert.equal(check().status, 0);
      writeFileSync(join(dir, "dist/index.html"), "different build");
      assert.notEqual(check().status, 0);
      ids.add(id);
    }
    assert.equal(ids.size, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("closing a preview removes all of that PR's public releases and routes", () => {
  const dir = mkdtempSync(join(resolve(tmpdir()), "preview-cleanup-"));
  try {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ type: "commonjs" }),
    );
    const log = join(dir, "aws.log");
    writeFileSync(
      join(dir, "aws"),
      `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALL_LOG, JSON.stringify(args) + '\\n');
const data = args[1] === 'list-objects-v2'
  ? {CommonPrefixes: [{Prefix:'builds/pr-12-a/'}, {Prefix:'builds/pr-12-b/'}]}
  : args[1] === 'list-keys'
  ? {Items:['current:pr-12', 'r:pr-12-a:/old/', 'o:pr-12-b:/index.html', 'current:pr-123', 'r:pr-123-a:/old/'].map(Key => ({Key}))}
  : {ETag: 'etag'};
process.stdout.write(JSON.stringify(data));`,
      { mode: 0o755 },
    );
    const env = {
      ...process.env,
      PATH: dir + ":" + process.env.PATH,
      CALL_LOG: log,
      PR_NUMBER: "12",
      KVS_ARN_PREVIEW: "preview-kvs",
      S3_BUCKET_PREVIEW: "preview",
    };
    const run = spawnSync(
      process.execPath,
      [resolve("scripts/cleanup-preview.mjs")],
      { env },
    );
    assert.equal(run.status, 0, run.stderr.toString());
    const calls = readFileSync(log, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(calls[0][calls[0].indexOf("--prefix") + 1], "builds/pr-12-");
    const update = calls.find((args) => args[1] === "update-keys");
    assert.deepEqual(
      JSON.parse(update[update.indexOf("--cli-input-json") + 1]).Deletes,
      [
        { Key: "current:pr-12" },
        { Key: "r:pr-12-a:/old/" },
        { Key: "o:pr-12-b:/index.html" },
      ],
    );
    assert.deepEqual(
      calls.filter((args) => args[1] === "rm").map((args) => args[2]),
      ["s3://preview/builds/pr-12-a/", "s3://preview/builds/pr-12-b/"],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
