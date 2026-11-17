import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const stacks = readdirSync("infrastructure", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join("infrastructure", entry.name))
  .filter((dir) => existsSync(join(dir, "variables.tf")));

function sensitiveVariables(dir) {
  const names = [];
  const source = readFileSync(join(dir, "variables.tf"), "utf8");
  for (const block of source.split(/^variable\s+"/m).slice(1)) {
    if (/^\s*sensitive\s*=\s*true\b/m.test(block)) {
      names.push(block.slice(0, block.indexOf('"')));
    }
  }
  return names;
}

function trackedInputFiles(dir) {
  return readdirSync(dir).filter((name) => name.endsWith(".auto.tfvars"));
}

test("the check finds the secret variables it guards", () => {
  assert.deepEqual(
    sensitiveVariables("infrastructure/bootstrap-policeconduct").sort(),
    ["forms_email_resend_api_key", "sentry_auth_token"],
  );
});

for (const dir of stacks) {
  test(`${dir}: tracked inputs assign no secret variable`, () => {
    const secrets = sensitiveVariables(dir);
    for (const file of trackedInputFiles(dir)) {
      const source = readFileSync(join(dir, file), "utf8");
      for (const name of secrets) {
        assert.doesNotMatch(
          source,
          new RegExp(`^\\s*${name}\\s*=`, "m"),
          `${join(dir, file)} assigns ${name}; secrets belong in the git-ignored .env files`,
        );
      }
    }
  });

  test(`${dir}: tracked inputs are not git-ignored`, () => {
    for (const file of trackedInputFiles(dir)) {
      const ignored = spawnSync("git", ["check-ignore", "-q", join(dir, file)]);
      assert.equal(ignored.status, 1, `${join(dir, file)} is git-ignored`);
    }
  });
}
