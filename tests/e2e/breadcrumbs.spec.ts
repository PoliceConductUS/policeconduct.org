import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const readBreadcrumbItems = async (page: Page) => {
  const breadcrumbs = page.getByRole("navigation", { name: "Breadcrumb" });

  return breadcrumbs.getByRole("listitem").evaluateAll((nodes) =>
    nodes.map((node) => ({
      href: node.querySelector("a")?.getAttribute("href") || null,
      label: node.textContent?.trim() || "",
    })),
  );
};

test.describe("breadcrumbs", () => {
  test("adds Home before legal notice detail breadcrumbs", async ({ page }) => {
    await page.goto("/legal-notice/acceptable-use/");

    await expect(readBreadcrumbItems(page)).resolves.toEqual([
      { href: "/", label: "Home" },
      { href: "/legal-notice/", label: "Legal Notice" },
      { href: null, label: "Acceptable Use Policy" },
    ]);
  });

  test("does not duplicate an existing Home breadcrumb", async ({ page }) => {
    await page.goto("/legal-notice/");

    await expect(readBreadcrumbItems(page)).resolves.toEqual([
      { href: "/", label: "Home" },
      { href: null, label: "Legal Notice" },
    ]);
  });
});
