import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

function run(t, script, overrides = {}) {
  const dir = mkdtempSync(join(resolve(tmpdir()), "tf-reads-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(
    join(bin, "aws"),
    `#!/usr/bin/env bash
if [[ "$1" == "sts" ]]; then
  printf '%s' "$CALLER"
  exit "$IDENTITY_EXIT"
fi
if [[ "$2" == "$FAIL_OPERATION" ]]; then
  echo 'AccessDenied: read failed' >&2
  exit 23
fi
printf '%s' 'None'
`,
    { mode: 0o755 },
  );
  writeFileSync(
    join(bin, "terraform"),
    '#!/usr/bin/env bash\nprintf "%s" "$STATE"\nexit "$STATE_EXIT"\n',
    { mode: 0o755 },
  );
  return spawnSync("bash", [resolve(script), dir], {
    input: JSON.stringify({
      oac_name: "oac",
      index_function_name: "index",
      preview_function_name: "preview",
      site_alias: "example.org",
      preview_alias: "preview.example.org",
    }),
    encoding: "utf8",
    env: {
      ...process.env,
      BASH_ENV: "/dev/null",
      PATH: `${bin}:${process.env.PATH}`,
      CALLER: "123456789012",
      IDENTITY_EXIT: "0",
      STATE_EXIT: "0",
      FAIL_OPERATION: "",
      STATE: JSON.stringify({
        resources: [
          {
            mode: "managed",
            type: "aws_lambda_function",
            instances: [
              {
                attributes: {
                  arn: "arn:aws:lambda:us-east-1:123456789012:function:test",
                },
              },
            ],
          },
        ],
      }),
      ...overrides,
    },
  });
}

for (const [name, overrides, allowed] of [
  ["matching regional ARN", {}, true],
  ["STS fails after output", { IDENTITY_EXIT: "1" }, false],
  ["missing caller", { CALLER: "None" }, false],
  ["state pull fails after output", { STATE_EXIT: "1" }, false],
  ["malformed state", { STATE: "bad json" }, false],
  ["no account evidence", { STATE: '{"resources":[]}' }, false],
  ["different account", { CALLER: "999999999999" }, false],
]) {
  test(`account guard: ${name}`, (t) => {
    const result = run(t, "scripts/require-terraform-account.sh", overrides);
    assert.equal(result.status === 0, allowed, result.stderr);
  });
}
for (const operation of [
  "list-origin-access-controls",
  "list-functions",
  "list-distributions",
]) {
  test(`CloudFront fails closed for ${operation}`, (t) => {
    const result = run(
      t,
      "infrastructure/bootstrap-policeconduct/scripts/cloudfront_lookup.sh",
      { FAIL_OPERATION: operation },
    );
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /AccessDenied/);
  });
}
test("CloudFront successful absence remains empty", (t) => {
  const result = run(
    t,
    "infrastructure/bootstrap-policeconduct/scripts/cloudfront_lookup.sh",
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(Object.values(JSON.parse(result.stdout)), [
    "",
    "",
    "",
    "",
    "",
  ]);
});
