import { expect, test } from "@playwright/test";

for (const surface of ["site", "mockup"]) {
  test(`${surface} jump control rejects executable URLs and preserves page navigation`, async ({
    page,
  }) => {
    await page.goto("/tx/");
    if (surface === "mockup") {
      await page.setContent(
        '<form data-jump-form><select data-jump-select><option value="/tx/">Texas</option></select><button>Go</button></form>',
      );
      await page.addScriptTag({ path: "mockups/civic-index-redesign/app.js" });
    }
    const form = page.locator("[data-jump-form]").first();
    const select = form.locator("[data-jump-select]");
    await select.evaluate((element) => {
      const select = element as HTMLSelectElement;
      select.add(
        new Option(
          "Bad destination",
          "javascript:document.documentElement.dataset.jumpExecuted='yes';void(0)",
        ),
      );
      select.selectedIndex = select.options.length - 1;
    });
    await form.evaluate((element) =>
      (element as HTMLFormElement).requestSubmit(),
    );
    // The mockup delays navigation by 220 ms; observe past that execution window.
    await page.waitForTimeout(350);
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-jump-executed",
      "yes",
    );
    await select.evaluate((element) => {
      const select = element as HTMLSelectElement;
      select.add(new Option("Home", "/"));
      select.selectedIndex = select.options.length - 1;
    });
    await form.evaluate((element) =>
      (element as HTMLFormElement).requestSubmit(),
    );
    await expect(page).toHaveURL("/");
  });
}
