import { expect, test } from "@playwright/test";

test.describe("submission status", () => {
  const verifiedMessage =
    "Your submission has been verified. Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.";
  const verificationFailedMessage =
    "We could not verify your submission. Verification link expired. Your submission will not be accepted for review unless it is verified. Please contact hello@policeconduct.org if you need help.";
  const verificationExpiredMessage =
    "This verification link has expired. Links stay valid for 15 minutes. We still have your submission and you do not need to fill the form in again — ask us for a new link below and we will email one to the same address.";

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
    // Landing here with no token is not an error worth shouting about — it is
    // also where a reload lands after a successful resend. It should say what
    // to do rather than name a missing query parameter.
    await expect(result).toContainText("Open the Link From Your Email");
    await expect(result).toContainText(
      "This page verifies a submission when you arrive from the link in our email.",
    );
    await expect(page.locator("#verificationActions")).toHaveClass(/d-none/);
    await expect(page.locator("#resendActions")).toHaveClass(/d-none/);
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
          reason: "not_found",
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
    // A failure a resend cannot fix must not advertise one.
    await expect(page.locator("#resendActions")).toHaveClass(/d-none/);
  });

  // INS-89: an expired link was a cul-de-sac, and expiry is by far the
  // commonest way verification fails. Two submitters in the measured sample
  // responded by filling the whole form in again.
  test("an expired link offers a new one, and sending it reports back", async ({
    page,
  }) => {
    await page.route("**/api/forms/verify-link", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          reason: "expired",
          canResend: true,
          message: verificationExpiredMessage,
        }),
      });
    });

    let resendBody: unknown = null;
    await page.route("**/api/forms/resend-verification", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        await route.fallback();
        return;
      }
      resendBody = request.postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message:
            "We have emailed a new verification link to the address on this submission. It is valid for 15 minutes. If it does not arrive, please check your spam folder.",
        }),
      });
    });

    await page.goto("/verify/?token=test-verification-id.test-secret");

    const result = page.locator("#verificationResult");
    await expect(result).toContainText("Verification Link Expired");
    await expect(result).toContainText(
      "you do not need to fill the form in again",
    );
    await expect(result).not.toContainText("will not be accepted for review");

    const resendButton = page.getByRole("button", {
      name: "Email me a new link",
    });
    await expect(resendButton).toBeVisible();
    await resendButton.click();

    await expect(result).toContainText("New Link Sent");
    await expect(result).toContainText(
      "We have emailed a new verification link",
    );
    // The expired token is what buys the new link; there is no address input.
    expect(resendBody).toEqual({
      token: "test-verification-id.test-secret",
    });
    await expect(page.locator("#resendActions")).toHaveClass(/d-none/);
    // The spent token must leave the URL, or a reload reports an invalid link
    // at somebody who did exactly the right thing.
    await expect(page).toHaveURL(/\/verify\/$/);
  });

  test("an expired link already at the resend cap does not offer one", async ({
    page,
  }) => {
    let resendRequestCount = 0;
    await page.route("**/api/forms/resend-verification", async (route) => {
      resendRequestCount += 1;
      await route.fallback();
    });
    await page.route("**/api/forms/verify-link", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          reason: "expired",
          canResend: false,
          message:
            "We could not verify your submission. This verification link has expired and we have already sent as many replacements as we can. We still have what you sent us. Please contact hello@policeconduct.org if you need help.",
        }),
      });
    });

    await page.goto("/verify/?token=test-verification-id.test-secret");

    await expect(page.locator("#verificationResult")).toContainText(
      "Verification Link Expired",
    );
    await expect(page.locator("#resendActions")).toHaveClass(/d-none/);
    expect(resendRequestCount).toBe(0);
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
