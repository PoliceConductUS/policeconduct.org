import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PurgeCSS } from "purgecss";

// Post-build CSS purge — runs AFTER `astro build`, against the RENDERED HTML in
// dist/, not source. This is the only configuration where page drift is
// impossible: every class that appears on any of the ~165k built pages is in
// that HTML, so purge can only remove selectors used on zero pages. Dynamically
// composed classes, data-driven classes, and Astro build-time scope classes
// (`.foo:where(.astro-<hash>)`) are all present in the output, so they're kept
// automatically — no safelist guesswork required.
//
// Why not have PurgeCSS glob dist/**/*.html directly: at ~165k files that is
// slow and memory-heavy. Instead we stream every HTML file once, extract the
// UNION of extractable tokens (class/tag/attribute/id words), and hand PurgeCSS
// one deduped token blob. Same result, far cheaper.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const distDir = path.join(repoRoot, "dist");
const cssDir = path.join(distDir, "_astro");

// PurgeCSS's default extractor keeps any selector whose tokens all appear in the
// content. Tokens in HTML classes/attributes/tags match this set.
const TOKEN_RE = /[A-Za-z0-9_-]+/g;

const READ_CONCURRENCY = 64;

const walkHtml = async (rootDir) => {
  // Iterative walk with an explicit stack — a recursive walk that spreads child
  // results into push() overflows the call/argument stack at ~165k files.
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip the CSS/asset and pagefind dirs — no HTML worth scanning.
        if (entry.name === "_astro" || entry.name === "pagefind") continue;
        stack.push(full);
      } else if (entry.name.endsWith(".html")) {
        out.push(full);
      }
    }
  }
  return out;
};

const extractTokensFromFiles = async (files) => {
  const tokens = new Set();
  let index = 0;
  const worker = async () => {
    while (index < files.length) {
      const file = files[index++];
      const html = await readFile(file, "utf8");
      const matches = html.match(TOKEN_RE);
      if (matches) for (const token of matches) tokens.add(token);
    }
  };
  await Promise.all(
    Array.from({ length: READ_CONCURRENCY }, () => worker()),
  );
  return tokens;
};

const main = async () => {
  const start = Date.now();

  const htmlFiles = await walkHtml(distDir);
  if (htmlFiles.length === 0) {
    throw new Error(`No HTML files under ${distDir}. Run the build first.`);
  }

  const tokens = await extractTokensFromFiles(htmlFiles);
  const content = [{ raw: [...tokens].join(" "), extension: "html" }];

  const cssFiles = (await readdir(cssDir))
    .filter((name) => name.endsWith(".css"))
    .map((name) => path.join(cssDir, name));
  if (cssFiles.length === 0) {
    throw new Error(`No CSS files in ${cssDir}.`);
  }

  let beforeTotal = 0;
  let afterTotal = 0;

  // Purge each CSS file in place, keeping its filename (Astro's content hash) so
  // the HTML <link href> references still resolve — only the bytes change.
  const results = await new PurgeCSS().purge({
    content,
    css: cssFiles,
    // Never drop CSS custom properties: `--ipc-*` design tokens are defined in
    // one chunk but used in others, and PurgeCSS analyzes each file
    // independently, so it cannot see cross-file usage. Keeping all variables
    // avoids deleting live tokens. (Was the root cause of the stripped palette.)
    variables: false,
    keyframes: false,
    fontFace: false,
    safelist: {
      // Classes added/removed by CLIENT-SIDE JS at runtime are NOT in the
      // static HTML we scan, so they must be listed explicitly or purge strips
      // them and breaks interactive components. Bootstrap's JS (collapse,
      // modal, offcanvas, dropdown, tab, scrollspy, carousel, alert, tooltip,
      // popover) toggles these; AOS and Leaflet add theirs at runtime too.
      standard: [
        /^modal/,
        /^offcanvas/,
        /^tooltip/,
        /^popover/,
        /^collapse/,
        /^collapsing$/,
        /^accordion/,
        /^dropdown/,
        /^carousel/,
        /^alert/,
        /^fade$/,
        /^show$/,
        /^showing$/,
        /^hiding$/,
        /^active$/,
        /^disabled$/,
        /^sticky-top$/,
        /^scrolled$/,
        /-open$/,
      ],
      // greedy keeps any selector containing these anywhere (e.g. compound
      // `.navbar-collapse.show`, Astro scope classes, AOS/Leaflet).
      greedy: [
        /^astro-/,
        /aos/,
        /data-aos/,
        /leaflet/,
        /^data-bs-/,
        /modal/,
        /offcanvas/,
        /collapse/,
        /dropdown/,
        /tooltip/,
        /popover/,
      ],
    },
  });

  for (const result of results) {
    const before = (await stat(result.file)).size;
    await writeFile(result.file, result.css, "utf8");
    beforeTotal += before;
    afterTotal += Buffer.byteLength(result.css, "utf8");
  }

  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `Post-build CSS purge: scanned ${htmlFiles.length} HTML file(s), ` +
      `${tokens.size} unique tokens; ${cssFiles.length} CSS file(s) ` +
      `${beforeTotal} -> ${afterTotal} bytes ` +
      `(${Math.round((1 - afterTotal / beforeTotal) * 100)}% smaller) in ${seconds}s.`,
  );
};

main().catch((error) => {
  // Non-blocking: purge runs last, after a complete dist exists. If it crashes,
  // the CSS is simply left unpurged (larger, but fully functional) — better to
  // ship that than to fail the whole build over an optimization step. Warn
  // loudly so it gets fixed.
  const bar = "!".repeat(74);
  console.warn(`\n${bar}`);
  console.warn("!!  POST-BUILD CSS PURGE FAILED  —  shipping UNPURGED css, build continued  !!");
  console.warn(bar);
  console.warn(error instanceof Error ? error.stack : String(error));
  console.warn(`${bar}\n`);
  // Intentionally do NOT set process.exitCode.
});
