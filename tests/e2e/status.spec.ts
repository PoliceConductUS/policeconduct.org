import { expect, test } from "@playwright/test";

test.describe("submission status", () => {
  test("verification link success shows submission status and clears token from URL", async ({
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
          submissionId: "sub_e2e_verified",
        }),
      });
    });

    const verifyRequest = page.waitForRequest((request) => {
      return (
        request.url().includes("/api/forms/verify-link") &&
        request.method() === "POST"
      );
    });
    await page.goto("/status/?verify=test-verification-id.test-secret");
    await verifyRequest;

    const result = page.locator("#statusLookupResult");
    await expect(result).toBeVisible();
    await expect(result).toContainText("Status");
    await expect(result).toContainText(
      "Submission sub_e2e_verified status: in_review",
    );
    await expect(page.locator("#submissionId")).toHaveValue("sub_e2e_verified");
    await expect.poll(() => new URL(page.url()).search).toBe("");
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
          error: "Verification link expired.",
        }),
      });
    });

    const verifyRequest = page.waitForRequest((request) => {
      return (
        request.url().includes("/api/forms/verify-link") &&
        request.method() === "POST"
      );
    });
    await page.goto("/status/?verify=test-verification-id.test-secret");
    await verifyRequest;

    const result = page.locator("#statusLookupResult");
    await expect(result).toBeVisible();
    await expect(result).toContainText("Submission Verification Failed");
    await expect(result).toContainText("Verification link expired.");
    await expect.poll(() => new URL(page.url()).search).toBe("");
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
});
