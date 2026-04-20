import { expect, test } from "@playwright/test";

test.describe("submission status", () => {
  const verifiedMessage =
    "Your submission has been verified. Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.";
  const verificationFailedMessage =
    "We could not verify your submission. Verification link expired. Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.";

  test("verification link success shows submission ID and passes it to status lookup", async ({
    page,
  }) => {
    await page.route("**/api/forms/verify-link", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: verifiedMessage,
          submissionId: "sub_e2e_verified",
        }),
      });
    });

    const verifyResponse = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/forms/verify-link") &&
        response.request().method() === "POST"
      );
    });
    await page.goto("/verify/?token=test-verification-id.test-secret");
    await verifyResponse;

    const result = page.locator("#verificationResult");
    await expect(result).toBeVisible();
    await expect(result).toContainText("Submission Verified");
    await expect(result).toContainText(verifiedMessage);
    await expect(result).toContainText("Submission ID: sub_e2e_verified.");
    await expect(result).toContainText(
      "This is the only place your submission ID will be shown. Please save it now.",
    );
    await page.getByRole("button", { name: "Check status" }).click();

    await expect(page).toHaveURL(/\/status\/$/);
    await expect(page.locator("#submissionId")).toHaveValue("sub_e2e_verified");
  });

  test("verification success survives reload before status handoff", async ({
    page,
  }) => {
    await page.route("**/api/forms/verify-link", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: verifiedMessage,
          submissionId: "sub_e2e_verified_reload",
        }),
      });
    });

    await page.goto("/verify/?token=test-verification-id.test-secret");
    await expect(page.locator("#verificationResult")).toContainText(
      verifiedMessage,
    );
    await expect(page.locator("#verificationResult")).toContainText(
      "Submission ID: sub_e2e_verified_reload.",
    );

    await page.reload();

    await expect(page).toHaveURL(/\/verify\/$/);
    await expect(page.locator("#verificationResult")).toContainText(
      verifiedMessage,
    );
    await expect(page.locator("#verificationResult")).toContainText(
      "Submission ID: sub_e2e_verified_reload.",
    );
    await page.getByRole("button", { name: "Check status" }).click();
    await expect(page).toHaveURL(/\/status\/$/);
    await expect(page.locator("#submissionId")).toHaveValue(
      "sub_e2e_verified_reload",
    );
  });

  test("verification link missing token fails closed without calling the API", async ({
    page,
  }) => {
    let verifyRequestCount = 0;
    await page.route("**/api/forms/verify-link", async (route) => {
      verifyRequestCount += 1;
      await route.fallback();
    });

    await page.goto("/verify/");

    const result = page.locator("#verificationResult");
    await expect(result).toBeVisible();
    await expect(result).toContainText("Submission Verification Failed");
    await expect(result).toContainText("Missing verification token.");
    await expect(page.locator("#verificationActions")).toHaveClass(/d-none/);
    expect(verifyRequestCount).toBe(0);
  });

  test("verification success falls back to submission ID when API omits message", async ({
    page,
  }) => {
    await page.route("**/api/forms/verify-link", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          submissionId: "sub_e2e_fallback_message",
        }),
      });
    });

    await page.goto("/verify/?token=test-verification-id.test-secret");

    const result = page.locator("#verificationResult");
    await expect(result).toBeVisible();
    await expect(result).toContainText("Submission Verified");
    await expect(result).toContainText(
      "Submission ID: sub_e2e_fallback_message.",
    );
    await expect(result).toContainText(
      "This is the only place your submission ID will be shown. Please save it now.",
    );

    await page.reload();
    await expect(page.locator("#verificationResult")).toContainText(
      "Submission ID: sub_e2e_fallback_message.",
    );
  });

  test("verification success without submission ID fails closed", async ({
    page,
  }) => {
    await page.route("**/api/forms/verify-link", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: verifiedMessage,
        }),
      });
    });

    await page.goto("/verify/?token=test-verification-id.test-secret");

    const result = page.locator("#verificationResult");
    await expect(result).toBeVisible();
    await expect(result).toContainText("Submission Verification Failed");
    await expect(result).toContainText(
      "The verification response did not include a submission ID.",
    );
    await expect(page.locator("#verificationActions")).toHaveClass(/d-none/);
  });

  test("verification link failure shows inline failure message", async ({
    page,
  }) => {
    await page.route("**/api/forms/verify-link", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          message: verificationFailedMessage,
        }),
      });
    });

    const verifyResponse = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/forms/verify-link") &&
        response.request().method() === "POST"
      );
    });
    await page.goto("/verify/?token=test-verification-id.test-secret");
    await verifyResponse;

    const result = page.locator("#verificationResult");
    await expect(result).toBeVisible();
    await expect(result).toContainText("Submission Verification Failed");
    await expect(result).toContainText(verificationFailedMessage);
  });

  test("manual lookup renders submission status text", async ({ page }) => {
    await page.route("**/api/status/**", async (route) => {
      const request = route.request();
      if (request.method() !== "GET") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Submission sub_manual_lookup status: in_review",
          status: "in_review",
        }),
      });
    });

    await page.goto("/status/");
    await page.locator("#submissionId").fill("sub_manual_lookup");
    await page.getByRole("button", { name: "Check status" }).click();

    const result = page.locator("#statusLookupResult");
    await expect(result).toBeVisible();
    await expect(result).toContainText("Status");
    await expect(result).toContainText(
      "Submission sub_manual_lookup status: in_review",
    );
    await expect(result).not.toContainText("submissionId");
    await expect(result).not.toContainText("verificationId");
    await expect(result).not.toContainText("statusChangedAt");
  });

  test("manual lookup falls back to local status text when API omits message", async ({
    page,
  }) => {
    await page.route("**/api/status/**", async (route) => {
      const request = route.request();
      if (request.method() !== "GET") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "pending",
        }),
      });
    });

    await page.goto("/status/");
    await page.locator("#submissionId").fill("sub_manual_pending");
    await page.getByRole("button", { name: "Check status" }).click();

    const result = page.locator("#statusLookupResult");
    await expect(result).toBeVisible();
    await expect(result).toContainText("Status");
    await expect(result).toContainText(
      "Submission sub_manual_pending status: pending",
    );
    await expect(result).not.toContainText("verificationId");
    await expect(result).not.toContainText("statusChangedAt");
  });
});
