import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = resolve("scripts/audit-parameter-store.mjs");

function run(t, parameters, overrides = {}) {
  const dir = mkdtempSync(join(resolve(tmpdir()), "parameter-audit-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(
    join(bin, "aws"),
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CALL_LOG"
if [[ -n "$AWS_FAILS" ]]; then echo "AccessDenied" >&2; exit 254; fi
printf '%s' "$PARAMETERS_JSON"
`,
    { mode: 0o755 },
  );
  const callLog = join(dir, "calls");
  writeFileSync(callLog, "");
  const result = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      CALL_LOG: callLog,
      PARAMETERS_JSON: JSON.stringify(parameters),
      PARAMETER_STORE_REGION: "",
      AWS_FAILS: "",
      ...overrides,
    },
  });
  return { result, calls: readFileSync(callLog, "utf8") };
}

test("SecureString parameters and the allowed plain String pass, and no value is read", (t) => {
  const { result, calls } = run(t, [
    ["/policeconduct/config/default/GOOGLE_CLOUD_PROJECT", "String"],
    ["/policeconduct/secrets/GITHUB_TOKEN", "SecureString"],
    ["/policeconduct/secrets/RESEND_API_KEY", "SecureString"],
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /3 parameter\(s\) under \/policeconduct\/ checked/,
  );
  const lines = calls.trim().split("\n");
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^ssm describe-parameters /);
  assert.match(lines[0], /--region us-east-1/);
  assert.match(
    lines[0],
    /--parameter-filters Key=Path,Option=Recursive,Values=\/policeconduct /,
  );
  assert.doesNotMatch(lines[0], /get-parameter|with-decryption/);
});

test("a secret stored as a plain String fails and is named", (t) => {
  const { result } = run(t, [
    ["/policeconduct/secrets/GITHUB_TOKEN", "SecureString"],
    ["/policeconduct/secrets/RESEND_API_KEY", "String"],
  ]);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /\/policeconduct\/secrets\/RESEND_API_KEY in Parameter Store must be a SecureString, but its type is 'String'/,
  );
  assert.doesNotMatch(result.stderr, /GITHUB_TOKEN/);
  assert.equal(result.stdout, "");
});

test("a plain parameter that is not on the allowed list fails, whatever its path", (t) => {
  const { result } = run(t, [
    ["/policeconduct/config/default/GOOGLE_CLOUD_PROJECT", "String"],
    ["/policeconduct/config/default/OTHER_SETTING", "String"],
    ["/policeconduct/config/default/SOME_LIST", "StringList"],
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /OTHER_SETTING .* its type is 'String'/);
  assert.match(result.stderr, /SOME_LIST .* its type is 'StringList'/);
  assert.doesNotMatch(result.stderr, /GOOGLE_CLOUD_PROJECT in Parameter Store/);
});

test("finding no parameters fails instead of passing", (t) => {
  const { result } = run(t, []);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no parameters found under \/policeconduct\//);
});

test("a failed Parameter Store read fails the audit", (t) => {
  const { result } = run(t, [], { AWS_FAILS: "1" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AccessDenied/);
  assert.doesNotMatch(result.stdout, /checked/);
});
