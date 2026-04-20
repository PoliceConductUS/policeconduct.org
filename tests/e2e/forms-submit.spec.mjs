import { test, expect } from "@playwright/test";

const verificationInstructions =
  "We received your submission. Check your email and open the verification link within 15 minutes. Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.";
const verificationEmailFailedMessage =
  "We received your submission, but sending the verification email failed in this environment. Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.";

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

async function fillRequiredFields(page, formLocator, formName = "") {
  if (formName === "dataSubjectAccessRequest") {
    await formLocator.locator("#dsarName").fill("E2E Test");
    await formLocator.locator("#dsarEmail").fill("e2e@example.org");
    await formLocator.locator("#requestAsPersonal").check();
    await formLocator.locator("#dsarLaw").selectOption("gdpr");
    await formLocator.locator("#actionKnow").check();
    await formLocator.locator("#confirmAccurate").check();
    await formLocator.locator("#confirmDeletion").check();
    await formLocator.locator("#confirmEmail").check();
    return;
  }

  const textLikeFields = formLocator.locator(
    'input[required]:not([type="radio"]):not([type="checkbox"]), textarea[required]',
  );
  const textLikeCount = await textLikeFields.count();
  for (let i = 0; i < textLikeCount; i += 1) {
    const field = textLikeFields.nth(i);
    if (!(await field.isVisible()) || !(await field.isEnabled())) {
      continue;
    }
    if (await field.inputValue()) {
      continue;
    }

    const type = ((await field.getAttribute("type")) || "text").toLowerCase();
    const name = (await field.getAttribute("name")) || "";
    await field.fill(buildInputValue(type, name));
  }

  const selects = formLocator.locator("select[required]");
  const selectCount = await selects.count();
  for (let i = 0; i < selectCount; i += 1) {
    const field = selects.nth(i);
    if (!(await field.isVisible()) || !(await field.isEnabled())) {
      continue;
    }
    if (await field.inputValue()) {
      continue;
    }

    const optionValues = await field.evaluate((el) => {
      const select = /** @type {HTMLSelectElement} */ (el);
      return Array.from(select.options)
        .filter((o) => !o.disabled && o.value !== "")
        .map((o) => o.value);
    });
    for (const optionValue of optionValues) {
      await field.selectOption(optionValue);
      if ((await field.inputValue()) === optionValue) {
        break;
      }
    }
  }

  const requiredRadioNames = await formLocator.evaluate((form) => {
    const names = new Set();
    for (const input of form.querySelectorAll(
      'input[type="radio"][required]',
    )) {
      if (
        input instanceof HTMLInputElement &&
        input.name &&
        input.offsetParent !== null &&
        !input.disabled
      ) {
        names.add(input.name);
      }
    }
    return Array.from(names);
  });
  for (const name of requiredRadioNames) {
    const option = formLocator
      .locator(`input[type="radio"][required][name="${name}"]`)
      .first();
    if (await option.isChecked()) {
      continue;
    }
    await option.check();
  }

  const requiredCheckboxes = formLocator.locator(
    'input[type="checkbox"][required]',
  );
  const checkboxCount = await requiredCheckboxes.count();
  for (let i = 0; i < checkboxCount; i += 1) {
    const field = requiredCheckboxes.nth(i);
    if (!(await field.isVisible()) || !(await field.isEnabled())) {
      continue;
    }
    if (await field.isChecked()) {
      continue;
    }
    await field.check();
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
            message: verificationInstructions,
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

      await fillRequiredFields(page, formLocator, form.formName);

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
      await expect(success).toContainText(verificationInstructions);
      await expect(success).not.toContainText("submissionId");
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

    await fillRequiredFields(page, formLocator, "contact");
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
          message: verificationEmailFailedMessage,
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

    await fillRequiredFields(page, formLocator, "contact");
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
    await expect(success).toContainText(verificationEmailFailedMessage);
    await expect(success).toContainText(
      "Reference: req_e2e_verification_failure.",
    );
    await expect(success).not.toContainText("submissionId");
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
