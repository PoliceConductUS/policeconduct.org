import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

for (const [folder, current, fail, allowed] of [
  ["prod-temp", "live-folder", false, true],
  ["prod-temp", "prod-temp", false, false],
  ["retired", "live-folder", true, false],
  ["../live-folder", "live-folder", false, false],
  ["", "live-folder", false, false],
]) {
  test(`retirement ${JSON.stringify({ folder, current, fail })}`, () => {
    const dir = mkdtempSync(join(tmpdir(), "release-retirement-"));
    const log = join(dir, "calls");
    writeFileSync(log, "");
    writeFileSync(
      join(dir, "aws"),
      `#!${process.execPath}
import fs from 'node:fs';
const a=process.argv.slice(2);
fs.appendFileSync(process.env.CALL_LOG, JSON.stringify(a)+'\\n');
if (a[1] === 'get-key' && process.env.FAIL_READ === '1') process.exit(1);
console.log(JSON.stringify(a[1] === 'get-key' ? {Value:process.env.CURRENT} : a[1] === 'list-keys' ? {Items:[{Key:'r:prod-temp:/old/'},{Key:'o:prod-temp:/index.html'},{Key:'r:prod-temp:other:/old/'}]} : {ETag:'etag'}));
`,
      { mode: 0o755 },
    );
    try {
      const result = spawnSync(
        process.execPath,
        [resolve("scripts/manage-release.mjs"), "delete", folder],
        {
          env: {
            ...process.env,
            PATH: dir + ":" + process.env.PATH,
            CALL_LOG: log,
            CURRENT: current,
            FAIL_READ: fail ? "1" : "0",
            S3_BUCKET: "site",
            RELEASE_DATA_BUCKET: "private",
            KVS_ARN: "store",
          },
          encoding: "utf8",
        },
      );
      assert.equal(result.status === 0, allowed, result.stderr);
      const calls = readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(JSON.parse);
      const removals = calls.filter((a) => a[1] === "rm");
      if (allowed) {
        assert.deepEqual(
          removals.map((a) => a[2]),
          ["s3://site/prod-temp/", "s3://private/builds/prod-temp/"],
        );
        const update = calls.find((a) => a[1] === "update-keys");
        assert.equal(
          JSON.parse(update[update.indexOf("--cli-input-json") + 1]).Deletes
            .length,
          2,
        );
      } else
        assert.equal(
          calls.filter((a) => ["rm", "update-keys"].includes(a[1])).length,
          0,
        );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
