/**
 * Fails the build if a generated /personnel/ page still carries a
 * user-generated-content surface while personnel UGC is suspended.
 *
 * The suspension is a policy decision, not a styling preference. A page
 * redesign that reintroduces a comment thread or a submission entry point on a
 * named individual's profile should break the build, not ship quietly.
 *
 * When PERSONNEL_UGC_SUSPENDED is false this check does nothing.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

import { PERSONNEL_UGC_SUSPENDED } from "../src/lib/ugc-policy.ts";

const DEFAULT_DIST_DIR = "dist";
const distArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const distDir = path.resolve(distArg || DEFAULT_DIST_DIR);

/** Checked on every generated /personnel/ page. */
const PROHIBITED_EVERYWHERE = [
  { label: "Disqus comment thread", regex: /disqus/gi },
  {
    label: "personnel submission form",
    regex: /<form[^>]+name="(?:personnelNew|officerEdit)"/gi,
  },
];

/**
 * Checked on every generated /personnel/ page except the two intake pages
 * themselves, which legitimately reference their own URL in canonical and
 * Open Graph tags.
 */
const PROHIBITED_ENTRY_POINTS = [
  {
    label: "link to the personnel edit form",
    regex: /\/personnel\/suggest-edit\//g,
  },
  { label: "link to the personnel intake form", regex: /\/personnel\/new\//g },
];

const INTAKE_PAGES = new Set([
  "personnel/new/index.html",
  "personnel/suggest-edit/index.html",
]);

const toRelativePath = (filePath) =>
  path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");

const walkHtmlFiles = async (dir) => {
  const files = [];
  const dirs = [dir];

  while (dirs.length > 0) {
    const currentDir = dirs.pop();
    if (!currentDir) {
      continue;
    }

    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        dirs.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        files.push(fullPath);
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
};

const main = async () => {
  if (!PERSONNEL_UGC_SUSPENDED) {
    console.log(
      "Personnel UGC is enabled; skipping the personnel UGC surface check.",
    );
    return;
  }

  const stat = await fs.stat(distDir).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(
      `Generated site directory not found: ${toRelativePath(distDir)}. Run npm run build first.`,
    );
  }

  const personnelDir = path.join(distDir, "personnel");
  const personnelExists = await fs.stat(personnelDir).catch(() => null);
  if (!personnelExists?.isDirectory()) {
    console.log("No generated /personnel/ pages to check.");
    return;
  }

  const htmlFiles = await walkHtmlFiles(personnelDir);
  const violations = [];

  for (const htmlPath of htmlFiles) {
    const html = await fs.readFile(htmlPath, "utf8");
    const relativeToDist = path
      .relative(distDir, htmlPath)
      .replaceAll(path.sep, "/");
    const surfaces = INTAKE_PAGES.has(relativeToDist)
      ? PROHIBITED_EVERYWHERE
      : [...PROHIBITED_EVERYWHERE, ...PROHIBITED_ENTRY_POINTS];

    for (const surface of surfaces) {
      surface.regex.lastIndex = 0;
      if (surface.regex.test(html)) {
        violations.push({
          file: toRelativePath(htmlPath),
          label: surface.label,
        });
      }
    }
  }

  if (violations.length > 0) {
    console.error(
      `Personnel user-generated content is suspended, but ${violations.length} surface(s) still render on /personnel/ pages.`,
    );
    console.error(
      "See src/lib/ugc-policy.ts. Remove the surface, or lift the suspension deliberately.",
    );
    for (const violation of violations.slice(0, 50)) {
      console.error(`- ${violation.file}: ${violation.label}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `No personnel UGC surfaces found in ${htmlFiles.length} generated /personnel/ page(s).`,
  );
};

await main();
