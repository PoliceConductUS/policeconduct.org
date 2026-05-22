import { expect, type Page, test } from "@playwright/test";
import {
  assertPrefillApplied,
  assertPrefillConsumed,
  formatFieldList,
  installPrefillCapture,
  type PrefillPath,
  readCapturedPrefill,
  seedFlashPrefill,
} from "./prefill";

type SenderCase = {
  name: string;
  payload?: Record<string, unknown>;
  route: string;
  expectedFields: string[];
  locator: {
    kind: "role" | "testId";
    value: string;
  };
  targetPath: PrefillPath;
};

type FlashCase = {
  key: PrefillPath;
  route: PrefillPath;
  expectedFields: string[];
  payload: Record<string, unknown>;
};

const simpleSenderCases: SenderCase[] = [
  {
    name: "ask about club benefits",
    route: "/donate/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Donor",
      message: "Question about club benefits.",
    },
    locator: { kind: "role", value: "Ask about club benefits" },
    targetPath: "/about/contact/",
  },
  {
    name: "contact the team",
    route: "/legal-notice/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Partner",
      message: "I have a question about your legal policies.",
    },
    locator: { kind: "role", value: "Contact the team" },
    targetPath: "/about/contact/",
  },
  {
    name: "subscribe",
    route: "/news/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Subscriber",
      message:
        "Please notify me about news updates from PoliceConduct.org: /news/",
    },
    locator: { kind: "role", value: "Notify me about news updates" },
    targetPath: "/about/contact/",
  },
  {
    name: "contact partnerships",
    route: "/partner/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Partner",
      message: "I want to discuss a partnership with PoliceConduct.org.",
    },
    locator: { kind: "role", value: "Contact partnerships" },
    targetPath: "/about/contact/",
  },
  {
    name: "contact",
    route: "/partner/academic/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Partner",
      message:
        "I am interested in a scoped academic partnership or letter of support.",
    },
    locator: { kind: "role", value: "Contact partnerships" },
    targetPath: "/about/contact/",
  },
  {
    name: "contact",
    route: "/partner/law-firm/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Partner",
      message:
        "I am interested in a scoped law firm partnership for public-record case review.",
    },
    locator: { kind: "role", value: "Contact partnerships" },
    targetPath: "/about/contact/",
  },
  {
    name: "contact",
    route: "/partner/media/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Partner",
      message:
        "I am interested in a scoped records brief for a newsroom reporting project.",
    },
    locator: { kind: "role", value: "Contact partnerships" },
    targetPath: "/about/contact/",
  },
  {
    name: "contact",
    route: "/partner/nonprofit/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Partner",
      message: "I am interested in a scoped nonprofit partnership proposal.",
    },
    locator: { kind: "role", value: "Request the partnership proposal" },
    targetPath: "/about/contact/",
  },
  {
    name: "subscribe",
    route:
      "/tx/dallas-county/irving/reports/2023/12/04/first-amendment-retaliation-arrest-2c545f/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Subscriber",
      message:
        "Please notify me when this report changes: /tx/dallas-county/irving/reports/2023/12/04/first-amendment-retaliation-arrest-2c545f/",
    },
    locator: { kind: "role", value: "Notify me when this report changes" },
    targetPath: "/about/contact/",
  },
  {
    name: "reach out for volunteer role matching",
    route: "/volunteer/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Volunteer",
      message: "Help me find the right volunteer role.",
    },
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
    expectedFields: ["officer.department", "officer.name"],
    payload: {
      officer: {
        department: "IRVING POLICE DEPARTMENT",
        name: "James Markham",
      },
    },
    locator: { kind: "role", value: "Share your experience" },
    targetPath: "/report/new/",
  },
  {
    name: "add civil case",
    route: "/personnel/james-markham-v-7635c7/",
    expectedFields: ["defendants", "jurisdiction", "links", "summary"],
    payload: {
      jurisdiction: "tx",
      defendants: "James Markham\nIRVING POLICE DEPARTMENT",
      summary:
        "James Markham profile: /personnel/james-markham-v-7635c7/\nCurrent agency: IRVING POLICE DEPARTMENT",
      links:
        "/personnel/james-markham-v-7635c7/\n/tx/dallas-county/irving/reports/2023/12/04/first-amendment-retaliation-arrest-2c545f/",
    },
    locator: { kind: "role", value: "Add a civil case" },
    targetPath: "/civil-litigation/new/",
  },
  {
    name: "submit past employer",
    route: "/personnel/james-markham-v-7635c7/",
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
    payload: {
      firstName: "James",
      lastName: "Markham",
      suffix: "V",
      badgeNumber: "",
      currentAgency: "IRVING POLICE DEPARTMENT",
      currentAgencyCity: "IRVING",
      currentAgencyState: "TX",
      pastEmployers: "",
      civilLitigation:
        "Lotts v. City of Irving et al — 3:25-CV-03329-S-BN — N.D. Tex. — /civil-cases/lotts-v-city-of-irving-et-al-3-25-cv-03329-s-bn-n-d-tex-2025/",
      reportLinks:
        "/tx/dallas-county/irving/reports/2023/12/04/first-amendment-retaliation-arrest-2c545f/",
    },
    locator: { kind: "role", value: "Submit past employer" },
    targetPath: "/personnel/new/",
  },
  {
    name: "suggest edit",
    route: "/personnel/james-markham-v-7635c7/",
    expectedFields: [
      "badgeNumber",
      "civilLitigation",
      "currentEmployer",
      "officerName",
      "officerPath",
      "pastEmployers",
    ],
    payload: {
      officerPath: "/personnel/james-markham-v-7635c7/",
      officerName: "James Markham",
      badgeNumber: "",
      currentEmployer: "IRVING POLICE DEPARTMENT",
      pastEmployers: "",
      civilLitigation:
        "Lotts v. City of Irving et al — 3:25-CV-03329-S-BN — N.D. Tex. — /civil-cases/lotts-v-city-of-irving-et-al-3-25-cv-03329-s-bn-n-d-tex-2025/",
    },
    locator: { kind: "role", value: "Suggest edit" },
    targetPath: "/personnel/suggest-edit/",
  },
  {
    name: "subscribe",
    route: "/personnel/james-markham-v-7635c7/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Subscriber",
      message:
        "Please notify me when this profile changes: /personnel/james-markham-v-7635c7/",
    },
    locator: { kind: "testId", value: "personnel-subscribe-link" },
    targetPath: "/about/contact/",
  },
  {
    name: "claim profile",
    route: "/personnel/james-markham-v-7635c7/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Profile Owner",
      message:
        "I would like to claim ownership of this profile.\nProfile path: /personnel/james-markham-v-7635c7/",
    },
    locator: { kind: "testId", value: "personnel-claim-profile-link" },
    targetPath: "/about/contact/",
  },
  {
    name: "submit report",
    route: "/tx/dallas-county/irving/irving-police-department-049f9a/",
    expectedFields: ["officer.department"],
    payload: {
      officer: {
        department: "IRVING POLICE DEPARTMENT",
      },
    },
    locator: { kind: "role", value: "Share your experience" },
    targetPath: "/report/new/",
  },
  {
    name: "add civil case",
    route: "/tx/dallas-county/irving/irving-police-department-049f9a/",
    expectedFields: ["defendants", "jurisdiction", "links", "summary"],
    payload: {
      jurisdiction: "tx",
      defendants: "IRVING POLICE DEPARTMENT",
      summary:
        "IRVING POLICE DEPARTMENT agency profile: /tx/dallas-county/irving/irving-police-department-049f9a/",
      links:
        "/tx/dallas-county/irving/irving-police-department-049f9a/\n/tx/dallas-county/irving/reports/2023/12/04/first-amendment-retaliation-arrest-2c545f/",
    },
    locator: { kind: "role", value: "Add a civil case" },
    targetPath: "/civil-litigation/new/",
  },
  {
    name: "suggest new personnel",
    route: "/tx/dallas-county/irving/irving-police-department-049f9a/",
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
    route: "/tx/dallas-county/irving/irving-police-department-049f9a/",
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
    route: "/tx/dallas-county/irving/irving-police-department-049f9a/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Subscriber",
      message:
        "Please notify me when this agency page changes: /tx/dallas-county/irving/irving-police-department-049f9a/",
    },
    locator: { kind: "testId", value: "agency-subscribe-link" },
    targetPath: "/about/contact/",
  },
  {
    name: "claim profile",
    route: "/tx/dallas-county/irving/irving-police-department-049f9a/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Profile Owner",
      message:
        "I would like to claim ownership of this profile.\nProfile path: /tx/dallas-county/irving/irving-police-department-049f9a/",
    },
    locator: { kind: "testId", value: "agency-claim-profile-link" },
    targetPath: "/about/contact/",
  },
];

const flashCases: FlashCase[] = [
  {
    key: "/about/contact/",
    route: "/about/contact/",
    expectedFields: ["message", "whoami"],
    payload: { whoami: "Subscriber", message: "One-time contact prefill" },
  },
  {
    key: "/report/new/",
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
    key: "/civil-litigation/new/",
    route: "/civil-litigation/new/",
    expectedFields: ["jurisdiction"],
    payload: { jurisdiction: "tx" },
  },
  {
    key: "/personnel/new/",
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
    key: "/personnel/suggest-edit/",
    route: "/personnel/suggest-edit/",
    expectedFields: ["officerPath"],
    payload: { officerPath: "/personnel/example/" },
  },
  {
    key: "/law-enforcement-agency/suggest-edit/",
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
  if (locator.kind === "role") {
    return page.getByRole("button", { name: locator.value }).first();
  }
  return page.getByTestId(locator.value);
}

async function activateSender(
  page: Page,
  locator: ReturnType<typeof getLinkLocator>,
) {
  await locator.focus();
  await page.keyboard.press("Enter");
}

async function assertClearedAfterReload(page: Page, key: PrefillPath) {
  await page.reload();
  await assertPrefillApplied(page, key, {}, []);
}

test.describe("prefill", () => {
  test.describe("sender", () => {
    for (const entry of simpleSenderCases) {
      test(`${entry.route} › ${entry.name} prefills ${formatFieldList(entry.expectedFields)}`, async ({
        page,
      }) => {
        await installPrefillCapture(page);
        await page.goto(entry.route);
        const link = getLinkLocator(page, entry.locator);
        await activateSender(page, link);
        await expect(page).toHaveURL(
          new RegExp(`${escapeRegExp(entry.targetPath)}$`),
        );
        const { key, payload } = await readCapturedPrefill(page);
        expect(key).toBe(entry.targetPath);
        await assertPrefillApplied(page, key, payload, entry.expectedFields);
        if (entry.payload) {
          expect(payload).toEqual(entry.payload);
        }
      });
    }

    for (const entry of profileSenderCases) {
      test(`${entry.route} › ${entry.name} prefills ${formatFieldList(entry.expectedFields)}`, async ({
        page,
      }) => {
        await installPrefillCapture(page);
        await page.goto(entry.route);
        const link = getLinkLocator(page, entry.locator);
        await activateSender(page, link);
        await expect(page).toHaveURL(
          new RegExp(`${escapeRegExp(entry.targetPath)}$`),
        );
        const { key, payload } = await readCapturedPrefill(page);
        expect(key).toBe(entry.targetPath);
        await assertPrefillApplied(page, key, payload, entry.expectedFields);
        if (entry.payload) {
          expect(payload).toEqual(entry.payload);
        }
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
