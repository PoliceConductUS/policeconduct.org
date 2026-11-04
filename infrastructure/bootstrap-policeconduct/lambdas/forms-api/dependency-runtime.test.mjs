import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { Blob } from "fetch-blob";
import fetch from "node-fetch";

const require = createRequire(import.meta.url);

test("Forms API dependency chain uses native DOMException and preserves Blob and fetch behavior", async () => {
  assert.equal(require("node-domexception"), globalThis.DOMException);
  assert.equal(await new Blob(["compatible"]).text(), "compatible");
  await assert.rejects(
    fetch("http://127.0.0.1:9", { signal: AbortSignal.abort() }),
    { name: "AbortError" },
  );
});
