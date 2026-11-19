import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

const THEME = ":root{--ipc-color-ink:#111;--ipc-color-teal-ink:#066;}";
const SELECTORS =
  ".masthead{}.nav-action-share{}.masthead-nav{}" +
  ".masthead-search-listbox .masthead-search-option{}";
// Pad past the 150,000-character floor so only the token and selector checks
// decide the result.
const PADDING = `/*${"x".repeat(150_000)}*/`;

const runValidator = async (css) => {
  const root = await mkdtemp(path.join(tmpdir(), "critical-css-"));
  try {
    await mkdir(path.join(root, "scripts"));
    await mkdir(path.join(root, "src", "styles"), { recursive: true });
    await mkdir(path.join(root, "dist", "_astro"), { recursive: true });
    await copyFile(
      path.join(repoRoot, "scripts", "validate-critical-css.mjs"),
      path.join(root, "scripts", "validate-critical-css.mjs"),
    );
    await writeFile(path.join(root, "src", "styles", "theme.css"), THEME);
    await writeFile(path.join(root, "dist", "_astro", "site.css"), css);
    return spawnSync(
      process.execPath,
      [path.join(root, "scripts", "validate-critical-css.mjs")],
      { encoding: "utf8", timeout: 60000 },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

test("critical CSS check passes when every token and selector is present", async () => {
  const result = await runValidator(THEME + SELECTORS + PADDING);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Critical CSS validation passed/);
});

test("a missing design token fails with exit 1", async () => {
  const result = await runValidator(
    ":root{--ipc-color-ink:#111;}" + SELECTORS + PADDING,
  );
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /Critical CSS validation failed/);
  assert.match(result.stderr, /--ipc-color-teal-ink/);
});

test("a missing required selector fails with exit 1", async () => {
  const result = await runValidator(
    THEME +
      ".masthead{}.nav-action-share{}.masthead-nav{}" +
      ".masthead-search-listbox .masthead-search-option-title{}" +
      PADDING,
  );
  assert.equal(result.status, 1, result.stdout);
  assert.match(
    result.stderr,
    /Required component selectors missing from built CSS: \.masthead-search-option$/m,
  );
});

test("CSS below the size floor fails with exit 1", async () => {
  const result = await runValidator(THEME + SELECTORS);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /below the 150000-character floor/);
});
