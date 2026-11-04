import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { mergeWorkspaceRedirects } from "./workspace-redirects.mjs";

async function fixture(t, mappings) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "redirect-config-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await writeFile(
    path.join(workspace, "redirects.json"),
    JSON.stringify(mappings),
  );
  return workspace;
}

test("merges mappings once and retires removed entries on regeneration", async (t) => {
  const workspace = await fixture(t, { "/old/": "/current/" });
  const options = { workspace, hasBuiltDestination: () => true };
  const generated = [{ from: "/other/", to: "/current/", status: 301 }];
  const result = await mergeWorkspaceRedirects(generated, options);
  assert.equal(result.length, 2);
  assert.deepEqual(result[1], {
    from: "/old/",
    to: "/current/",
    status: 301,
    source: "workspace redirects.json",
  });
  await writeFile(path.join(workspace, "redirects.json"), "{}");
  assert.deepEqual(
    await mergeWorkspaceRedirects(generated, options),
    generated,
  );
});

for (const [label, mappings, generated, built, expected] of [
  [
    "conflict",
    { "/old/": "/new/" },
    [{ from: "/old/", to: "/other/", status: 301 }],
    true,
    /Conflicting/,
  ],
  ["self redirect", { "/old/": "/old/" }, [], true, /loop/],
  ["loop", { "/a/": "/b/", "/b/": "/a/" }, [], true, /loop/],
  ["chain", { "/a/": "/b/", "/b/": "/c/" }, [], true, /final page/],
  ["missing destination", { "/old/": "/missing/" }, [], false, /not built/],
  [
    "external destination",
    { "/old/": "https://example.test/" },
    [],
    true,
    /local path/,
  ],
  ["traversal", { "/old/": "/../private/" }, [], true, /local path/],
  ["invalid shape", [], [], true, /object/],
]) {
  test(`rejects ${label}`, async (t) => {
    const workspace = await fixture(t, mappings);
    await assert.rejects(
      mergeWorkspaceRedirects(generated, {
        workspace,
        hasBuiltDestination: () => built,
      }),
      expected,
    );
  });
}
