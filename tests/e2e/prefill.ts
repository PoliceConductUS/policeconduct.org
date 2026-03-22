import { expect, type Locator, type Page } from "@playwright/test";

export type PrefillKey =
  | "prefill:contact"
  | "prefill:reportNew"
  | "prefill:issueNew"
  | "prefill:civilLitigationNew"
  | "prefill:personnelNew"
  | "prefill:personnelSuggestEdit"
  | "prefill:agencySuggestEdit";

type PrefillFieldConfig = {
  kind: "input" | "textarea" | "select";
  selector: string;
  toExpectedValue?: (value: unknown) => string;
};

const identity = (value: unknown) => String(value ?? "");

const flattenPayload = (
  payload: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> => {
  const flat: Record<string, unknown> = {};

  Object.entries(payload).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(
        flat,
        flattenPayload(value as Record<string, unknown>, path),
      );
      return;
    }
    flat[path] = value;
  });

  return flat;
};

const FIELD_CONFIG: Record<PrefillKey, Record<string, PrefillFieldConfig>> = {
  "prefill:contact": {
    whoami: {
      kind: "select",
      selector: "#whoami",
      toExpectedValue: (value) => String(value ?? "").trim(),
    },
    message: {
      kind: "textarea",
      selector: "#message",
      toExpectedValue: identity,
    },
  },
  "prefill:reportNew": {
    "officer.department": {
      kind: "input",
      selector: '[name="officers[0][department]"]',
      toExpectedValue: identity,
    },
    "officer.name": {
      kind: "input",
      selector: '[name="officers[0][name]"]',
      toExpectedValue: identity,
    },
  },
  "prefill:issueNew": {
    message: {
      kind: "textarea",
      selector: "#message",
      toExpectedValue: identity,
    },
  },
  "prefill:civilLitigationNew": {
    jurisdiction: {
      kind: "select",
      selector: "#jurisdiction",
      toExpectedValue: (value) => {
        const raw = String(value ?? "").trim();
        return raw.length === 2 ? raw.toUpperCase() : raw;
      },
    },
    defendants: {
      kind: "textarea",
      selector: "#defendants",
      toExpectedValue: identity,
    },
    summary: {
      kind: "textarea",
      selector: "#summary",
      toExpectedValue: identity,
    },
    links: {
      kind: "textarea",
      selector: 'textarea[name="links"]',
      toExpectedValue: identity,
    },
  },
  "prefill:personnelNew": {
    firstName: {
      kind: "input",
      selector: "#firstName",
      toExpectedValue: identity,
    },
    lastName: {
      kind: "input",
      selector: "#lastName",
      toExpectedValue: identity,
    },
    suffix: {
      kind: "input",
      selector: "#suffix",
      toExpectedValue: identity,
    },
    badgeNumber: {
      kind: "input",
      selector: "#badgeNumber",
      toExpectedValue: identity,
    },
    currentAgency: {
      kind: "input",
      selector: "#currentAgency",
      toExpectedValue: identity,
    },
    currentAgencyCity: {
      kind: "input",
      selector: "#currentAgencyCity",
      toExpectedValue: identity,
    },
    currentAgencyState: {
      kind: "input",
      selector: "#currentAgencyState",
      toExpectedValue: identity,
    },
    pastEmployers: {
      kind: "textarea",
      selector: "#pastEmployers",
      toExpectedValue: identity,
    },
    civilLitigation: {
      kind: "textarea",
      selector: "#civilLitigation",
      toExpectedValue: identity,
    },
    reportLinks: {
      kind: "textarea",
      selector: "#reportLinks",
      toExpectedValue: identity,
    },
  },
  "prefill:personnelSuggestEdit": {
    officerPath: {
      kind: "input",
      selector: "#officerPath",
      toExpectedValue: identity,
    },
    officerName: {
      kind: "input",
      selector: "#officerName",
      toExpectedValue: identity,
    },
    badgeNumber: {
      kind: "input",
      selector: "#badgeNumber",
      toExpectedValue: identity,
    },
    currentEmployer: {
      kind: "input",
      selector: "#currentEmployer",
      toExpectedValue: identity,
    },
    pastEmployers: {
      kind: "textarea",
      selector: "#pastEmployers",
      toExpectedValue: identity,
    },
    civilLitigation: {
      kind: "textarea",
      selector: "#civilLitigation",
      toExpectedValue: identity,
    },
  },
  "prefill:agencySuggestEdit": {
    agencyPath: {
      kind: "input",
      selector: "#agencyPath",
      toExpectedValue: identity,
    },
    agencyName: {
      kind: "input",
      selector: "#agencyName",
      toExpectedValue: identity,
    },
    jurisdiction: {
      kind: "select",
      selector: "#jurisdiction",
      toExpectedValue: (value) =>
        String(value ?? "")
          .trim()
          .toUpperCase(),
    },
    departmentWebsite: {
      kind: "input",
      selector: "#departmentWebsite",
      toExpectedValue: identity,
    },
    departmentHead: {
      kind: "input",
      selector: "#departmentHead",
      toExpectedValue: identity,
    },
    socialLinks: {
      kind: "textarea",
      selector: "#socialLinks",
      toExpectedValue: identity,
    },
    civilLitigation: {
      kind: "textarea",
      selector: "#civilLitigation",
      toExpectedValue: identity,
    },
  },
};

const getControlLocator = (page: Page, config: PrefillFieldConfig): Locator => {
  return page.locator(config.selector);
};

const expectEmptyField = async (
  locator: Locator,
  kind: PrefillFieldConfig["kind"],
) => {
  if (kind === "select") {
    await expect(locator).toHaveValue("");
    return;
  }
  await expect(locator).toHaveValue("");
};

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

export async function readPrefillFromLink(locator: Locator): Promise<{
  key: PrefillKey;
  payload: Record<string, unknown>;
  href: string;
}> {
  const key = (await locator.getAttribute("data-prefill-key")) as PrefillKey;
  const payload = JSON.parse(
    (await locator.getAttribute("data-prefill-payload")) || "{}",
  ) as Record<string, unknown>;
  const href = (await locator.getAttribute("href")) || "";
  return { key, payload, href };
}

export async function assertPrefillApplied(
  page: Page,
  key: PrefillKey,
  payload: Record<string, unknown>,
  expectedFields?: string[],
): Promise<void> {
  const fieldConfig = FIELD_CONFIG[key];
  if (!fieldConfig) {
    throw new Error(`Unsupported prefill key: ${key}`);
  }

  const flatPayload = flattenPayload(payload);

  const expected = new Set(
    (expectedFields || Object.keys(flatPayload)).map((field) => field.trim()),
  );
  const payloadFields = Object.keys(flatPayload).sort();
  const expectedFieldList = Array.from(expected).sort();
  expect(payloadFields).toEqual(expectedFieldList);

  for (const [field, config] of Object.entries(fieldConfig)) {
    const locator = getControlLocator(page, config);
    if (expected.has(field)) {
      const expectedValue = (config.toExpectedValue || identity)(
        flatPayload[field],
      );
      if (config.kind === "select" && field === "whoami") {
        const selectedText = await page
          .locator("#whoami option:checked")
          .textContent();
        expect((selectedText || "").toLowerCase()).toContain(
          expectedValue.toLowerCase(),
        );
      } else {
        await expect(locator).toHaveValue(expectedValue);
      }
      continue;
    }
    await expectEmptyField(locator, config.kind);
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

export function formatFieldList(fields: string[]): string {
  return `[${[...fields].sort().join(", ")}]`;
}
