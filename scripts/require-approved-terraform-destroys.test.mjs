import assert from "node:assert/strict";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const guard = resolve("scripts/require-approved-terraform-destroys.sh");

function change(address, actions, mode = "managed") {
  return { address, mode, change: { actions } };
}

function run(plan, approved) {
  const env = { ...process.env, BASH_ENV: "/dev/null" };
  delete env.TERRAFORM_APPROVED_DESTROYS;
  if (approved !== undefined) {
    env.TERRAFORM_APPROVED_DESTROYS = approved;
  }
  return spawnSync("bash", [guard], {
    env,
    input: typeof plan === "string" ? plan : JSON.stringify(plan),
    encoding: "utf8",
  });
}

const mx = 'aws_route53_record.extra_standard["0"]';
const topic = "aws_sns_topic.infrastructure_alerts[0]";

test("a plan with only creates and updates is allowed", () => {
  const result = run({
    resource_changes: [
      change("aws_lambda_function.forms_api_prod", ["update"]),
      change("aws_sns_topic.new", ["create"]),
      change("aws_s3_bucket.site", ["no-op"]),
    ],
  });
  assert.equal(result.status, 0, result.stderr);
});

test("an empty plan is allowed", () => {
  assert.equal(run({ resource_changes: [] }).status, 0);
});

test("a destroy nobody approved is refused and named", () => {
  const result = run({
    resource_changes: [
      change(mx, ["delete"]),
      change(topic, ["delete"]),
      change("aws_lambda_function.forms_api_prod", ["update"]),
    ],
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /refusing apply/);
  assert.match(result.stderr, /2 resource\(s\)/);
  assert.ok(result.stderr.includes(` - ${mx}\n`), result.stderr);
  assert.ok(result.stderr.includes(` - ${topic}\n`), result.stderr);
  assert.equal(result.stderr.includes("forms_api_prod"), false);
});

test("a replacement counts as a destroy in either order", () => {
  for (const actions of [
    ["delete", "create"],
    ["create", "delete"],
  ]) {
    const result = run({ resource_changes: [change(topic, actions)] });
    assert.equal(result.status, 1, actions.join());
    assert.ok(result.stderr.includes(topic));
  }
});

test("every destroy must be approved by its exact address", () => {
  const plan = {
    resource_changes: [change(mx, ["delete"]), change(topic, ["delete"])],
  };
  assert.equal(run(plan, `${mx}\n${topic}`).status, 0);

  const partial = run(plan, mx);
  assert.equal(partial.status, 1);
  assert.ok(partial.stderr.includes(topic));
  assert.equal(partial.stderr.includes(` - ${mx}\n`), false);

  const prefix = run(plan, `aws_route53_record.extra_standard\n${topic}`);
  assert.equal(prefix.status, 1);
  assert.ok(prefix.stderr.includes(` - ${mx}\n`));
});

test("a data source read is not a destroy", () => {
  const result = run({
    resource_changes: [
      change("data.aws_iam_policy_document.x", ["delete"], "data"),
    ],
  });
  assert.equal(result.status, 0, result.stderr);
});

test("an unreadable plan is refused", () => {
  for (const plan of ["", "not json", "{}", '{"resource_changes":null}']) {
    const result = run(plan);
    assert.equal(result.status, 1, JSON.stringify(plan));
    assert.match(result.stderr, /could not be read/);
  }
});
