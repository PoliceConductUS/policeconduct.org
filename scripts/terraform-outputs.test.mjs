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
import { resolveTerraformEnv, TERRAFORM_ENV } from "./terraform-outputs.mjs";

const stackOutputs = {
  "bootstrap-policeconduct": {
    site_bucket_name: "site-bucket",
    site_redirects_kvs_arn: "arn:kvs",
    release_data_bucket_name: "release-bucket",
  },
  "bootstrap-recaptcha": { recaptcha_site_key: "site-key" },
};

function reader(calls, outputs = stackOutputs) {
  return (stack) => {
    calls.push(stack);
    return outputs[stack];
  };
}

test("names are resolved from their stack's outputs and set in the environment", () => {
  const env = {};
  const calls = [];
  const resolved = resolveTerraformEnv(
    ["S3_BUCKET", "KVS_ARN", "RECAPTCHA_SITE_KEY"],
    { env, readOutputs: reader(calls) },
  );
  assert.deepEqual(resolved, {
    S3_BUCKET: "site-bucket",
    KVS_ARN: "arn:kvs",
    RECAPTCHA_SITE_KEY: "site-key",
  });
  assert.deepEqual(env, resolved);
});

test("each stack is read once", () => {
  const calls = [];
  resolveTerraformEnv(["S3_BUCKET", "KVS_ARN", "RELEASE_DATA_BUCKET"], {
    env: {},
    readOutputs: reader(calls),
  });
  assert.deepEqual(calls, ["bootstrap-policeconduct"]);
});

test("a value the caller already set is kept and Terraform is not read", () => {
  const env = { S3_BUCKET: "from-ci", KVS_ARN: "arn:from-ci" };
  const calls = [];
  const resolved = resolveTerraformEnv(["S3_BUCKET", "KVS_ARN"], {
    env,
    readOutputs: reader(calls),
  });
  assert.deepEqual(resolved, { S3_BUCKET: "from-ci", KVS_ARN: "arn:from-ci" });
  assert.deepEqual(calls, []);
});

test("a blank value is treated as not set", () => {
  const env = { S3_BUCKET: "  " };
  resolveTerraformEnv(["S3_BUCKET"], { env, readOutputs: reader([]) });
  assert.equal(env.S3_BUCKET, "site-bucket");
});

test("a name Terraform does not provide is refused", () => {
  assert.throws(
    () =>
      resolveTerraformEnv(["DATABASE_URL"], {
        env: {},
        readOutputs: reader([]),
      }),
    /DATABASE_URL is not a value Terraform outputs provide/,
  );
});

test("a missing or empty output is refused and named", () => {
  for (const value of [undefined, "", "  "]) {
    assert.throws(
      () =>
        resolveTerraformEnv(["S3_BUCKET"], {
          env: {},
          readOutputs: reader([], {
            "bootstrap-policeconduct": { site_bucket_name: value },
          }),
        }),
      /S3_BUCKET: Terraform output site_bucket_name of bootstrap-policeconduct is missing or empty/,
    );
  }
});

test("every mapped output is declared by its stack", () => {
  for (const [name, [stack, output]] of Object.entries(TERRAFORM_ENV)) {
    const dir = join("infrastructure", stack);
    const declared = ["outputs.tf", "release.tf"]
      .map((file) => {
        try {
          return readFileSync(join(dir, file), "utf8");
        } catch {
          return "";
        }
      })
      .join("\n");
    assert.ok(
      declared.includes(`output "${output}"`),
      `${name}: ${stack} declares no output named ${output}`,
    );
  }
});

function runCommand(t, names, terraformScript, env = {}) {
  const dir = mkdtempSync(join(resolve(tmpdir()), "tf-outputs-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "terraform"), terraformScript, { mode: 0o755 });
  const callLog = join(dir, "calls");
  writeFileSync(callLog, "");
  const result = spawnSync(
    process.execPath,
    [resolve("scripts/terraform-outputs.mjs"), ...names],
    {
      encoding: "utf8",
      env: {
        PATH: `${bin}:${process.env.PATH}`,
        CALL_LOG: callLog,
        ...env,
      },
    },
  );
  return { result, calls: readFileSync(callLog, "utf8") };
}

const fakeTerraform = `#!/usr/bin/env bash
printf '%s\\n' "$2" >> "$CALL_LOG"
if [[ "$2" == init ]]; then exit 0; fi
printf '%s' '{"site_bucket_name":{"value":"it'"'"'s-a-bucket"},"site_redirects_kvs_arn":{"value":"arn:kvs"}}'
`;

test("the command prints shell exports a script can eval", (t) => {
  const { result } = runCommand(t, ["S3_BUCKET", "KVS_ARN"], fakeTerraform);
  assert.equal(result.status, 0, result.stderr);
  const evaluated = spawnSync(
    "bash",
    [
      "-c",
      `eval "$1"; printf '%s|%s' "$S3_BUCKET" "$KVS_ARN"`,
      "bash",
      result.stdout,
    ],
    { encoding: "utf8" },
  );
  assert.equal(evaluated.stdout, "it's-a-bucket|arn:kvs");
});

test("the command fails with the reason when Terraform cannot be read", (t) => {
  const { result } = runCommand(
    t,
    ["S3_BUCKET"],
    `#!/usr/bin/env bash
printf '%s\\n' "$2" >> "$CALL_LOG"
if [[ "$2" == init ]]; then exit 0; fi
echo "No valid credential sources found" >&2
exit 1
`,
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(
    result.stderr,
    /terraform output failed for bootstrap-policeconduct/,
  );
  assert.match(result.stderr, /No valid credential sources found/);
});

test("the command reads nothing when every value is already set", (t) => {
  const { result, calls } = runCommand(t, ["S3_BUCKET"], fakeTerraform, {
    S3_BUCKET: "from-ci",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "export S3_BUCKET='from-ci'\n");
  assert.equal(calls, "");
});
