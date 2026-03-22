import { expect, test } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const recaptchaFormRoutes = [
  "/about/contact/",
  "/volunteer/",
  "/report/new/",
  "/personnel/new/",
  "/personnel/suggest-edit/",
  "/law-enforcement-agency/new/",
  "/law-enforcement-agency/suggest-edit/",
  "/civil-litigation/new/",
  "/civil-litigation/suggest-edit/",
  "/legal-notice/data-subject-access-request/",
];

const nonRecaptchaRoutes = [
  "/",
  "/about/",
  "/report/",
  "/personnel/tx/",
  "/law-enforcement-agency/tx/",
];

const repoRoot = path.resolve(process.cwd());
const pagesRoot = path.join(repoRoot, "src/pages");

const collectAstroPages = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectAstroPages(fullPath);
      }
      if (entry.isFile() && entry.name.endsWith(".astro")) {
        return [fullPath];
      }
      return [];
    }),
  );
  return files.flat();
};

test.describe("recaptcha", () => {
  test.describe("route loading", () => {
    for (const route of recaptchaFormRoutes) {
      test(`${route} initializes recaptcha`, async ({ page }) => {
        await page.goto(route);
        const recaptchaScript = page.locator(
          'script[src*="google.com/recaptcha/enterprise.js"]',
        );
        await expect(recaptchaScript).toHaveCount(1);
        const siteKey = await page.evaluate(
          () => window.__RECAPTCHA_SITE_KEY__,
        );
        expect(typeof siteKey).toBe("string");
        expect(siteKey.trim().length).toBeGreaterThan(0);
      });
    }

    for (const route of nonRecaptchaRoutes) {
      test(`${route} does not load recaptcha`, async ({ page }) => {
        await page.goto(route);
        const recaptchaScript = page.locator(
          'script[src*="google.com/recaptcha/enterprise.js"]',
        );
        await expect(recaptchaScript).toHaveCount(0);
      });
    }
  });

  test("source › every protected form page warms recaptcha on init", async () => {
    const astroFiles = await collectAstroPages(pagesRoot);
    const offenders: string[] = [];

    for (const filePath of astroFiles) {
      const source = await readFile(filePath, "utf8");
      const usesFormSubmitPath =
        source.includes("submitJsonForm(") ||
        source.includes("recaptchaAction:");

      if (!usesFormSubmitPath) {
        continue;
      }

      const importsFormsModule = source.includes(
        'from "#src/lib/client/forms.ts"',
      );
      const warmsRecaptcha = source.includes("initRecaptcha()");

      if (!importsFormsModule || !warmsRecaptcha) {
        offenders.push(path.relative(repoRoot, filePath));
      }
    }

    expect(offenders).toEqual([]);
  });
});
