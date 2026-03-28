import { expect, type Page, test } from "@playwright/test";

type ReportRequestBody = {
  data: Record<string, unknown>;
};

async function answerOfficerAssessment(page: Page, officerIndex: number) {
  const assessment = page
    .locator("[data-officer-assessment]")
    .nth(officerIndex);
  if ((await assessment.getAttribute("open")) === null) {
    await assessment.locator("summary").click();
  }

  const notObservedOptions = assessment.locator(
    'input[data-null-option="true"]',
  );
  const optionCount = await notObservedOptions.count();

  for (let index = 0; index < optionCount; index += 1) {
    await notObservedOptions.nth(index).check();
  }
}

async function installRecaptchaMock(page: Page) {
  await page.addInitScript(() => {
    window.grecaptcha = {
      enterprise: {
        ready(callback) {
          callback();
        },
        async execute() {
          return "e2e-recaptcha-token";
        },
      },
    };
  });
}

async function fillRequiredReportFields(page: Page) {
  await page.locator("#reporterName").fill("E2E Reporter");
  await page.locator("#reporterEmail").fill("e2e@example.org");
  await page.locator("#reporterRole").selectOption("Witness (On-site)");
  await page.locator("#incidentDate").fill("2026-02-23");
  await page.locator("#location").fill("Phoenix, AZ");
  await page.locator('[name="officers[0][name]"]').fill("Officer Zero");
  await answerOfficerAssessment(page, 0);
  await page.locator("#title").fill("E2E Test Report");
  await page.locator("#description").fill("Detailed report narrative.");
  await page.locator("#outcome").fill("Review the incident.");
  await page.locator("#consent").check();
}

test.describe("report new", () => {
  test("adds and removes officers", async ({ page }) => {
    await page.route("**/api/forms/draft**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draftId: "e2e-draft-id",
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/report/new/");
    await expect(page.locator('[name="officers[0][name]"]')).toBeVisible();
    await expect(page.locator('[name="officers[1][name]"]')).toHaveCount(0);

    await page.getByRole("button", { name: "Add another officer" }).click();
    await expect(page.locator('[name="officers[1][name]"]')).toBeVisible();

    await page.locator("[data-remove-officer]").nth(1).click();
    await expect(page.locator("[data-officer]")).toHaveCount(1);
    await expect(page.locator('[name="officers[1][name]"]')).toHaveCount(0);
  });

  test("toggles officer conduct assessment after re-render", async ({
    page,
  }) => {
    await page.route("**/api/forms/draft**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draftId: "e2e-draft-id",
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/report/new/");

    const firstAssessment = page.locator("[data-officer-assessment]").first();
    await expect(firstAssessment).not.toHaveAttribute("open", "");
    await firstAssessment.locator("summary").click();
    await expect(firstAssessment).toHaveAttribute("open", "");
    await firstAssessment.locator("summary").click();
    await expect(firstAssessment).not.toHaveAttribute("open", "");

    await page.getByRole("button", { name: "Add another officer" }).click();

    const secondAssessment = page.locator("[data-officer-assessment]").nth(1);
    await expect(secondAssessment).not.toHaveAttribute("open", "");
    await secondAssessment.locator("summary").click();
    await expect(secondAssessment).toHaveAttribute("open", "");
    await secondAssessment.locator("summary").click();
    await expect(secondAssessment).not.toHaveAttribute("open", "");
  });

  test("adds and removes witnesses", async ({ page }) => {
    await page.route("**/api/forms/draft**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draftId: "e2e-draft-id",
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/report/new/");
    await expect(page.locator("[data-witness]")).toHaveCount(0);

    await page.getByRole("button", { name: "Add witness" }).click();
    await expect(page.locator("[data-witness]")).toHaveCount(1);
    await page.getByRole("button", { name: "Add witness" }).click();
    await expect(page.locator("[data-witness]")).toHaveCount(2);
    await expect(page.locator('[name="witnesses[1][name]"]')).toBeVisible();

    await page.getByRole("button", { name: "Remove witness" }).nth(1).click();
    await expect(page.locator("[data-witness]")).toHaveCount(1);
    await page.getByRole("button", { name: "Remove witness" }).click();
    await expect(page.locator("[data-witness]")).toHaveCount(0);
    await expect(page.locator('[name="witnesses[0][name]"]')).toHaveCount(0);
  });

  test("adds and removes evidence", async ({ page }) => {
    await page.route("**/api/forms/draft**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draftId: "e2e-draft-id",
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/report/new/");
    await expect(page.locator("[data-evidence]")).toHaveCount(0);

    await page.getByRole("button", { name: "Add evidence" }).click();
    await page.getByRole("button", { name: "Add evidence" }).click();
    await expect(page.locator("[data-evidence]")).toHaveCount(2);
    await expect(page.locator('[name="evidence[1][link]"]')).toBeVisible();

    await page.getByRole("button", { name: "Remove evidence" }).nth(1).click();
    await page.getByRole("button", { name: "Remove evidence" }).click();
    await expect(page.locator("[data-evidence]")).toHaveCount(0);
    await expect(page.locator('[name="evidence[0][link]"]')).toHaveCount(0);
  });

  test("saves and restores officers from draft", async ({ page }) => {
    await installRecaptchaMock(page);

    let savedDraftData: Record<string, unknown> | null = null;

    await page.route("**/api/forms/draft**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        if (!savedDraftData) {
          await route.fulfill({ status: 204, body: "" });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: savedDraftData }),
        });
        return;
      }

      const body = request.postDataJSON() as ReportRequestBody;
      savedDraftData = body.data;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draftId: "e2e-draft-id",
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/report/new/");
    await page.locator('[name="officers[0][name]"]').fill("Officer Zero");
    await page
      .locator('[name="officers[0][department]"]')
      .fill("Department Zero");

    await page.getByRole("button", { name: "Add another officer" }).click();
    await page.locator('[name="officers[1][name]"]').fill("Officer One");
    await page
      .locator('[name="officers[1][department]"]')
      .fill("Department One");
    await page.getByRole("button", { name: "Add witness" }).click();
    await page.locator('[name="witnesses[0][name]"]').fill("Witness Zero");
    await page
      .locator('[name="witnesses[0][email]"]')
      .fill("witness0@example.org");
    await page.getByRole("button", { name: "Add evidence" }).click();
    await page
      .locator('[name="evidence[0][link]"]')
      .fill("https://example.org/evidence-0");
    await page
      .locator('[name="evidence[0][description]"]')
      .fill("Evidence Zero");

    const draftSave = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/forms/draft") &&
        response.request().method() === "POST"
      );
    });
    await page.locator("#title").click();
    await draftSave;

    await page.reload();

    await expect(page.locator("[data-officer]")).toHaveCount(2);
    await expect(page.locator('[name="officers[0][name]"]')).toHaveValue(
      "Officer Zero",
    );
    await expect(page.locator('[name="officers[1][name]"]')).toHaveValue(
      "Officer One",
    );
    await expect(page.locator('[name="officers[1][department]"]')).toHaveValue(
      "Department One",
    );
    await expect(page.locator("[data-witness]")).toHaveCount(1);
    await expect(page.locator('[name="witnesses[0][name]"]')).toHaveValue(
      "Witness Zero",
    );
    await expect(page.locator('[name="witnesses[0][email]"]')).toHaveValue(
      "witness0@example.org",
    );
    await expect(page.locator("[data-evidence]")).toHaveCount(1);
    await expect(page.locator('[name="evidence[0][link]"]')).toHaveValue(
      "https://example.org/evidence-0",
    );
    await expect(page.locator('[name="evidence[0][description]"]')).toHaveValue(
      "Evidence Zero",
    );
  });

  test("validates and submits after add/remove officers", async ({ page }) => {
    await installRecaptchaMock(page);

    let submitRequestBody: ReportRequestBody | null = null;
    let submitCount = 0;

    await page.route("**/api/forms/draft**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draftId: "e2e-draft-id",
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.route("**/api/forms/submit", async (route) => {
      submitCount += 1;
      submitRequestBody = route.request().postDataJSON() as ReportRequestBody;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ submissionId: "e2e_report_submit_id" }),
      });
    });

    await page.goto("/report/new/");
    await page.getByRole("button", { name: "Add another officer" }).click();
    await page.getByRole("button", { name: "Add another officer" }).click();

    await page.locator('[name="officers[0][name]"]').fill("Officer Zero");
    await page
      .locator('[name="officers[0][department]"]')
      .fill("Department Zero");
    await page.locator('[name="officers[1][name]"]').fill("Officer One");
    await page
      .locator('[name="officers[1][department]"]')
      .fill("Department One");
    await page.locator('[name="officers[2][name]"]').fill("Officer Two");
    await page
      .locator('[name="officers[2][department]"]')
      .fill("Department Two");
    await page.getByRole("button", { name: "Add witness" }).click();
    await page.locator('[name="witnesses[0][name]"]').fill("Witness Zero");
    await page
      .locator('[name="witnesses[0][email]"]')
      .fill("witness0@example.org");
    await page.getByRole("button", { name: "Add evidence" }).click();
    await page
      .locator('[name="evidence[0][link]"]')
      .fill("https://example.org/evidence-0");
    await page
      .locator('[name="evidence[0][description]"]')
      .fill("Evidence Zero");

    await page.locator("[data-remove-officer]").nth(1).click();
    await expect(page.locator("[data-officer]")).toHaveCount(2);
    await expect(page.locator('[name="officers[0][name]"]')).toHaveValue(
      "Officer Zero",
    );
    await expect(page.locator('[name="officers[1][name]"]')).toHaveValue(
      "Officer Two",
    );
    await page.getByRole("button", { name: "Remove witness" }).click();
    await page.getByRole("button", { name: "Remove evidence" }).click();
    await answerOfficerAssessment(page, 0);
    await answerOfficerAssessment(page, 1);

    await page.getByRole("button", { name: "Submit report" }).click();
    await page.waitForTimeout(250);
    expect(submitCount).toBe(0);
    await expect(page.locator("[data-officer]")).toHaveCount(2);

    await fillRequiredReportFields(page);

    const submitResponse = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/forms/submit") &&
        response.request().method() === "POST"
      );
    });

    await page.getByRole("button", { name: "Submit report" }).click();
    await submitResponse;

    expect(submitRequestBody).not.toBeNull();
    const data = submitRequestBody!.data;

    expect(data).toMatchObject({
      officers: [
        {
          department: "Department Zero",
          name: "Officer Zero",
        },
        {
          department: "Department Two",
          name: "Officer Two",
        },
      ],
      witnesses: [],
      evidence: [],
    });
    expect(data.officers).toHaveLength(2);
    expect(data.witnesses).toHaveLength(0);
    expect(data.evidence).toHaveLength(0);
    await expect(page.locator("[data-form-submit-success]")).toBeVisible();
  });

  test("requires officer assessment answers before submit", async ({
    page,
  }) => {
    await installRecaptchaMock(page);

    let submitCount = 0;

    await page.route("**/api/forms/draft**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draftId: "e2e-draft-id",
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.route("**/api/forms/submit", async (route) => {
      submitCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ submissionId: "e2e_report_submit_id" }),
      });
    });

    await page.goto("/report/new/");
    await page.locator("#reporterName").fill("E2E Reporter");
    await page.locator("#reporterEmail").fill("e2e@example.org");
    await page.locator("#reporterRole").selectOption("Witness (On-site)");
    await page.locator("#incidentDate").fill("2026-02-23");
    await page.locator("#location").fill("Phoenix, AZ");
    await page.locator('[name="officers[0][name]"]').fill("Officer Zero");
    await page.locator("#title").fill("E2E Test Report");
    await page.locator("#description").fill("Detailed report narrative.");
    await page.locator("#outcome").fill("Review the incident.");
    await page.locator("#consent").check();

    await page.getByRole("button", { name: "Submit report" }).click();
    await page.waitForTimeout(250);
    expect(submitCount).toBe(0);

    const firstAssessment = page.locator("[data-officer-assessment]").first();
    await expect(firstAssessment).toHaveAttribute("open", "");

    await answerOfficerAssessment(page, 0);

    const submitResponse = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/forms/submit") &&
        response.request().method() === "POST"
      );
    });

    await page.getByRole("button", { name: "Submit report" }).click();
    await submitResponse;

    expect(submitCount).toBe(1);
  });

  test("requires complete witness and evidence rows before submit", async ({
    page,
  }) => {
    await installRecaptchaMock(page);

    let submitCount = 0;

    await page.route("**/api/forms/draft**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draftId: "e2e-draft-id",
          updatedAt: new Date().toISOString(),
        }),
      });
    });

    await page.route("**/api/forms/submit", async (route) => {
      submitCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ submissionId: "e2e_report_submit_id" }),
      });
    });

    await page.goto("/report/new/");
    await fillRequiredReportFields(page);

    await page.getByRole("button", { name: "Add witness" }).click();
    await expect(page.locator('label[for="witness-0-name"]')).toHaveText(
      "Name*",
    );
    await expect(page.locator('label[for="witness-0-phone"]')).toHaveText(
      "Phone*",
    );
    await expect(page.locator('label[for="witness-0-email"]')).toHaveText(
      "Email*",
    );
    await page.locator('[name="witnesses[0][name]"]').fill("Witness Zero");
    await page
      .locator('[name="witnesses[0][email]"]')
      .fill("witness0@example.org");

    await page.getByRole("button", { name: "Submit report" }).click();
    await page.waitForTimeout(250);
    expect(submitCount).toBe(0);

    await page.locator('[name="witnesses[0][phone]"]').fill("555-0100");
    await page.getByRole("button", { name: "Add evidence" }).click();
    await expect(page.locator('label[for="evidence-link-0"]')).toHaveText(
      "Evidence link*",
    );
    await expect(
      page.locator('label[for="evidence-description-0"]'),
    ).toHaveText("Description*");
    await page
      .locator('[name="evidence[0][link]"]')
      .fill("https://example.org/evidence-0");

    await page.getByRole("button", { name: "Submit report" }).click();
    await page.waitForTimeout(250);
    expect(submitCount).toBe(0);

    const submitResponse = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/forms/submit") &&
        response.request().method() === "POST"
      );
    });

    await page
      .locator('[name="evidence[0][description]"]')
      .fill("Evidence Zero");
    await page.getByRole("button", { name: "Submit report" }).click();
    await submitResponse;

    expect(submitCount).toBe(1);
    await expect(page.locator("[data-form-submit-success]")).toBeVisible();
  });
});
