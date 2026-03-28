import { expect, type Page, test } from "@playwright/test";
import {
  assertPrefillApplied,
  assertPrefillConsumed,
  formatFieldList,
  type PrefillKey,
  readPrefillFromLink,
  seedFlashPrefill,
} from "./prefill";

type SenderCase = {
  name: string;
  route: string;
  key: PrefillKey;
  expectedFields: string[];
  locator: {
    kind: "css" | "role" | "testId";
    value: string;
  };
  targetPath: string;
};

type FlashCase = {
  key: PrefillKey;
  route: string;
  expectedFields: string[];
  payload: Record<string, unknown>;
};

const simpleSenderCases: SenderCase[] = [
  {
    name: "suggest new civil case",
    route: "/civil-litigation/",
    key: "prefill:civilLitigationNew",
    expectedFields: ["jurisdiction"],
    locator: { kind: "role", value: "Suggest a new civil case" },
    targetPath: "/civil-litigation/new/",
  },
  {
    name: "ask about club benefits",
    route: "/donate/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: { kind: "role", value: "Ask about club benefits" },
    targetPath: "/about/contact/",
  },
  {
    name: "contact the team",
    route: "/legal-notice/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: { kind: "role", value: "Contact the team" },
    targetPath: "/about/contact/",
  },
  {
    name: "subscribe",
    route: "/news/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: { kind: "role", value: "Subscribe" },
    targetPath: "/about/contact/",
  },
  {
    name: "contact partnerships",
    route: "/partner/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: { kind: "role", value: "Contact partnerships" },
    targetPath: "/about/contact/",
  },
  {
    name: "contact",
    route: "/partner/academic/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: { kind: "css", value: 'a[data-prefill-key="prefill:contact"]' },
    targetPath: "/about/contact/",
  },
  {
    name: "contact",
    route: "/partner/law-firm/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: { kind: "css", value: 'a[data-prefill-key="prefill:contact"]' },
    targetPath: "/about/contact/",
  },
  {
    name: "contact",
    route: "/partner/media/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: { kind: "css", value: 'a[data-prefill-key="prefill:contact"]' },
    targetPath: "/about/contact/",
  },
  {
    name: "contact",
    route: "/partner/nonprofit/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: { kind: "css", value: 'a[data-prefill-key="prefill:contact"]' },
    targetPath: "/about/contact/",
  },
  {
    name: "subscribe",
    route:
      "/report/tx/2023-12-04-75039-1st-amendment-retaliation-arrest-2c545f/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: { kind: "role", value: "Subscribe" },
    targetPath: "/about/contact/",
  },
  {
    name: "reach out for volunteer role matching",
    route: "/volunteer/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: {
      kind: "role",
      value: "Reach out and we will match you to a role.",
    },
    targetPath: "/about/contact/",
  },
];

const profileSenderCases: SenderCase[] = [
  {
    name: "submit report",
    route: "/personnel/james-markham-v-7635c7/",
    key: "prefill:reportNew",
    expectedFields: ["officer.department", "officer.name"],
    locator: { kind: "role", value: "Submit Report" },
    targetPath: "/report/new/",
  },
  {
    name: "add civil case",
    route: "/personnel/james-markham-v-7635c7/",
    key: "prefill:civilLitigationNew",
    expectedFields: ["defendants", "jurisdiction", "links", "summary"],
    locator: { kind: "role", value: "Add a civil case" },
    targetPath: "/civil-litigation/new/",
  },
  {
    name: "submit past employer",
    route: "/personnel/james-markham-v-7635c7/",
    key: "prefill:personnelNew",
    expectedFields: [
      "badgeNumber",
      "civilLitigation",
      "currentAgency",
      "currentAgencyCity",
      "currentAgencyState",
      "firstName",
      "lastName",
      "pastEmployers",
      "reportLinks",
      "suffix",
    ],
    locator: { kind: "role", value: "Submit past employer" },
    targetPath: "/personnel/new/",
  },
  {
    name: "suggest edit",
    route: "/personnel/james-markham-v-7635c7/",
    key: "prefill:personnelSuggestEdit",
    expectedFields: [
      "badgeNumber",
      "civilLitigation",
      "currentEmployer",
      "officerName",
      "officerPath",
      "pastEmployers",
    ],
    locator: { kind: "role", value: "Suggest edit" },
    targetPath: "/personnel/suggest-edit/",
  },
  {
    name: "subscribe",
    route: "/personnel/james-markham-v-7635c7/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: { kind: "testId", value: "personnel-subscribe-link" },
    targetPath: "/about/contact/",
  },
  {
    name: "claim profile",
    route: "/personnel/james-markham-v-7635c7/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: { kind: "testId", value: "personnel-claim-profile-link" },
    targetPath: "/about/contact/",
  },
  {
    name: "submit report",
    route: "/law-enforcement-agency/tx/irving-police-department-049f9a/",
    key: "prefill:reportNew",
    expectedFields: ["officer.department"],
    locator: {
      kind: "css",
      value: 'a[data-prefill-key="prefill:reportNew"][href="/report/new/"]',
    },
    targetPath: "/report/new/",
  },
  {
    name: "add civil case",
    route: "/law-enforcement-agency/tx/irving-police-department-049f9a/",
    key: "prefill:civilLitigationNew",
    expectedFields: ["defendants", "jurisdiction", "links", "summary"],
    locator: { kind: "role", value: "Add a civil case" },
    targetPath: "/civil-litigation/new/",
  },
  {
    name: "suggest new personnel",
    route: "/law-enforcement-agency/tx/irving-police-department-049f9a/",
    key: "prefill:personnelNew",
    expectedFields: [
      "civilLitigation",
      "currentAgency",
      "currentAgencyCity",
      "currentAgencyState",
      "reportLinks",
    ],
    locator: { kind: "role", value: "Suggest new personnel" },
    targetPath: "/personnel/new/",
  },
  {
    name: "suggest edit",
    route: "/law-enforcement-agency/tx/irving-police-department-049f9a/",
    key: "prefill:agencySuggestEdit",
    expectedFields: [
      "agencyName",
      "agencyPath",
      "civilLitigation",
      "departmentHead",
      "departmentWebsite",
      "jurisdiction",
      "socialLinks",
    ],
    locator: { kind: "role", value: "Suggest edit" },
    targetPath: "/law-enforcement-agency/suggest-edit/",
  },
  {
    name: "subscribe",
    route: "/law-enforcement-agency/tx/irving-police-department-049f9a/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: { kind: "testId", value: "agency-subscribe-link" },
    targetPath: "/about/contact/",
  },
  {
    name: "claim profile",
    route: "/law-enforcement-agency/tx/irving-police-department-049f9a/",
    key: "prefill:contact",
    expectedFields: ["message", "whoami"],
    locator: { kind: "testId", value: "agency-claim-profile-link" },
    targetPath: "/about/contact/",
  },
];

const flashCases: FlashCase[] = [
  {
    key: "prefill:contact",
    route: "/about/contact/",
    expectedFields: ["message", "whoami"],
    payload: { whoami: "Subscriber", message: "One-time contact prefill" },
  },
  {
    key: "prefill:reportNew",
    route: "/report/new/",
    expectedFields: ["officer.department", "officer.name"],
    payload: {
      officer: {
        department: "Test Department",
        name: "Test Officer",
      },
    },
  },
  {
    key: "prefill:civilLitigationNew",
    route: "/civil-litigation/new/",
    expectedFields: ["jurisdiction"],
    payload: { jurisdiction: "tx" },
  },
  {
    key: "prefill:personnelNew",
    route: "/personnel/new/",
    expectedFields: [
      "currentAgency",
      "currentAgencyCity",
      "currentAgencyState",
    ],
    payload: {
      currentAgency: "Test Agency",
      currentAgencyCity: "Austin",
      currentAgencyState: "TX",
    },
  },
  {
    key: "prefill:personnelSuggestEdit",
    route: "/personnel/suggest-edit/",
    expectedFields: ["officerPath"],
    payload: { officerPath: "/personnel/example/" },
  },
  {
    key: "prefill:agencySuggestEdit",
    route: "/law-enforcement-agency/suggest-edit/",
    expectedFields: ["agencyPath", "jurisdiction"],
    payload: {
      agencyPath: "/law-enforcement-agency/tx/example/",
      jurisdiction: "tx",
    },
  },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getLinkLocator(page: Page, locator: SenderCase["locator"]) {
  if (locator.kind === "css") {
    return page.locator(locator.value).first();
  }
  if (locator.kind === "role") {
    return page.getByRole("link", { name: locator.value }).first();
  }
  return page.getByTestId(locator.value);
}

async function assertClearedAfterReload(page: Page, key: PrefillKey) {
  await page.reload();
  await assertPrefillApplied(page, key, {}, []);
}

test.describe("prefill", () => {
  test.describe("sender", () => {
    for (const entry of simpleSenderCases) {
      test(`${entry.route} › ${entry.name} prefills ${formatFieldList(entry.expectedFields)}`, async ({
        page,
      }) => {
        await page.goto(entry.route);
        const link = getLinkLocator(page, entry.locator);
        const { key, payload } = await readPrefillFromLink(link);
        expect(key).toBe(entry.key);
        await link.click();
        await expect(page).toHaveURL(
          new RegExp(`${escapeRegExp(entry.targetPath)}$`),
        );
        await assertPrefillApplied(page, key, payload, entry.expectedFields);
      });
    }

    for (const entry of profileSenderCases) {
      test(`${entry.route} › ${entry.name} prefills ${formatFieldList(entry.expectedFields)}`, async ({
        page,
      }) => {
        await page.goto(entry.route);
        const link = getLinkLocator(page, entry.locator);
        const { key, payload } = await readPrefillFromLink(link);
        expect(key).toBe(entry.key);
        await link.click();
        await expect(page).toHaveURL(
          new RegExp(`${escapeRegExp(entry.targetPath)}$`),
        );
        await assertPrefillApplied(page, key, payload, entry.expectedFields);
      });
    }
  });

  test.describe("flash", () => {
    for (const entry of flashCases) {
      test(`${entry.key} on ${entry.route} consumes ${formatFieldList(entry.expectedFields)} once`, async ({
        page,
      }) => {
        await seedFlashPrefill(page, entry.key, entry.payload);
        await page.goto(entry.route);
        await assertPrefillApplied(
          page,
          entry.key,
          entry.payload,
          entry.expectedFields,
        );
        await assertPrefillConsumed(page, entry.key);
        await assertClearedAfterReload(page, entry.key);
      });
    }
  });
});
