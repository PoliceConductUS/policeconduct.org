import { expect, type Page, test } from "@playwright/test";

type ReportRequestBody = {
  data: Record<string, unknown>;
};

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

async function installDraftMock(page: Page) {
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
}

async function fillRequiredExperienceFields(page: Page) {
  await page
    .locator("#submitterRelationship")
    .selectOption("Directly involved");
  await page.locator("#interactionType").selectOption("Mixed");
  await page.locator("#incidentDate").fill("2026-02-23");
  await page.locator("#location").fill("Phoenix, AZ");
  await page.locator("#whatHappened").fill("The officer explained the stop.");
  await page
    .locator("#howFelt")
    .fill("I felt confused at first, then relieved when it was explained.");
  await page
    .locator("#whatElse")
    .fill("I am not sure whether the stop was handled normally.");
  await page.locator('[name="people[0][name]"]').fill("Officer description");
  await page.locator("#bodycamRequested").selectOption("Not sure");
  await page.locator("#complaintFiled").selectOption("Not sure");
  await page
    .locator("#reportPurpose")
    .selectOption("Help me understand whether this was normal");
  await page.locator("#reporterName").fill("E2E Reporter");
  await page.locator("#reporterEmail").fill("e2e@example.org");
  await page.locator("#consent").check();
}

test.describe("report new", () => {
  test.beforeEach(async ({ page }) => {
    await installDraftMock(page);
  });

  test("frames the page as police interaction documentation", async ({
    page,
  }) => {
    await page.goto("/report/new/");

    await expect(
      page.getByRole("heading", { name: "Document a police interaction" }),
    ).toBeVisible();
    await expect(
      page.getByText("You do not need to prove misconduct"),
    ).toBeVisible();
    await expect(
      page.getByText("Contact information is not published"),
    ).toBeVisible();
    await expect(
      page.getByText("no account or proof of identity"),
    ).toBeVisible();
    await expect(page.locator("[data-officer-assessment]")).toHaveCount(0);
    await expect(page.getByText("Open officer conduct assessment")).toHaveCount(
      0,
    );
  });

  test("keeps at least one required person involved", async ({ page }) => {
    await page.goto("/report/new/");

    await expect(page.locator("[data-person-involved]")).toHaveCount(1);
    await expect(page.locator('[name="people[0][name]"]')).toBeVisible();
    await expect(page.locator('[name="people[0][name]"]')).toHaveAttribute(
      "required",
      "",
    );
    await expect(
      page.getByRole("button", { name: "Remove person" }),
    ).toHaveCount(0);
    await expect(page.locator('[name="people[1][name]"]')).toHaveCount(0);

    await page.getByRole("button", { name: "Add another person" }).click();
    await expect(page.locator("[data-person-involved]")).toHaveCount(2);
    await expect(page.locator('[name="people[1][actions]"]')).toBeVisible();

    await page.getByRole("button", { name: "Remove person" }).nth(1).click();
    await expect(page.locator("[data-person-involved]")).toHaveCount(1);
    await expect(page.locator('[name="people[1][name]"]')).toHaveCount(0);
  });

  test("keeps the new flow usable across desktop and mobile widths", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/report/new/");

    await expect(page.locator("#submitterRelationship")).toBeVisible();
    await expect(page.locator("#whatHappened")).toBeVisible();

    let overflow = await page.evaluate(() => {
      const shell = document.querySelector("[data-report-form-shell]");
      if (!shell) return 0;
      const viewportWidth = window.innerWidth;
      return Math.max(
        ...Array.from(shell.querySelectorAll("*")).map((element) => {
          const rect = element.getBoundingClientRect();
          return Math.max(0, rect.right - viewportWidth, -rect.left);
        }),
      );
    });
    expect(overflow).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(
      page.getByRole("heading", { name: "Document a police interaction" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit my experience" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Add another person" }).click();
    await page.getByRole("button", { name: "Add evidence or record" }).click();
    await expect(page.locator('[name="people[1][actions]"]')).toBeVisible();
    await expect(page.locator('[name="evidence[0][link]"]')).toBeVisible();

    overflow = await page.evaluate(() => {
      const shell = document.querySelector("[data-report-form-shell]");
      if (!shell) return 0;
      const viewportWidth = window.innerWidth;
      return Math.max(
        ...Array.from(shell.querySelectorAll("*")).map((element) => {
          const rect = element.getBoundingClientRect();
          return Math.max(0, rect.right - viewportWidth, -rect.left);
        }),
      );
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("adds and removes optional evidence links", async ({ page }) => {
    await page.goto("/report/new/");

    await expect(page.locator("[data-evidence]")).toHaveCount(0);

    await page.getByRole("button", { name: "Add evidence or record" }).click();
    await page.getByRole("button", { name: "Add evidence or record" }).click();
    await expect(page.locator("[data-evidence]")).toHaveCount(2);
    await expect(page.locator('[name="evidence[1][link]"]')).toBeVisible();

    await page.getByRole("button", { name: "Remove evidence" }).nth(1).click();
    await page.getByRole("button", { name: "Remove evidence" }).click();
    await expect(page.locator("[data-evidence]")).toHaveCount(0);
  });

  test("submits required experience fields and keeps evidence optional", async ({
    page,
  }) => {
    await installRecaptchaMock(page);
    let submitRequestBody: ReportRequestBody | null = null;

    await page.route("**/api/forms/submit", async (route) => {
      submitRequestBody = route.request().postDataJSON() as ReportRequestBody;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message:
            "We received your experience. Please check your email and click the confirmation link. We cannot process the submission until it is confirmed.",
          verificationPending: true,
        }),
      });
    });

    await page.goto("/report/new/");
    await fillRequiredExperienceFields(page);

    const submitResponse = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/forms/submit") &&
        response.request().method() === "POST"
      );
    });

    await page.getByRole("button", { name: "Submit my experience" }).click();
    await submitResponse;

    expect(submitRequestBody).not.toBeNull();
    expect(submitRequestBody!.data).toMatchObject({
      submitterRelationship: "Directly involved",
      interactionType: "Mixed",
      incidentDate: "2026-02-23",
      location: "Phoenix, AZ",
      whatHappened: "The officer explained the stop.",
      howFelt: "I felt confused at first, then relieved when it was explained.",
      whatElse: "I am not sure whether the stop was handled normally.",
      bodycamRequested: "Not sure",
      complaintFiled: "Not sure",
      reportPurpose: "Help me understand whether this was normal",
      reporterName: "E2E Reporter",
      reporterEmail: "e2e@example.org",
      people: [
        {
          name: "Officer description",
        },
      ],
      evidence: [],
    });
    await expect(page.locator("[data-form-submit-success]")).toContainText(
      "cannot process the submission until it is confirmed",
    );
    await expect(page.locator("[data-form-submit-success]")).not.toContainText(
      "submissionId",
    );
  });

  test("submits optional people, evidence, and record metadata", async ({
    page,
  }) => {
    await installRecaptchaMock(page);
    let submitRequestBody: ReportRequestBody | null = null;

    await page.route("**/api/forms/submit", async (route) => {
      submitRequestBody = route.request().postDataJSON() as ReportRequestBody;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Check your email to verify this report.",
          verificationPending: true,
        }),
      });
    });

    await page.goto("/report/new/");
    await fillRequiredExperienceFields(page);
    await page.locator('[name="people[0][name]"]').fill("Officer Zero");
    await page.locator('[name="people[0][badge]"]').fill("1234");
    await page
      .locator('[name="people[0][department]"]')
      .fill("Phoenix Police Department");
    await page
      .locator('[name="people[0][actions]"]')
      .fill("The officer explained the reason for the stop.");
    await page.locator('[name="people[0][central]"]').selectOption("Yes");
    await page.getByRole("button", { name: "Add evidence or record" }).click();
    await page
      .locator('[name="evidence[0][link]"]')
      .fill("https://example.org/evidence-0");
    await page
      .locator('[name="evidence[0][description]"]')
      .fill("Video from the stop.");
    await page.locator("#complaintFiled").selectOption("No");
    await page.locator("#caseNumber").fill("AZ-123");

    const submitResponse = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/forms/submit") &&
        response.request().method() === "POST"
      );
    });

    await page.getByRole("button", { name: "Submit my experience" }).click();
    await submitResponse;

    expect(submitRequestBody).not.toBeNull();
    expect(submitRequestBody!.data).toMatchObject({
      bodycamRequested: "Not sure",
      complaintFiled: "No",
      caseNumber: "AZ-123",
      people: [
        {
          actions: "The officer explained the reason for the stop.",
          badge: "1234",
          central: "Yes",
          department: "Phoenix Police Department",
          name: "Officer Zero",
        },
      ],
      evidence: [
        {
          description: "Video from the stop.",
          link: "https://example.org/evidence-0",
        },
      ],
    });
  });

  test("requires person names and nonblank added evidence rows", async ({
    page,
  }) => {
    await page.goto("/report/new/");
    await fillRequiredExperienceFields(page);

    await page.locator('[name="people[0][name]"]').fill("");
    await page.getByRole("button", { name: "Submit my experience" }).click();
    await expect(page.locator('[name="people[0][name]"]')).toBeFocused();

    await page.locator('[name="people[0][name]"]').fill("Officer description");
    await page.getByRole("button", { name: "Add evidence or record" }).click();
    await page.getByRole("button", { name: "Submit my experience" }).click();
    await expect(page.locator('[name="evidence[0][link]"]')).toBeFocused();
    await expect(page.locator('[name="evidence[0][link]"]')).toHaveJSProperty(
      "validationMessage",
      "Add a link, file name, or description, or remove this evidence row.",
    );
  });

  test("restores draft data for new flow fields", async ({ page }) => {
    let savedDraftData: Record<string, unknown> | null = null;

    await page.unroute("**/api/forms/draft**");
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
    await page
      .locator("#submitterRelationship")
      .selectOption("Directly involved");
    await page.locator("#interactionType").selectOption("Helpful or positive");
    await page.locator("#whatHappened").fill("An officer helped unlock a car.");
    await page.locator("#howFelt").fill("I felt grateful.");
    await page.locator("#whatElse").fill("No proof was available.");
    await page.locator('[name="people[0][name]"]').fill("Officer One");
    await page
      .locator('[name="people[0][actions]"]')
      .fill("Helped open the car.");
    await page.getByRole("button", { name: "Add evidence or record" }).click();
    await page
      .locator('[name="evidence[0][link]"]')
      .fill("https://example.org/evidence-0");

    const draftSave = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/forms/draft") &&
        response.request().method() === "POST"
      );
    });
    await page
      .locator("#reportPurpose")
      .selectOption("Recognize helpful conduct");
    await draftSave;

    await page.reload();

    await expect(page.locator("#submitterRelationship")).toHaveValue(
      "Directly involved",
    );
    await expect(page.locator("#interactionType")).toHaveValue(
      "Helpful or positive",
    );
    await expect(page.locator("#whatHappened")).toHaveValue(
      "An officer helped unlock a car.",
    );
    await expect(page.locator("#howFelt")).toHaveValue("I felt grateful.");
    await expect(page.locator("#whatElse")).toHaveValue(
      "No proof was available.",
    );
    await expect(page.locator("#reportPurpose")).toHaveValue(
      "Recognize helpful conduct",
    );
    await expect(page.locator('[name="people[0][name]"]')).toHaveValue(
      "Officer One",
    );
    await expect(page.locator('[name="people[0][actions]"]')).toHaveValue(
      "Helped open the car.",
    );
    await expect(page.locator("[data-evidence]")).toHaveCount(1);
    await expect(page.locator('[name="evidence[0][link]"]')).toHaveValue(
      "https://example.org/evidence-0",
    );
  });
});
