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
import { join } from "node:path";
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
      const root = mkdtempSync(join(tmpdir(), "deploy-release-guard-"));
      try {
        mkdirSync(join(root, "scripts"));
        mkdirSync(join(root, "bin"));
        mkdirSync(join(root, "dist"));
        writeFileSync(join(root, "dist/index.html"), "fixture");
        for (const file of [
          "deploy-preview.sh",
          "deploy-preview-sync.sh",
          "deploy-incremental.sh",
        ]) {
          copyFileSync(
            new URL(file, import.meta.url),
            join(root, "scripts", file),
          );
        }
        const log = join(root, "calls");
        writeFileSync(log, "");
        for (const [command, body] of Object.entries({
          npm: 'echo "npm $*" >> "$CALL_LOG"\nif [[ "$*" == "run validate:redirects" ]]; then exit "$COVERAGE_EXIT"; fi',
          aws: 'echo "aws $*" >> "$CALL_LOG"\nexit 71',
          node: 'echo "node $*" >> "$CALL_LOG"\nexit 72',
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
              PATH: `${join(root, "bin")}:${process.env.PATH}`,
              CALL_LOG: log,
              COVERAGE_EXIT: fails ? "42" : "0",
              PR_NUMBER: "123",
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
          assert.match(calls[expected.length], /^aws s3 sync /);
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  }
}
