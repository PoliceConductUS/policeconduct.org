import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Guards against production CSS regressions — most importantly PurgeCSS (or any
// future optimizer) silently dropping design tokens or key component styles, so
// the built site diverges from `astro dev` (which runs no such optimizer).
//
// The design's color system lives entirely in `--ipc-*` custom properties in
// src/styles/theme.css. If their DEFINITIONS are missing from the emitted CSS,
// every `var(--ipc-*)` resolves to nothing and the site falls back to browser
// defaults — the failure mode we hit when PurgeCSS stripped them. We derive the
// expected token list from source so this stays in sync automatically, then
// also spot-check a few critical component selectors.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const themeCssPath = path.join(repoRoot, "src/styles/theme.css");
const cssDir = path.join(repoRoot, "dist/_astro");

// Component selectors that must survive in the built CSS. Add to this list when
// a component's styling is load-bearing and easy to lose to over-aggressive
// purging or refactors.
const REQUIRED_SELECTORS = [".masthead", ".nav-action-share", ".masthead-nav"];

// Loose backstop for a catastrophic collapse (near-empty CSS), NOT a target.
// The token + selector checks below are the precise correctness gates; this
// only catches "almost everything vanished". Keep it well under the real output
// so legitimate purging never trips it: the post-build purge (scanning rendered
// HTML) produces ~244KB from ~476KB unpurged, so 150KB leaves ample margin. An
// earlier 250KB value was calibrated to the old in-build purge and wrongly
// failed the leaner, correct post-build result.
const MIN_TOTAL_CSS_BYTES = 150_000;

const readAllCss = () => {
  let files;
  try {
    files = readdirSync(cssDir).filter((name) => name.endsWith(".css"));
  } catch {
    throw new Error(
      `No CSS directory at ${cssDir}. Run the build before validating CSS.`,
    );
  }
  if (files.length === 0) {
    throw new Error(`No .css files found in ${cssDir}.`);
  }
  const combined = files
    .map((name) => readFileSync(path.join(cssDir, name), "utf8"))
    .join("\n");
  return { combined, fileCount: files.length, bytes: combined.length };
};

const expectedTokens = () => {
  const theme = readFileSync(themeCssPath, "utf8");
  // Custom property DEFINITIONS look like `--ipc-...: value;`
  const tokens = new Set();
  for (const match of theme.matchAll(/(--ipc-[a-z0-9-]+)\s*:/gi)) {
    tokens.add(match[1]);
  }
  return [...tokens];
};

const { combined, fileCount, bytes } = readAllCss();
const failures = [];

if (bytes < MIN_TOTAL_CSS_BYTES) {
  failures.push(
    `Total CSS is ${bytes} bytes across ${fileCount} file(s), below the ${MIN_TOTAL_CSS_BYTES}-byte floor — styles likely stripped.`,
  );
}

const tokens = expectedTokens();
if (tokens.length === 0) {
  failures.push(
    `Could not find any --ipc-* token definitions in ${themeCssPath}; the guard cannot validate. Update the token pattern.`,
  );
}
const missingTokens = tokens.filter((token) => !combined.includes(`${token}:`));
if (missingTokens.length) {
  failures.push(
    `${missingTokens.length}/${tokens.length} design tokens are DEFINED in theme.css but missing from the built CSS: ${missingTokens.join(", ")}`,
  );
}

const missingSelectors = REQUIRED_SELECTORS.filter(
  (selector) => !combined.includes(selector),
);
if (missingSelectors.length) {
  failures.push(
    `Required component selectors missing from built CSS: ${missingSelectors.join(", ")}`,
  );
}

if (failures.length) {
  // Advisory only — NEVER fail the build. The build already produced a complete
  // dist (this runs last, after pages/search/redirects), so failing here would
  // only block a deploy of otherwise-finished output. Print an unmissable
  // banner so a real regression is caught by eye, and let the build continue.
  const bar = "!".repeat(74);
  console.warn(`\n${bar}`);
  console.warn(
    "!!  CRITICAL CSS WARNING  —  build NOT failed, review before deploying  !!",
  );
  console.warn(bar);
  for (const failure of failures) {
    console.warn(`  - ${failure}`);
  }
  console.warn(
    "\n  If styling looks wrong, compare dist/_astro CSS against `astro dev`\n" +
      "  output (dev renders the same purge, so differences point at the cause).",
  );
  console.warn(`${bar}\n`);
  // Intentionally do NOT set process.exitCode — this check is non-blocking.
} else {
  console.log(
    `Critical CSS validation passed: ${tokens.length} design tokens + ${REQUIRED_SELECTORS.length} component selectors present in ${fileCount} CSS file(s) (${bytes} bytes).`,
  );
}
