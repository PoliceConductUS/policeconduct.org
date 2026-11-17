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

const library = resolve("scripts/parameter-store-secrets.sh");

function run(t, names, overrides = {}) {
  const dir = mkdtempSync(join(resolve(tmpdir()), "parameter-store-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(
    join(bin, "aws"),
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CALL_LOG"
name=""
while [[ $# -gt 0 ]]; do
  if [[ "$1" == "--name" ]]; then name="$2"; fi
  shift
done
if [[ "$name" == "$FAIL_NAME" ]]; then echo "ParameterNotFound" >&2; exit 254; fi
if [[ "$name" == "$EMPTY_NAME" ]]; then printf 'SecureString\\t'; exit 0; fi
if [[ "$name" == "$STRING_NAME" ]]; then printf 'String\\tstored:%s' "$name"; exit 0; fi
printf 'SecureString\\tstored:%s' "$name"
`,
    { mode: 0o755 },
  );
  const callLog = join(dir, "calls");
  writeFileSync(callLog, "");
  const list = names.join(" ");
  const result = spawnSync(
    "bash",
    [
      "-c",
      `set -euo pipefail; source "${library}"; load_parameter_store_secrets ${list}; for n in ${list}; do printf '%s=%s\\n' "$n" "\${!n}"; done`,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        BASH_ENV: "/dev/null",
        PATH: `${bin}:${process.env.PATH}`,
        CALL_LOG: callLog,
        FAIL_NAME: "",
        EMPTY_NAME: "",
        STRING_NAME: "",
        ...overrides,
      },
    },
  );
  return { result, calls: readFileSync(callLog, "utf8") };
}

test("each named secret is read decrypted and exported", (t) => {
  const { result, calls } = run(t, ["RESEND_API_KEY", "GITHUB_TOKEN"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    "RESEND_API_KEY=stored:/policeconduct/secrets/RESEND_API_KEY\nGITHUB_TOKEN=stored:/policeconduct/secrets/GITHUB_TOKEN\n",
  );
  const lines = calls.trim().split("\n");
  assert.equal(lines.length, 2);
  for (const line of lines) {
    assert.match(line, /^ssm get-parameter /);
    assert.match(line, /--with-decryption/);
    assert.match(line, /--region us-east-1/);
  }
});

test("a secret stored as a plain String stops the caller and is named", (t) => {
  const { result } = run(t, ["RESEND_API_KEY", "GITHUB_TOKEN"], {
    STRING_NAME: "/policeconduct/secrets/GITHUB_TOKEN",
  });
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /\/policeconduct\/secrets\/GITHUB_TOKEN in Parameter Store must be a SecureString, but its type is 'String'/,
  );
  assert.equal(result.stdout, "");
});

test("the stored value replaces a value already in the environment", (t) => {
  const { result } = run(t, ["SENTRY_AUTH_TOKEN"], {
    SENTRY_AUTH_TOKEN: "stale-local-copy",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    "SENTRY_AUTH_TOKEN=stored:/policeconduct/secrets/SENTRY_AUTH_TOKEN\n",
  );
});

test("a parameter that cannot be read stops the caller and is named", (t) => {
  const { result } = run(t, ["RESEND_API_KEY", "GITHUB_TOKEN"], {
    FAIL_NAME: "/policeconduct/secrets/GITHUB_TOKEN",
  });
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /could not read \/policeconduct\/secrets\/GITHUB_TOKEN/,
  );
  assert.equal(result.stdout, "");
});

test("an environment's secret is read by its full parameter name", (t) => {
  const dir = mkdtempSync(join(resolve(tmpdir()), "parameter-store-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(
    join(bin, "aws"),
    `#!/usr/bin/env bash
if [[ "$*" == *"--name /policeconduct/preview/secrets/RESEND_API_KEY "* ]]; then
  printf 'SecureString\\tpreview-value\\n'
else
  echo "ParameterNotFound" >&2; exit 254
fi
`,
    { mode: 0o755 },
  );
  const read = (parameter) =>
    spawnSync(
      "bash",
      [
        "-c",
        `set -euo pipefail; source "${library}"; value="$(read_parameter_store_secret ${parameter})"; printf '%s' "$value"`,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          BASH_ENV: "/dev/null",
          PATH: `${bin}:${process.env.PATH}`,
        },
      },
    );
  const found = read("/policeconduct/preview/secrets/RESEND_API_KEY");
  assert.equal(found.status, 0, found.stderr);
  assert.equal(found.stdout, "preview-value");
  // No fallback: a missing environment key fails and prints nothing.
  const missing = read("/policeconduct/production/secrets/RESEND_API_KEY");
  assert.equal(missing.status, 1);
  assert.match(
    missing.stderr,
    /could not read \/policeconduct\/production\/secrets\/RESEND_API_KEY/,
  );
  assert.equal(missing.stdout, "");
});

test("an empty parameter stops the caller", (t) => {
  const { result } = run(t, ["RESEND_API_KEY"], {
    EMPTY_NAME: "/policeconduct/secrets/RESEND_API_KEY",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /is empty/);
});
