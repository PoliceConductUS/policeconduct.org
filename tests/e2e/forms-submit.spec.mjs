import { test, expect } from "@playwright/test";

const forms = [
  { path: "/about/contact/", formName: "contact" },
  { path: "/volunteer/", formName: "volunteer" },
  { path: "/issue/new/", formName: "issue" },
  { path: "/law-enforcement-agency/new/", formName: "agencyNew" },
  { path: "/law-enforcement-agency/suggest-edit/", formName: "agencyEdit" },
  { path: "/personnel/new/", formName: "personnelNew" },
  { path: "/personnel/suggest-edit/", formName: "officerEdit" },
  { path: "/civil-litigation/new/", formName: "civilLitigationNew" },
  { path: "/civil-litigation/suggest-edit/", formName: "civilLitigationEdit" },
  {
    path: "/legal-notice/data-subject-access-request/",
    formName: "dataSubjectAccessRequest",
  },
  { path: "/report/new/", formName: "reportNew", hasDraft: true },
];

function buildInputValue(type, name) {
  if (name === "organization") {
    return "";
  }
  if (type === "email") {
    return "e2e@example.org";
  }
  if (type === "tel") {
    return "555-0100";
  }
  if (type === "date") {
    return "2026-02-23";
  }
  if (type === "time") {
    return "12:00";
  }
  if (type === "url") {
    return "https://example.org";
  }
  if (type === "number") {
    return "1";
  }
  if (name.toLowerCase().includes("zip")) {
    return "10001";
  }
  if (name.toLowerCase().includes("year")) {
    return "2026";
  }
  return "E2E Test";
}

async function fillRequiredFields(page, formLocator) {
  const required = formLocator.locator(
    "input[required], textarea[required], select[required]",
  );
  const count = await required.count();
  for (let i = 0; i < count; i += 1) {
    const field = required.nth(i);
    if (!(await field.isVisible())) {
      continue;
    }
    if (!(await field.isEnabled())) {
      continue;
    }

    const tag = await field.evaluate((el) => el.tagName.toLowerCase());
    const name = (await field.getAttribute("name")) || "";

    if (tag === "select") {
      const optionValue = await field.evaluate((el) => {
        const select = /** @type {HTMLSelectElement} */ (el);
        const options = Array.from(select.options).filter(
          (o) => !o.disabled && o.value !== "",
        );
        return options.length > 0 ? options[0].value : "";
      });
      if (optionValue) {
        await field.selectOption(optionValue);
      }
      continue;
    }

    const type = ((await field.getAttribute("type")) || "text").toLowerCase();
    if (type === "radio") {
      await field.check();
      continue;
    }
    if (type === "checkbox") {
      await field.check();
      continue;
    }
    await field.fill(buildInputValue(type, name));
  }
}

async function installRecaptchaMock(page) {
  await page.addInitScript(() => {
    window.grecaptcha = {
      enterprise: {
        ready(cb) {
          cb();
        },
        async execute() {
          return "e2e-recaptcha-token";
        },
      },
    };
  });
}

test.describe("form submissions", () => {
  for (const form of forms) {
    test(`submits ${form.formName}`, async ({ page }) => {
      await installRecaptchaMock(page);

      await page.route("**/api/forms/submit", async (route) => {
        const req = route.request();
        if (req.method() !== "POST") {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ submissionId: `e2e_${form.formName}_id` }),
        });
      });

      if (form.hasDraft) {
        await page.route("**/api/forms/draft**", async (route) => {
          const req = route.request();
          if (req.method() === "GET") {
            await route.fulfill({
              status: 204,
              contentType: "application/json",
              body: "",
            });
            return;
          }
          if (req.method() === "POST") {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                draftId: "e2e-draft-id",
                updatedAt: new Date().toISOString(),
              }),
            });
            return;
          }
          await route.fallback();
        });
      }

      await page.goto(form.path);
      const formLocator = page.locator(`form[name="${form.formName}"]`);
      await expect(formLocator).toBeVisible();

      await fillRequiredFields(page, formLocator);

      await formLocator.locator('button[type="submit"]').click();

      const success = formLocator.locator("[data-form-submit-success]");
      await expect(success).toBeVisible();
      await expect(success.locator("[data-submission-id]")).toHaveText(
        `e2e_${form.formName}_id`,
      );
    });
  }
});
