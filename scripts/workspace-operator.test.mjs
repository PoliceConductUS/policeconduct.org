import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { operator } from "./workspace-operator.mjs";
function fixture(overrides = {}) {
  const calls = [];
  const responses = {
    "get-bucket-versioning": { Status: "Enabled" },
    "get-bucket-tagging": {
      TagSet: [{ Key: "Purpose", Value: "intake-workspace" }],
    },
    "get-public-access-block": {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    },
    "get-bucket-encryption": {
      ServerSideEncryptionConfiguration: {
        Rules: [
          { ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } },
        ],
      },
    },
    ...overrides,
  };
  return {
    calls,
    dependencies: {
      env: { INTAKE_WORKSPACE: "/fixture", INTAKE_WORKSPACE_BUCKET: "" },
      exec: async (command, args) => {
        calls.push([command, args]);
        return {
          stdout:
            command === "terraform"
              ? "fixture-workspaces"
              : JSON.stringify(responses[args[1]]),
        };
      },
      workspace: async (options) => {
        calls.push(["transfer", options]);
        return { exitCode: 0, stdout: "2 files planned\n" };
      },
    },
  };
}
test("npm dry-run resolves bucket and preserves direction and dry-run", async () => {
  const f = fixture();
  const result = await operator(["push", "--dry-run"], f.dependencies);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(f.calls[0], [
    "terraform",
    [
      `-chdir=${fileURLToPath(new URL("../infrastructure/intake-workspace", import.meta.url))}`,
      "output",
      "-raw",
      "intake_workspace_bucket_name",
    ],
  ]);
  assert.deepEqual(f.calls.at(-1), [
    "transfer",
    {
      operation: "sync",
      direction: "upload",
      bucket: "fixture-workspaces",
      dryRun: true,
      summaryOnly: true,
    },
  ]);
});
test("pull uses download direction and configured bucket", async () => {
  const f = fixture();
  f.dependencies.env.INTAKE_WORKSPACE_BUCKET = "configured-bucket";
  await operator(["pull", "--dry-run"], f.dependencies);
  assert.equal(f.calls.at(-1)[1].direction, "download");
  assert.equal(f.calls.at(-1)[1].environment, undefined);
  assert.ok(!f.calls.some(([command]) => command === "terraform"));
});
// runWorkspace owns the versioning and tag checks (intake-workspace-sync.test.mjs).
for (const action of ["get-public-access-block", "get-bucket-encryption"])
  test(`unsafe ${action} stops before transfer`, async () => {
    const f = fixture({ [action]: {} });
    await assert.rejects(operator(["push"], f.dependencies));
    assert.ok(!f.calls.some(([command]) => command === "transfer"));
  });
test("environment argument stops before commands", async () => {
  const f = fixture();
  await assert.rejects(operator(["push", "prod"], f.dependencies));
  assert.equal(f.calls.length, 0);
});

for (const operation of ["push", "pull"])
  test(`${operation} uses configured workspace with or without dry-run`, async () => {
    for (const flags of [[], ["--dry-run"]]) {
      const f = fixture();
      await operator([operation, ...flags], f.dependencies);
      assert.equal(f.calls.at(-1)[1].environment, undefined);
      assert.equal(
        f.calls.at(-1)[1].direction,
        operation === "push" ? "upload" : "download",
      );
      assert.equal(f.calls.at(-1)[1].dryRun, flags.length ? true : undefined);
    }
  });

for (const operation of ["push", "pull"]) {
  test(`${operation} reports validation before transfer starts`, async () => {
    const f = fixture();
    const progress = [];
    f.dependencies.onProgress = (text) => progress.push(text);
    f.dependencies.workspace = async (_options, dependencies) => {
      assert.match(progress[0], /resolving storage/);
      assert.match(progress[1], /Storage validation passed/);
      dependencies.onProgress("transfer running\n");
      return { exitCode: 0, stdout: "" };
    };
    const result = await operator([operation], f.dependencies);
    assert.equal(progress[2], "transfer running\n");
    assert.equal(result.stdout, "", "live messages are not printed twice");
  });
}
