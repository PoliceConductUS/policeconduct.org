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
      if (typeof payload.defendants === "string") {
        await expect(page.locator("#defendants")).toHaveValue(
          payload.defendants,
        );
      }
      if (typeof payload.summary === "string") {
        await expect(page.locator("#summary")).toHaveValue(payload.summary);
      }
      if (typeof payload.links === "string") {
        await expect(page.locator('textarea[name="links"]')).toHaveValue(
          payload.links,
        );
      }
      break;
    }
    case "prefill:personnelNew": {
      if (typeof payload.firstName === "string") {
        await expect(page.locator("#firstName")).toHaveValue(payload.firstName);
      }
      if (typeof payload.lastName === "string") {
        await expect(page.locator("#lastName")).toHaveValue(payload.lastName);
      }
      if (typeof payload.suffix === "string") {
        await expect(page.locator("#suffix")).toHaveValue(payload.suffix);
      }
      if (typeof payload.badgeNumber === "string") {
        await expect(page.locator("#badgeNumber")).toHaveValue(
          payload.badgeNumber,
        );
      }
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
      if (typeof payload.pastEmployers === "string") {
        await expect(page.locator("#pastEmployers")).toHaveValue(
          payload.pastEmployers,
        );
      }
      if (typeof payload.civilLitigation === "string") {
        await expect(page.locator("#civilLitigation")).toHaveValue(
          payload.civilLitigation,
        );
      }
      if (typeof payload.reportLinks === "string") {
        await expect(page.locator("#reportLinks")).toHaveValue(
          payload.reportLinks,
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
      if (typeof payload.officerName === "string") {
        await expect(page.locator("#officerName")).toHaveValue(
          payload.officerName,
        );
      }
      if (typeof payload.badgeNumber === "string") {
        await expect(page.locator("#badgeNumber")).toHaveValue(
          payload.badgeNumber,
        );
      }
      if (typeof payload.currentEmployer === "string") {
        await expect(page.locator("#currentEmployer")).toHaveValue(
          payload.currentEmployer,
        );
      }
      if (typeof payload.pastEmployers === "string") {
        await expect(page.locator("#pastEmployers")).toHaveValue(
          payload.pastEmployers,
        );
      }
      if (typeof payload.civilLitigation === "string") {
        await expect(page.locator("#civilLitigation")).toHaveValue(
          payload.civilLitigation,
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
      if (typeof payload.agencyName === "string") {
        await expect(page.locator("#agencyName")).toHaveValue(
          payload.agencyName,
        );
      }
      if (typeof payload.jurisdiction === "string") {
        await expect(page.locator("#jurisdiction")).toHaveValue(
          payload.jurisdiction.toUpperCase(),
        );
      }
      if (typeof payload.departmentWebsite === "string") {
        await expect(page.locator("#departmentWebsite")).toHaveValue(
          payload.departmentWebsite,
        );
      }
      if (typeof payload.departmentHead === "string") {
        await expect(page.locator("#departmentHead")).toHaveValue(
          payload.departmentHead,
        );
      }
      if (typeof payload.socialLinks === "string") {
        await expect(page.locator("#socialLinks")).toHaveValue(
          payload.socialLinks,
        );
      }
      if (typeof payload.civilLitigation === "string") {
        await expect(page.locator("#civilLitigation")).toHaveValue(
          payload.civilLitigation,
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
