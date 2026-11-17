import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("../src/lib/client/site.js", import.meta.url),
  "utf8",
);
const helper = source.slice(
  source.indexOf("const copyTextToClipboard ="),
  source.indexOf('// Shared entity action-bar "Copy link"'),
);

function copyWith(clipboard, isSecureContext = true) {
  const context = vm.createContext({
    navigator: { clipboard },
    window: { isSecureContext },
  });
  vm.runInContext(helper + "\nglobalThis.copy = copyTextToClipboard;", context);
  return context.copy;
}

test("copy link writes the exact URL using Clipboard API", async () => {
  let copied;
  const copy = copyWith({
    async writeText(text) {
      copied = text;
    },
  });
  assert.equal(await copy("https://example.org/agency/?q=one#details"), true);
  assert.equal(copied, "https://example.org/agency/?q=one#details");
});

test("copy link reports denied clipboard access without legacy DOM commands", async () => {
  const copy = copyWith({
    async writeText() {
      throw new Error("Permission denied");
    },
  });
  assert.equal(await copy("https://example.org/"), false);
});

test("copy link reports unavailable or insecure clipboard access", async () => {
  assert.equal(await copyWith(undefined)("https://example.org/"), false);
  const copy = copyWith(
    {
      async writeText() {
        assert.fail("Insecure clipboard write");
      },
    },
    false,
  );
  assert.equal(await copy("http://example.org/"), false);
});
