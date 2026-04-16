import { test, expect } from "@playwright/test";

const forms = [
  { path: "/about/contact/", formName: "contact" },
  { path: "/volunteer/", formName: "volunteer" },
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
      const currentValue = await field.inputValue();
      if (currentValue) {
        continue;
      }
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
      if (await field.isChecked()) {
        continue;
      }
      await field.check();
      continue;
    }
    if (type === "checkbox") {
      if (await field.isChecked()) {
        continue;
      }
      await field.check();
      continue;
    }
    if (await field.inputValue()) {
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
    test(`success › ${form.formName} stays on-page and shows verification instructions`, async ({
      page,
    }) => {
      await installRecaptchaMock(page);
      let submitRequestBody = null;
      const successMessage = `Check your email for ${form.formName}.`;

      await page.route("**/api/forms/submit", async (route) => {
        const req = route.request();
        if (req.method() !== "POST") {
          await route.fallback();
          return;
        }
        submitRequestBody = req.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: successMessage,
            verificationPending: true,
          }),
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
      const originalPathname = new URL(page.url()).pathname;

      await fillRequiredFields(page, formLocator);

      const submitResponsePromise = page.waitForResponse((response) => {
        return (
          response.url().includes("/api/forms/submit") &&
          response.request().method() === "POST"
        );
      });
      await Promise.all([
        submitResponsePromise,
        formLocator.locator('button[type="submit"]').click(),
      ]);

      await expect(page).toHaveURL(new RegExp(`${originalPathname}$`));
      const success = formLocator.locator("[data-form-submit-success]");
      await expect(success).toBeVisible();
      await expect(success).toContainText(successMessage);
      await expect(success.locator("[data-submission-id]")).toHaveCount(0);
      await expect(
        formLocator.locator("[data-form-submit-error]"),
      ).toBeHidden();
    });
  }

  test("error › contact stays on-page and shows the inline error", async ({
    page,
  }) => {
    await installRecaptchaMock(page);

    await page.route("**/api/forms/submit", async (route) => {
      const req = route.request();
      if (req.method() !== "POST") {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Mocked submission failure for e2e.",
        }),
      });
    });

    await page.goto("/about/contact/");
    const formLocator = page.locator('form[name="contact"]');
    await expect(formLocator).toBeVisible();
    const originalPathname = new URL(page.url()).pathname;

    await fillRequiredFields(page, formLocator);
    const submitResponsePromise = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/forms/submit") &&
        response.request().method() === "POST"
      );
    });
    await Promise.all([
      submitResponsePromise,
      formLocator.locator('button[type="submit"]').click(),
    ]);

    await expect(page).toHaveURL(new RegExp(`${originalPathname}$`));
    await expect(
      formLocator.locator("[data-form-submit-success]"),
    ).toBeHidden();
    const error = formLocator.locator("[data-form-submit-error]");
    await expect(error).toBeVisible();
    await expect(error).toContainText("Mocked submission failure for e2e.");
  });

  test("verification email failure › contact shows request reference and logs diagnostics", async ({
    page,
  }) => {
    await installRecaptchaMock(page);

    const consoleMessages = [];
    page.on("console", (msg) => {
      consoleMessages.push({
        text: msg.text(),
        type: msg.type(),
      });
    });

    await page.route("**/api/forms/submit", async (route) => {
      const req = route.request();
      if (req.method() !== "POST") {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message:
            "We received your submission, but sending the verification email failed in this environment.",
          requestId: "req_e2e_verification_failure",
          verificationFailureReason: "send_failed",
          verificationPending: false,
        }),
      });
    });

    await page.goto("/about/contact/");
    const formLocator = page.locator('form[name="contact"]');
    await expect(formLocator).toBeVisible();
    const originalPathname = new URL(page.url()).pathname;

    await fillRequiredFields(page, formLocator);
    const submitResponsePromise = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/forms/submit") &&
        response.request().method() === "POST"
      );
    });
    await Promise.all([
      submitResponsePromise,
      formLocator.locator('button[type="submit"]').click(),
    ]);

    await expect(page).toHaveURL(new RegExp(`${originalPathname}$`));
    const success = formLocator.locator("[data-form-submit-success]");
    await expect(success).toBeVisible();
    await expect(success).toContainText(
      "We received your submission, but sending the verification email failed in this environment.",
    );
    await expect(success).toContainText(
      "Reference: req_e2e_verification_failure.",
    );
    await expect(success.locator("[data-submission-id]")).toHaveCount(0);
    await expect(formLocator.locator("[data-form-submit-error]")).toBeHidden();

    expect(
      consoleMessages.some(
        (entry) =>
          entry.type === "error" &&
          entry.text.includes("Form verification email failed") &&
          entry.text.includes("req_e2e_verification_failure") &&
          entry.text.includes("send_failed"),
      ),
    ).toBe(true);
  });

  test("feedback › footer report issue opens Sentry feedback", async ({
    page,
  }) => {
    await page.goto("/about/contact/");
    await page.evaluate(() => {
      window.__IPC_SENTRY_FEEDBACK__ = {
        __calls: [],
        open(payload) {
          this.__calls.push(payload);
          return Promise.resolve();
        },
      };
    });
    await page.getByRole("link", { name: /report issue/i }).click();

    const calls = await page.evaluate(() => {
      return window.__IPC_SENTRY_FEEDBACK__?.__calls || [];
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      message: "Issue reported from: /about/contact/",
    });
  });
});
