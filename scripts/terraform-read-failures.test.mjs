import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

function run(t, script, overrides = {}, extraArgs = []) {
  const dir = mkdtempSync(join(resolve(tmpdir()), "tf-reads-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(
    join(bin, "aws"),
    `#!/usr/bin/env bash
if [[ "$1" == "sts" ]]; then
  printf '%s' "$CALLER"
  if [[ "$IDENTITY_EXIT" != 0 ]]; then echo "identity read failed" >&2; fi
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
    '#!/usr/bin/env bash\nif [[ "$3" == list ]]; then echo aws_cloudfront_distribution.redirect; exit 0; fi\nif [[ "$2" == plan ]]; then exit "$PLAN_EXIT"; fi\nif [[ "$2" == show ]]; then printf "%s" "$PLAN_JSON"; exit 0; fi\nif [[ "$2" == apply ]]; then echo APPLY_REACHED; exit 42; fi\nprintf "%s" "$STATE"\nexit "$STATE_EXIT"\n',
    { mode: 0o755 },
  );
  return spawnSync("bash", [resolve(script), dir, ...extraArgs], {
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
      PLAN_EXIT: "2",
      PLAN_JSON: '{"resource_changes":[]}',
      STATE: JSON.stringify({
        version: 4,
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

for (const [name, overrides] of [
  ["identity read failure", { IDENTITY_EXIT: "1" }],
  ["account mismatch", { CALLER: "999999999999" }],
  ["state read failure", { STATE_EXIT: "1" }],
]) {
  test(`Iceconduct wrapper stops before apply: ${name}`, (t) => {
    const result = run(
      t,
      "infrastructure/bootstrap-iceconduct/scripts/apply.sh",
      overrides,
    );
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /APPLY_REACHED/);
    assert.match(result.stderr, /account|identity|state|Terraform/i);
  });
}

const iceconductWrapper =
  "infrastructure/bootstrap-iceconduct/scripts/apply.sh";

test("Iceconduct wrapper reaches apply after matching account verification", (t) => {
  const result = run(t, iceconductWrapper, {}, ["-auto-approve"]);
  assert.match(result.stdout, /APPLY_REACHED/);
});

test("Iceconduct wrapper does not apply a plan nobody confirmed", (t) => {
  const result = run(t, iceconductWrapper);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Apply cancelled/);
  assert.doesNotMatch(result.stdout, /APPLY_REACHED/);
});

test("Iceconduct wrapper refuses a plan that destroys a resource nobody approved", (t) => {
  const plan = JSON.stringify({
    resource_changes: [
      {
        address: "aws_route53_record.mx",
        mode: "managed",
        change: { actions: ["delete"] },
      },
    ],
  });
  const refused = run(t, iceconductWrapper, { PLAN_JSON: plan }, [
    "-auto-approve",
  ]);
  assert.equal(refused.status, 1, refused.stderr);
  assert.match(refused.stderr, /refusing apply/);
  assert.ok(refused.stderr.includes("aws_route53_record.mx"));
  assert.doesNotMatch(refused.stdout, /APPLY_REACHED/);

  const approved = run(
    t,
    iceconductWrapper,
    { PLAN_JSON: plan, TERRAFORM_APPROVED_DESTROYS: "aws_route53_record.mx" },
    ["-auto-approve"],
  );
  assert.match(approved.stdout, /APPLY_REACHED/);
});

test("Iceconduct wrapper applies nothing when live already matches", (t) => {
  const result = run(t, iceconductWrapper, { PLAN_EXIT: "0" }, [
    "-auto-approve",
  ]);
  assert.match(result.stdout, /Nothing to apply/);
  assert.doesNotMatch(result.stdout, /APPLY_REACHED/);
});

test("Iceconduct wrapper stops when the plan fails", (t) => {
  const result = run(t, iceconductWrapper, { PLAN_EXIT: "1" }, [
    "-auto-approve",
  ]);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /terraform plan failed/);
  assert.doesNotMatch(result.stdout, /APPLY_REACHED/);
});
