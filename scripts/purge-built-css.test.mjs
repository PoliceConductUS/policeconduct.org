import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

test("CSS purge releases page text while retaining selectors from every page", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "purge-css-memory-"));
  try {
    await mkdir(path.join(root, "scripts"));
    await mkdir(path.join(root, "dist", "_astro"), { recursive: true });
    await copyFile(
      path.join(repoRoot, "scripts", "purge-built-css.mjs"),
      path.join(root, "scripts", "purge-built-css.mjs"),
    );
    await symlink(
      path.join(repoRoot, "node_modules"),
      path.join(root, "node_modules"),
      "dir",
    );
    const css = path.join(root, "dist", "_astro", "site.css");
    await writeFile(
      css,
      ".used{color:red}.unique_identifier_511{color:green}.unused{color:blue}",
    );
    const repeated = "shared-token ".repeat(40000);
    for (let i = 0; i < 512; i++) {
      await writeFile(
        path.join(root, "dist", `${i}.html`),
        `<div class="used unique_identifier_${i}">${repeated}</div>`,
      );
    }
    const result = spawnSync(
      process.execPath,
      [
        "--max-old-space-size=128",
        path.join(root, "scripts", "purge-built-css.mjs"),
      ],
      { encoding: "utf8", timeout: 60000 },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /scanned 512 HTML file\(s\)/);
    const output = await readFile(css, "utf8");
    assert.match(output, /\.used\{/);
    assert.match(output, /\.unique_identifier_511\{/);
    assert.doesNotMatch(output, /\.unused\{/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
