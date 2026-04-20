import { expect, type Locator, type Page } from "@playwright/test";

export type PrefillPath =
  | "/about/contact/"
  | "/report/new/"
  | "/civil-litigation/new/"
  | "/personnel/new/"
  | "/personnel/suggest-edit/"
  | "/law-enforcement-agency/suggest-edit/";

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

const FIELD_CONFIG: Record<PrefillPath, Record<string, PrefillFieldConfig>> = {
  "/about/contact/": {
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
  "/report/new/": {
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
  "/civil-litigation/new/": {
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
  "/personnel/new/": {
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
  "/personnel/suggest-edit/": {
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
  "/law-enforcement-agency/suggest-edit/": {
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
  key: PrefillPath,
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

export async function installPrefillCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (
      (window as typeof window & { __IPC_PREFILL_CAPTURED__?: boolean })
        .__IPC_PREFILL_CAPTURED__
    ) {
      return;
    }
    (
      window as typeof window & { __IPC_PREFILL_CAPTURED__?: boolean }
    ).__IPC_PREFILL_CAPTURED__ = true;

    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (
        this === window.sessionStorage &&
        typeof key === "string" &&
        key.startsWith("/") &&
        key !== "__e2e_last_prefill__"
      ) {
        originalSetItem.call(
          this,
          "__e2e_last_prefill__",
          JSON.stringify({
            key,
            value: String(value),
          }),
        );
      }
      return originalSetItem.call(this, key, value);
    };
  });
}

export async function readCapturedPrefill(page: Page): Promise<{
  key: PrefillPath;
  payload: Record<string, unknown>;
}> {
  const raw = await page.evaluate(() => {
    return window.sessionStorage.getItem("__e2e_last_prefill__");
  });
  if (!raw) {
    throw new Error("No prefill payload was captured.");
  }
  const parsed = JSON.parse(raw) as { key: PrefillPath; value: string };
  return {
    key: parsed.key,
    payload: JSON.parse(parsed.value) as Record<string, unknown>,
  };
}

export async function assertPrefillApplied(
  page: Page,
  key: PrefillPath,
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
  key: PrefillPath,
): Promise<void> {
  const value = await page.evaluate((prefillKey) => {
    return window.sessionStorage.getItem(prefillKey);
  }, key);
  expect(value).toBeNull();
}

export function formatFieldList(fields: string[]): string {
  return `[${[...fields].sort().join(", ")}]`;
}
