import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createDemoServer } from "./workspace-demo.mjs";

async function requestDemo(t, runDemo) {
  const server = createDemoServer(runDemo);
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return fetch(`http://127.0.0.1:${server.address().port}/run`, {
    method: "POST",
  });
}

test("demo failure returns HTTP 500 without exception details", async (t) => {
  const response = await requestDemo(t, async () => {
    throw new Error("synthetic-private-diagnostic at internal-fixture.mjs:42");
  });
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), {
    error: "Workspace recovery demonstration failed.",
  });
});

test("demo still performs upload and revision recovery", async (t) => {
  const response = await requestDemo(t);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.passed, true);
  assert.equal(result.backupCreated, true);
  assert.equal(result.retainedVersions.length, 2);
  assert.equal(result.recoveredBytes, result.retainedVersions[0]);
});
