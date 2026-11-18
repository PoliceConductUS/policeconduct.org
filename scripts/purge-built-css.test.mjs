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

test("a CSS purge crash fails with exit 1", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "purge-css-crash-"));
  try {
    await mkdir(path.join(root, "scripts"));
    await mkdir(path.join(root, "dist"));
    await copyFile(
      path.join(repoRoot, "scripts", "purge-built-css.mjs"),
      path.join(root, "scripts", "purge-built-css.mjs"),
    );
    await symlink(
      path.join(repoRoot, "node_modules"),
      path.join(root, "node_modules"),
      "dir",
    );
    const result = spawnSync(
      process.execPath,
      [path.join(root, "scripts", "purge-built-css.mjs")],
      { encoding: "utf8", timeout: 60000 },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Post-build CSS purge failed/);
    assert.match(result.stderr, /No HTML files under/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CSS purge keeps masthead search option rules that only client JS uses", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "purge-css-masthead-"));
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
    // The shape Astro emits for MastheadSearch.astro: a scoped listbox with
    // :global() option classes. src/lib/client/site.js creates the options, so
    // no built page contains the option class names.
    const css = path.join(root, "dist", "_astro", "site.css");
    await writeFile(
      css,
      [
        ".masthead-search-listbox:where(.astro-abc123){padding:0}",
        ".masthead-search-listbox:where(.astro-abc123) .masthead-search-option{display:flex}",
        ".masthead-search-listbox:where(.astro-abc123) .masthead-search-option.is-active{outline:2px solid}",
        ".masthead-search-listbox:where(.astro-abc123) .masthead-search-option-title{font-weight:700}",
        ".masthead-search-listbox:where(.astro-abc123) .masthead-search-option-path{color:gray}",
        ".unused{color:blue}",
      ].join(""),
    );
    await writeFile(
      path.join(root, "dist", "index.html"),
      '<ul class="masthead-search-listbox astro-abc123" role="listbox"></ul>',
    );
    const result = spawnSync(
      process.execPath,
      [path.join(root, "scripts", "purge-built-css.mjs")],
      { encoding: "utf8", timeout: 60000 },
    );
    assert.equal(result.status, 0, result.stderr);
    const output = await readFile(css, "utf8");
    assert.match(output, / \.masthead-search-option\{/);
    assert.match(output, / \.masthead-search-option\.is-active\{/);
    assert.match(output, / \.masthead-search-option-title\{/);
    assert.match(output, / \.masthead-search-option-path\{/);
    assert.doesNotMatch(output, /\.unused\{/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
