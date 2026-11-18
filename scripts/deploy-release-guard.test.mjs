import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
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

function initializeRepository(dir) {
  writeFileSync(join(dir, ".gitignore"), "dist/\n.release/\ncalls\nbin/\n");
  const git = (...args) => {
    const result = spawnSync("/usr/bin/git", ["-C", dir, ...args], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "-b", "main");
  git("add", ".");
  git(
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "-m",
    "fixture",
  );
  return git("rev-parse", "HEAD");
}

for (const [name, script, args, builds] of [
  ["preview sync", "deploy.sh", ["preview", "--skip-build"], false],
  ["preview build", "deploy.sh", ["preview"], true],
  ["production build", "deploy.sh", ["prod"], true],
  ["production existing build", "deploy.sh", ["prod", "--skip-build"], false],
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
        mkdirSync(join(root, ".release/data"), { recursive: true });
        writeFileSync(join(root, ".release/data/index.json"), "{}");
        writeFileSync(
          join(root, ".release/data/alias.json"),
          JSON.stringify({ CoverageLink: {} }),
        );
        writeFileSync(join(root, ".release/data/dynamic.json"), "{}");
        const preview = name.startsWith("preview");
        let releaseId;
        for (const file of [
          "deploy.sh",
          "upload-release.sh",
          "release-files.mjs",
          "terraform-outputs.mjs",
        ]) {
          copyFileSync(
            new URL(file, import.meta.url),
            join(root, "scripts", file),
          );
        }
        releaseId = initializeRepository(root);
        writeFileSync(join(root, ".release/id"), releaseId);
        writeFileSync(
          join(root, ".release/source.json"),
          JSON.stringify({
            commit: releaseId,
            branch: preview ? "feature" : "main",
            pr: preview ? "123" : null,
          }),
        );
        const seal = spawnSync(
          process.execPath,
          ["scripts/release-files.mjs", "--record", releaseId],
          { cwd: root },
        );
        assert.equal(seal.status, 0, seal.stderr.toString());
        const log = join(root, "calls");
        writeFileSync(log, "");
        for (const [command, body] of Object.entries({
          git: 'exec /usr/bin/git "$@"',
          npm: 'echo "npm $*" >> "$CALL_LOG"\nif [[ "$*" == "run validate:redirects" ]]; then exit "$COVERAGE_EXIT"; fi',
          aws: 'echo "aws $*" >> "$CALL_LOG"\nexit 71',
          node: 'if [[ "$1" == scripts/release-files.mjs || "$1" == scripts/terraform-outputs.mjs ]]; then exec "$TEST_NODE" "$@"; fi\necho "node $*" >> "$CALL_LOG"\nexit 72',
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
              "aws s3 sync dist/ s3://fixture-(preview|production)/" +
                releaseId +
                "/build/",
            ),
          );
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  }
}

test("successful builds bind matching folder IDs to the site and private roster; failed builds cannot deploy", () => {
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
    copyFileSync(
      new URL("terraform-outputs.mjs", import.meta.url),
      join(dir, "scripts/terraform-outputs.mjs"),
    );
    const commit = initializeRepository(dir);
    const build = (env = {}) =>
      spawnSync(process.execPath, ["scripts/build-release.mjs"], {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: join(dir, "bin") + ":" + process.env.PATH,
          BUILD_EXIT: "0",
          RELEASE_ID: "",
          RECAPTCHA_SITE_KEY: "fixture-site-key",
          ...env,
        },
      });
    assert.match(
      build({ RELEASE_ID: "prod-temp" }).stderr,
      /current commit hash/,
    );
    for (const staged of [false, true]) {
      writeFileSync(join(dir, "new-source.txt"), "uncommitted");
      if (staged)
        spawnSync("/usr/bin/git", ["-C", dir, "add", "new-source.txt"]);
      assert.match(build().stderr, /clean repository/);
      if (staged)
        spawnSync("/usr/bin/git", ["-C", dir, "reset", "--", "new-source.txt"]);
      rmSync(join(dir, "new-source.txt"));
    }
    const original = readFileSync(
      join(dir, "scripts/write-release-news.mjs"),
      "utf8",
    );
    writeFileSync(join(dir, "scripts/write-release-news.mjs"), original + "\n");
    assert.match(build().stderr, /clean repository/);
    writeFileSync(join(dir, "scripts/write-release-news.mjs"), original);
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
            RECAPTCHA_SITE_KEY: "fixture-site-key",
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
      assert.equal(id, commit);
      assert.equal(
        readFileSync(join(dir, "dist/index.html"), "utf8").trim(),
        id,
      );
      assert.equal(
        readFileSync(join(dir, ".release/data/dynamic.json"), "utf8"),
        id,
      );
      // The router denies crawlers on non-production hosts; the build never does.
      assert.equal(existsSync(join(dir, "dist/robots.txt")), false);
      const check = () =>
        spawnSync(
          process.execPath,
          ["scripts/release-files.mjs", "--verify", id],
          { cwd: dir },
        );
      assert.equal(check().status, 0);
      writeFileSync(join(dir, "untracked.txt"), "dirty");
      assert.match(check().stderr.toString(), /clean repository/);
      rmSync(join(dir, "untracked.txt"));
      const wrongCommit = spawnSync(
        process.execPath,
        ["scripts/release-files.mjs", "--verify", "prod-temp"],
        { cwd: dir },
      );
      assert.match(wrongCommit.stderr.toString(), /current commit hash/);

      writeFileSync(join(dir, "dist/index.html"), "different build");
      assert.notEqual(check().status, 0);
      const productionCheck = spawnSync(
        process.execPath,
        ["scripts/release-files.mjs", "--verify", id, "prod"],
        { cwd: dir },
      );
      // Restore the modified page so this assertion checks source identity, not the inventory.
      writeFileSync(join(dir, "dist/index.html"), id + "\n");
      const sourceCheck = spawnSync(
        process.execPath,
        ["scripts/release-files.mjs", "--verify", id, "prod"],
        { cwd: dir },
      );
      assert.notEqual(productionCheck.status, 0);
      assert.equal(
        sourceCheck.status === 0,
        !pr,
        sourceCheck.stderr.toString(),
      );
      ids.add(id);
    }
    assert.equal(ids.size, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("closing a preview removes its host pointer without deleting a shared commit folder", () => {
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
    const update = calls.find((args) => args[1] === "update-keys");
    assert.deepEqual(
      JSON.parse(update[update.indexOf("--cli-input-json") + 1]).Deletes,
      [{ Key: "current:pr-12" }],
    );
    assert.deepEqual(
      calls.filter((args) => args[1] === "rm").map((args) => args[2]),
      [],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("promote.sh explains each guard failure on standard error", () => {
  const env = {
    ...process.env,
    S3_BUCKET: "fixture-site",
    RELEASE_DATA_BUCKET: "fixture-data",
    KVS_ARN: "fixture-kvs",
    CLOUDFRONT_DIST_ID: "fixture-dist",
  };
  for (const [args, message] of [
    [["fixture", "Bad Label"], /Expected namespace prod or a label/],
    [["fix\tture"], /Release ID must not contain control characters\./],
  ]) {
    const run = spawnSync("bash", [resolve("scripts/promote.sh"), ...args], {
      encoding: "utf8",
      env,
    });
    assert.equal(run.status, 1);
    assert.match(run.stderr, message);
  }
});

test("a production release build is given the Sentry token from Parameter Store, and no other build is", () => {
  const dir = mkdtempSync(join(resolve(tmpdir()), "build-release-sentry-"));
  try {
    mkdirSync(join(dir, "scripts"));
    mkdirSync(join(dir, "bin"));
    for (const file of [
      "build-release.mjs",
      "release-files.mjs",
      "terraform-outputs.mjs",
    ]) {
      copyFileSync(new URL(file, import.meta.url), join(dir, "scripts", file));
    }
    writeFileSync(
      join(dir, "scripts/write-release-news.mjs"),
      "import fs from 'node:fs'; fs.mkdirSync('.release/data'); fs.writeFileSync('.release/data/dynamic.json', process.env.RELEASE_ID);",
    );
    writeFileSync(
      join(dir, "bin/npm"),
      '#!/bin/sh\nmkdir -p dist && echo "$RELEASE_ID" > dist/index.html && printf "%s|%s|%s" "$SENTRY_AUTH_TOKEN" "$SENTRY_ORG" "$SENTRY_PROJECT" > "$BUILD_ENV_LOG"\n',
      { mode: 0o755 },
    );
    writeFileSync(
      join(dir, "bin/aws"),
      '#!/bin/sh\necho "aws $*" >> "$AWS_LOG"\nprintf "%s\\tstored-token\\n" "${PARAMETER_TYPE:-SecureString}"\n',
      { mode: 0o755 },
    );
    initializeRepository(dir);
    const awsLog = join(dir, "calls");
    // Both logs sit under paths the fixture repository ignores.
    const buildEnvLog = join(dir, "bin", "build-env");
    const run = (extra) => {
      writeFileSync(awsLog, "");
      return spawnSync(process.execPath, ["scripts/build-release.mjs"], {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: join(dir, "bin") + ":" + process.env.PATH,
          RELEASE_ID: "",
          RECAPTCHA_SITE_KEY: "fixture-site-key",
          SENTRY_ORG: "fixture-org",
          SENTRY_PROJECT: "fixture-project",
          SENTRY_AUTH_TOKEN: "",
          AWS_LOG: awsLog,
          BUILD_ENV_LOG: buildEnvLog,
          ...extra,
        },
      });
    };
    const build = (extra) => {
      const result = run(extra);
      assert.equal(result.status, 0, result.stderr);
      return {
        buildEnv: readFileSync(buildEnvLog, "utf8"),
        aws: readFileSync(awsLog, "utf8"),
      };
    };

    const ordinary = build({});
    assert.equal(ordinary.buildEnv, "|fixture-org|fixture-project");
    assert.equal(ordinary.aws, "");

    rmSync(join(dir, "dist"), { recursive: true, force: true });
    const production = build({ SENTRY_SOURCEMAPS: "upload" });
    assert.equal(
      production.buildEnv,
      "stored-token|fixture-org|fixture-project",
    );
    assert.match(
      production.aws,
      /^aws ssm get-parameter .*--name \/policeconduct\.org\/default\/secrets\/SENTRY_AUTH_TOKEN --with-decryption/,
    );

    rmSync(join(dir, "dist"), { recursive: true, force: true });
    rmSync(buildEnvLog);
    const plain = run({
      SENTRY_SOURCEMAPS: "upload",
      PARAMETER_TYPE: "String",
    });
    assert.notEqual(plain.status, 0);
    assert.match(
      plain.stderr,
      /SENTRY_AUTH_TOKEN in Parameter Store must be a SecureString, but its type is 'String'/,
    );
    assert.equal(existsSync(buildEnvLog), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
