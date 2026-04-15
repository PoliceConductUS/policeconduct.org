import { expect, test } from "@playwright/test";

test.describe("submission status", () => {
  test("verification link success shows submission details and clears token from URL", async ({
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
          status: "in_review",
          statusChangedAt: "2026-04-13T10:30:00.000Z",
          submissionId: "sub_e2e_verified",
          verified: true,
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
    await expect(result).toContainText("in_review");
    await expect(result).toContainText("2026-04-13T10:30:00.000Z");
    await expect(result).toContainText("sub_e2e_verified");
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
    await expect(result).toContainText("Verification failed");
    await expect(result).toContainText("Verification link expired.");
    await expect.poll(() => new URL(page.url()).search).toBe("");
  });

  test("manual lookup renders returned status payload", async ({ page }) => {
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
          statusChangedAt: "2026-04-13T10:45:00.000Z",
          submissionId: "sub_manual_lookup",
          verificationId: "verify_e2e",
        }),
      });
    });

    await page.goto("/status/");
    await page.locator("#submissionId").fill("sub_manual_lookup");
    await page.getByRole("button", { name: "Check status" }).click();

    const result = page.locator("#statusLookupResult");
    await expect(result).toBeVisible();
    await expect(result).toContainText("Status");
    await expect(result).toContainText("in_review");
    await expect(result).toContainText("2026-04-13T10:45:00.000Z");
    await expect(result).toContainText("sub_manual_lookup");
    await expect(result).toContainText("verify_e2e");
  });
});
