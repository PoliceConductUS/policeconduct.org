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

test("SecureString parameters pass, and no value is read", (t) => {
  const { result, calls } = run(t, [
    ["/policeconduct.org/default/secrets/GITHUB_TOKEN", "SecureString"],
    ["/policeconduct.org/preview/secrets/RESEND_API_KEY", "SecureString"],
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /2 parameter\(s\) under \/policeconduct\.org\/ checked/,
  );
  const lines = calls.trim().split("\n");
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^ssm describe-parameters /);
  assert.match(lines[0], /--region us-east-1/);
  assert.match(
    lines[0],
    /--parameter-filters Key=Path,Option=Recursive,Values=\/policeconduct\.org /,
  );
  assert.doesNotMatch(lines[0], /get-parameter|with-decryption/);
});

test("any parameter that is not a SecureString fails and is named", (t) => {
  const { result } = run(t, [
    ["/policeconduct.org/default/secrets/GITHUB_TOKEN", "SecureString"],
    ["/policeconduct.org/production/secrets/RESEND_API_KEY", "String"],
    ["/policeconduct.org/default/secrets/SOME_LIST", "StringList"],
  ]);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /\/policeconduct\.org\/production\/secrets\/RESEND_API_KEY in Parameter Store must be a SecureString, but its type is 'String'/,
  );
  assert.match(result.stderr, /SOME_LIST .* its type is 'StringList'/);
  assert.doesNotMatch(result.stderr, /GITHUB_TOKEN/);
  assert.equal(result.stdout, "");
});

test("finding no parameters fails instead of passing", (t) => {
  const { result } = run(t, []);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /no parameters found under \/policeconduct\.org\//,
  );
});

test("a failed Parameter Store read fails the audit", (t) => {
  const { result } = run(t, [], { AWS_FAILS: "1" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AccessDenied/);
  assert.doesNotMatch(result.stdout, /checked/);
});
