import { promises as fs } from "node:fs";
import path from "node:path";

const DEFAULT_DIST_DIR = "dist";
const DEFAULT_MAX_ERRORS = 50;

const args = process.argv.slice(2);
const distArg = args.find((arg) => !arg.startsWith("--"));
const maxErrorsArg = args.find((arg) => arg.startsWith("--max-errors="));
const distDir = path.resolve(distArg || DEFAULT_DIST_DIR);
const maxErrors = maxErrorsArg
  ? Number.parseInt(maxErrorsArg.split("=", 2)[1] || "", 10)
  : DEFAULT_MAX_ERRORS;
const errorLimit =
  Number.isFinite(maxErrors) && maxErrors > 0 ? maxErrors : DEFAULT_MAX_ERRORS;

const INLINE_CSS_PATTERNS = [
  {
    label: "<style> tag",
    regex: /<style(?:\s|>)/gi,
  },
  {
    label: "style attribute",
    regex: /\sstyle\s*=/gi,
  },
];

const toRelativePath = (filePath) =>
  path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");

const getLineColumn = (text, index) => {
  let line = 1;
  let lastLineStart = 0;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) {
      line += 1;
      lastLineStart = cursor + 1;
    }
  }
  return {
    column: index - lastLineStart + 1,
    line,
  };
};

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

const collectInlineCssViolations = async (htmlPath) => {
  const html = await fs.readFile(htmlPath, "utf8");
  const violations = [];

  for (const pattern of INLINE_CSS_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(html))) {
      const location = getLineColumn(html, match.index);
      violations.push({
        ...location,
        label: pattern.label,
        snippet: html
          .slice(Math.max(0, match.index - 40), match.index + 80)
          .replace(/\s+/g, " ")
          .trim(),
      });
    }
  }

  return violations;
};

const main = async () => {
  const stat = await fs.stat(distDir).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(
      `Generated site directory not found: ${toRelativePath(distDir)}. Run npm run build first.`,
    );
  }

  const htmlFiles = await walkHtmlFiles(distDir);
  const reported = [];
  let totalViolations = 0;

  for (const htmlPath of htmlFiles) {
    const violations = await collectInlineCssViolations(htmlPath);
    totalViolations += violations.length;
    for (const violation of violations) {
      if (reported.length >= errorLimit) {
        break;
      }
      reported.push({
        file: toRelativePath(htmlPath),
        ...violation,
      });
    }
  }

  if (totalViolations > 0) {
    console.error(
      `Inline CSS is prohibited in generated HTML. Found ${totalViolations} violation(s) across ${htmlFiles.length} HTML file(s).`,
    );
    console.error(
      'Move CSS to external stylesheets and keep Astro build.inlineStylesheets set to "never".',
    );
    for (const violation of reported) {
      console.error(
        `- ${violation.file}:${violation.line}:${violation.column} ${violation.label}: ${violation.snippet}`,
      );
    }
    if (totalViolations > reported.length) {
      console.error(
        `... ${totalViolations - reported.length} additional violation(s) not shown.`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `No inline CSS found in ${htmlFiles.length} generated HTML file(s).`,
  );
};

await main();
