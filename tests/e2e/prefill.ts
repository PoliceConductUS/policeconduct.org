import { expect, type Page } from "@playwright/test";

export type PrefillKey =
  | "prefill:contact"
  | "prefill:reportNew"
  | "prefill:issueNew"
  | "prefill:civilLitigationNew"
  | "prefill:personnelNew"
  | "prefill:personnelSuggestEdit"
  | "prefill:agencySuggestEdit";

export async function seedFlashPrefill(
  page: Page,
  key: PrefillKey,
  payload: Record<string, unknown>,
): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    ({ prefillKey, prefillPayload }) => {
      window.sessionStorage.setItem(prefillKey, JSON.stringify(prefillPayload));
    },
    { prefillKey: key, prefillPayload: payload },
  );
}

export async function assertPrefillApplied(
  page: Page,
  key: string,
  payload: Record<string, unknown>,
): Promise<void> {
  switch (key) {
    case "prefill:contact": {
      if (typeof payload.whoami === "string" && payload.whoami.trim()) {
        const selectedText = await page
          .locator("#whoami option:checked")
          .textContent();
        expect((selectedText || "").toLowerCase()).toContain(
          payload.whoami.toLowerCase(),
        );
      }
      if (typeof payload.message === "string") {
        await expect(page.locator("#message")).toHaveValue(payload.message);
      }
      break;
    }
    case "prefill:reportNew": {
      if (typeof payload["officers[0][department]"] === "string") {
        await expect(
          page.locator(".officer-entry .officer-department").first(),
        ).toHaveValue(payload["officers[0][department]"]);
      }
      if (typeof payload["officers[0][name]"] === "string") {
        await expect(
          page.locator(".officer-entry .officer-name").first(),
        ).toHaveValue(payload["officers[0][name]"]);
      }
      break;
    }
    case "prefill:issueNew": {
      if (typeof payload.message === "string") {
        await expect(page.locator("#message")).toHaveValue(payload.message);
      }
      break;
    }
    case "prefill:civilLitigationNew": {
      if (typeof payload.jurisdiction === "string") {
        const expected =
          payload.jurisdiction.trim().length === 2
            ? payload.jurisdiction.toUpperCase()
            : payload.jurisdiction;
        await expect(page.locator("#jurisdiction")).toHaveValue(expected);
      }
      break;
    }
    case "prefill:personnelNew": {
      if (typeof payload.currentAgency === "string") {
        await expect(page.locator("#currentAgency")).toHaveValue(
          payload.currentAgency,
        );
      }
      if (typeof payload.currentAgencyCity === "string") {
        await expect(page.locator("#currentAgencyCity")).toHaveValue(
          payload.currentAgencyCity,
        );
      }
      if (typeof payload.currentAgencyState === "string") {
        await expect(page.locator("#currentAgencyState")).toHaveValue(
          payload.currentAgencyState,
        );
      }
      break;
    }
    case "prefill:personnelSuggestEdit": {
      if (typeof payload.officerPath === "string") {
        await expect(page.locator("#officerPath")).toHaveValue(
          payload.officerPath,
        );
      }
      break;
    }
    case "prefill:agencySuggestEdit": {
      if (typeof payload.agencyPath === "string") {
        await expect(page.locator("#agencyPath")).toHaveValue(
          payload.agencyPath,
        );
      }
      if (typeof payload.jurisdiction === "string") {
        await expect(page.locator("#jurisdiction")).toHaveValue(
          payload.jurisdiction.toUpperCase(),
        );
      }
      break;
    }
    default:
      throw new Error(`Unsupported prefill key: ${key}`);
  }
}

export async function assertPrefillConsumed(
  page: Page,
  key: PrefillKey,
): Promise<void> {
  const value = await page.evaluate((prefillKey) => {
    return window.sessionStorage.getItem(prefillKey);
  }, key);
  expect(value).toBeNull();
}
