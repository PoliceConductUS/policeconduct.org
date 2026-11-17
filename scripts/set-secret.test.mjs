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

const script = resolve("scripts/set-secret.mjs");

function run(t, args, input, { delayed = false } = {}) {
  const dir = mkdtempSync(join(resolve(tmpdir()), "set-secret-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  // The fake records its arguments and what it was sent on standard input.
  writeFileSync(
    join(bin, "aws"),
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CALL_LOG"
cat > "$VALUE_LOG"
`,
    { mode: 0o755 },
  );
  const callLog = join(dir, "calls");
  const valueLog = join(dir, "value");
  writeFileSync(callLog, "");
  writeFileSync(valueLog, "");
  // A delayed run pipes the value in from a writer that starts late, the way
  // `aws ssm get-parameter ... | npm run secret:set` does.
  const [command, commandArgs] = delayed
    ? [
        "bash",
        [
          "-c",
          '(sleep 0.3; printf "%s" "$INPUT") | "$0" "$@"',
          process.execPath,
          script,
          ...args,
        ],
      ]
    : [process.execPath, [script, ...args]];
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    input: delayed ? undefined : input,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      CALL_LOG: callLog,
      VALUE_LOG: valueLog,
      PARAMETER_STORE_REGION: "",
      INPUT: input,
    },
  });
  return {
    result,
    calls: readFileSync(callLog, "utf8"),
    value: readFileSync(valueLog, "utf8"),
  };
}

test("the value is stored as a SecureString and never passed as an argument", (t) => {
  const { result, calls, value } = run(
    t,
    ["RESEND_API_KEY"],
    "fixture-value\n",
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    calls,
    "ssm put-parameter --region us-east-1 --name /policeconduct.org/default/secrets/RESEND_API_KEY --type SecureString --overwrite --value file:///dev/stdin\n",
  );
  assert.equal(value, "fixture-value");
  assert.equal(
    result.stdout,
    "Stored /policeconduct.org/default/secrets/RESEND_API_KEY as a SecureString.\n",
  );
});

for (const args of [
  [],
  ["resend_api_key"],
  ["/policeconduct.org/default/secrets/RESEND_API_KEY"],
  ["RESEND_API_KEY", "fixture-value"],
  ["staging", "RESEND_API_KEY"],
  ["preview", "resend_api_key"],
  ["preview", "RESEND_API_KEY", "fixture-value"],
]) {
  test(`arguments ${JSON.stringify(args)} are refused before anything is stored`, (t) => {
    const { result, calls } = run(t, args, "fixture-value\n");
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /Usage: npm run secret:set -- \[ENVIRONMENT\] NAME/,
    );
    assert.equal(calls, "");
  });
}

for (const environment of ["production", "preview"]) {
  test(`a ${environment} secret is stored under that environment's path`, (t) => {
    const { result, calls, value } = run(
      t,
      [environment, "RESEND_API_KEY"],
      "fixture-value\n",
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      calls,
      `ssm put-parameter --region us-east-1 --name /policeconduct.org/${environment}/secrets/RESEND_API_KEY --type SecureString --overwrite --value file:///dev/stdin\n`,
    );
    assert.equal(value, "fixture-value");
  });
}

test("a value that arrives late on a pipe is still stored", (t) => {
  const { result, value } = run(t, ["RESEND_API_KEY"], "fixture-value\n", {
    delayed: true,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(value, "fixture-value");
});

test("an empty value is refused before anything is stored", (t) => {
  const { result, calls } = run(t, ["RESEND_API_KEY"], "\n");
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /no value was given for \/policeconduct\.org\/default\/secrets\/RESEND_API_KEY/,
  );
  assert.equal(calls, "");
});
