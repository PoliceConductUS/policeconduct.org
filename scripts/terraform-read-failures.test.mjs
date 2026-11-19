import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
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
// The bootstrap-recaptcha root manages no aws_ resource. Its evidence is the
// AWS account its managed workload identity provider trusts.
function recaptchaState(providerAws, extraResources = []) {
  return JSON.stringify({
    version: 4,
    resources: [
      {
        mode: "data",
        type: "aws_caller_identity",
        instances: [{ attributes: { account_id: "123456789012" } }],
      },
      {
        mode: "managed",
        type: "google_iam_workload_identity_pool_provider",
        instances: [{ attributes: { aws: providerAws } }],
      },
      ...extraResources,
    ],
  });
}

for (const [name, state, allowed] of [
  [
    "workload identity provider trusts the caller account",
    recaptchaState([{ account_id: "123456789012" }]),
    true,
  ],
  [
    "workload identity provider trusts another account",
    recaptchaState([{ account_id: "999999999999" }]),
    false,
  ],
  ["workload identity provider has no AWS block", recaptchaState(null), false],
  [
    "only a data source names the caller account",
    JSON.stringify({
      version: 4,
      resources: [
        {
          mode: "data",
          type: "aws_caller_identity",
          instances: [{ attributes: { account_id: "123456789012" } }],
        },
      ],
    }),
    false,
  ],
  [
    "managed ARN and workload identity provider disagree",
    recaptchaState(
      [{ account_id: "999999999999" }],
      [
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
    ),
    false,
  ],
]) {
  test(`account guard: ${name}`, (t) => {
    const result = run(t, "scripts/require-terraform-account.sh", {
      STATE: state,
    });
    assert.equal(result.status === 0, allowed, result.stderr);
  });
}

const recaptchaWrapper = "infrastructure/bootstrap-recaptcha/scripts/apply.sh";

test("reCAPTCHA wrapper stops before apply when the caller is not the trusted account", (t) => {
  const result = run(
    t,
    recaptchaWrapper,
    { STATE: recaptchaState([{ account_id: "999999999999" }]) },
    ["-auto-approve"],
  );
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /AWS caller does not match/);
  assert.doesNotMatch(result.stdout, /APPLY_REACHED/);
});

test("reCAPTCHA wrapper reaches apply after matching account verification", (t) => {
  const result = run(
    t,
    recaptchaWrapper,
    { STATE: recaptchaState([{ account_id: "123456789012" }]) },
    ["-auto-approve"],
  );
  assert.match(result.stdout, /APPLY_REACHED/);
});

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

// The bootstrap-policeconduct wrapper reads the topic ARN from the
// submission-notifications outputs before any other preflight. The fixture's
// Parameter Store audit is the next step; it prints what Terraform would get
// and stops, so no test reaches a plan.
const topicArn = "arn:aws:sns:us-east-1:test-account:submission-notifications";

function runPoliceconductWrapper(t, { env = {}, dotenv = "" } = {}) {
  const dir = mkdtempSync(join(resolve(tmpdir()), "topic-arn-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  const scripts = join(dir, "scripts");
  const wrapperDir = join(
    dir,
    "infrastructure",
    "bootstrap-policeconduct",
    "scripts",
  );
  mkdirSync(bin);
  mkdirSync(scripts);
  mkdirSync(wrapperDir, { recursive: true });
  mkdirSync(join(dir, "infrastructure", "submission-notifications"));
  for (const name of ["require-terraform-state.sh", "terraform-outputs.mjs"]) {
    cpSync(join("scripts", name), join(scripts, name));
  }
  const wrapper = join(wrapperDir, "apply.sh");
  cpSync("infrastructure/bootstrap-policeconduct/scripts/apply.sh", wrapper);
  writeFileSync(
    join(scripts, "audit-parameter-store.mjs"),
    'console.log(`AUDIT_REACHED topic=${process.env.TF_VAR_submission_notifications_topic_arn ?? ""}`);\nprocess.exit(42);\n',
  );
  writeFileSync(join(dir, ".env"), dotenv);
  writeFileSync(
    join(bin, "terraform"),
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CALL_LOG"
case "$2 $3" in
  "state pull") printf '%s' '{"version":4,"resources":[{"mode":"managed","instances":[{}]}]}' ;;
  "output -json") printf '%s' "$OUTPUTS"; exit "$OUTPUT_EXIT" ;;
  "init -input=false") exit 0 ;;
  *) echo PLAN_REACHED; exit 42 ;;
esac
`,
    { mode: 0o755 },
  );
  const callLog = join(dir, "calls");
  const baseEnv = { ...process.env };
  delete baseEnv.TF_VAR_submission_notifications_topic_arn;
  delete baseEnv.SUBMISSION_NOTIFICATIONS_TOPIC_ARN;
  const result = spawnSync("bash", [wrapper, "-auto-approve"], {
    encoding: "utf8",
    env: {
      ...baseEnv,
      BASH_ENV: "/dev/null",
      PATH: `${bin}:${process.env.PATH}`,
      AWS_PROFILE: "test",
      CALL_LOG: callLog,
      OUTPUT_EXIT: "0",
      OUTPUTS: JSON.stringify({
        submission_notifications_topic_arn: { value: topicArn },
      }),
      ...env,
    },
  });
  const calls = existsSync(callLog) ? readFileSync(callLog, "utf8") : "";
  return { ...result, calls };
}

function assertRefusedBeforePlan(result, reason) {
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, reason);
  assert.doesNotMatch(result.stdout, /AUDIT_REACHED|PLAN_REACHED/);
  assert.doesNotMatch(result.calls, /\b(plan|apply)\b/);
}

test("bootstrap-policeconduct exports the topic ARN from the submission-notifications output", (t) => {
  const result = runPoliceconductWrapper(t);
  assert.equal(result.status, 42, result.stderr);
  assert.match(
    result.stdout,
    new RegExp(`AUDIT_REACHED topic=${topicArn}$`, "m"),
  );
  assert.match(result.calls, /submission-notifications output -json/);
});

for (const [name, env] of [
  ["the output is missing", { OUTPUTS: "{}" }],
  [
    "the output is empty",
    {
      OUTPUTS: JSON.stringify({
        submission_notifications_topic_arn: { value: "" },
      }),
    },
  ],
  ["the outputs cannot be read", { OUTPUTS: "", OUTPUT_EXIT: "1" }],
]) {
  test(`bootstrap-policeconduct refuses apply before plan when ${name}`, (t) => {
    assertRefusedBeforePlan(
      runPoliceconductWrapper(t, { env }),
      /Apply infrastructure\/submission-notifications first/,
    );
  });
}

test("bootstrap-policeconduct accepts a preset topic ARN that matches the output", (t) => {
  const result = runPoliceconductWrapper(t, {
    env: { TF_VAR_submission_notifications_topic_arn: topicArn },
  });
  assert.equal(result.status, 42, result.stderr);
  assert.match(
    result.stdout,
    new RegExp(`AUDIT_REACHED topic=${topicArn}$`, "m"),
  );
});

for (const [name, options] of [
  [
    "the shell",
    { env: { TF_VAR_submission_notifications_topic_arn: `${topicArn}-old` } },
  ],
  [
    ".env",
    { dotenv: `TF_VAR_submission_notifications_topic_arn=${topicArn}-old\n` },
  ],
]) {
  test(`bootstrap-policeconduct refuses a topic ARN from ${name} that differs from the output`, (t) => {
    assertRefusedBeforePlan(
      runPoliceconductWrapper(t, options),
      /does not match the submission_notifications_topic_arn output/,
    );
  });
}

test("bootstrap-policeconduct reads the output even when SUBMISSION_NOTIFICATIONS_TOPIC_ARN is set", (t) => {
  const result = runPoliceconductWrapper(t, {
    env: { SUBMISSION_NOTIFICATIONS_TOPIC_ARN: `${topicArn}-old` },
  });
  assert.equal(result.status, 42, result.stderr);
  assert.match(
    result.stdout,
    new RegExp(`AUDIT_REACHED topic=${topicArn}$`, "m"),
  );
});
