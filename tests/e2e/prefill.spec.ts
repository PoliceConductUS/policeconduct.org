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
    name: "suggest new civil case",
    route: "/civil-litigation/",
    expectedFields: ["jurisdiction"],
    payload: { jurisdiction: "" },
    locator: { kind: "role", value: "Suggest a new civil case" },
    targetPath: "/civil-litigation/new/",
  },
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
      "/report/tx/2023-12-04-75039-1st-amendment-retaliation-arrest-2c545f/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Subscriber",
      message:
        "Please notify me when this report changes: /report/tx/2023-12-04-75039-1st-amendment-retaliation-arrest-2c545f/",
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
    locator: { kind: "role", value: "Submit Report" },
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
        "/personnel/james-markham-v-7635c7/\n/report/tx/2023-12-04-75039-1st-amendment-retaliation-arrest-2c545f/",
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
        "Lotts v. City of Irving et al — 3:25-CV-03329-S-BN — N.D. Tex. — /civil-litigation/tx/lotts-v-city-of-irving-et-al-3-25-cv-03329-s-bn-n-d-tex-2025/",
      reportLinks:
        "/report/tx/2023-12-04-75039-1st-amendment-retaliation-arrest-2c545f/",
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
        "Lotts v. City of Irving et al — 3:25-CV-03329-S-BN — N.D. Tex. — /civil-litigation/tx/lotts-v-city-of-irving-et-al-3-25-cv-03329-s-bn-n-d-tex-2025/",
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
    route: "/law-enforcement-agency/tx/irving-police-department-049f9a/",
    expectedFields: ["officer.department"],
    payload: {
      officer: {
        department: "IRVING POLICE DEPARTMENT",
      },
    },
    locator: { kind: "role", value: "Submit a report" },
    targetPath: "/report/new/",
  },
  {
    name: "add civil case",
    route: "/law-enforcement-agency/tx/irving-police-department-049f9a/",
    expectedFields: ["defendants", "jurisdiction", "links", "summary"],
    payload: {
      jurisdiction: "tx",
      defendants: "IRVING POLICE DEPARTMENT",
      summary:
        "IRVING POLICE DEPARTMENT agency profile: /law-enforcement-agency/tx/irving-police-department-049f9a/",
      links:
        "/law-enforcement-agency/tx/irving-police-department-049f9a/\n/report/tx/2023-12-04-75039-1st-amendment-retaliation-arrest-2c545f/",
    },
    locator: { kind: "role", value: "Add a civil case" },
    targetPath: "/civil-litigation/new/",
  },
  {
    name: "suggest new personnel",
    route: "/law-enforcement-agency/tx/irving-police-department-049f9a/",
    expectedFields: [
      "civilLitigation",
      "currentAgency",
      "currentAgencyCity",
      "currentAgencyState",
      "reportLinks",
    ],
    payload: {
      currentAgency: "IRVING POLICE DEPARTMENT",
      currentAgencyCity: "IRVING",
      currentAgencyState: "TX",
      civilLitigation:
        "Nichols v. City of Irving — 3:86-cv-02848 — N.D. Tex. — /civil-litigation/tx/nichols-v-city-of-irving-3-86-cv-02848-n-d-tex-1986/\nEdwards v. City of Irving — 3:90-cv-02603 — N.D. Tex. — /civil-litigation/tx/edwards-v-city-of-irving-3-90-cv-02603-n-d-tex-1990/\nHill v. City of Irving — 3:91-cv-01190 — N.D. Tex. — /civil-litigation/tx/hill-v-city-of-irving-3-91-cv-01190-n-d-tex-1991/\nIvatury v. City of Irving — 3:94-cv-01556 — N.D. Tex. — /civil-litigation/tx/ivatury-v-city-of-irving-3-94-cv-01556-n-d-tex-1994/\nRaper v. City of Irving Texas — 3:95-cv-01275 — N.D. Tex. — /civil-litigation/tx/raper-v-city-of-irving-texas-3-95-cv-01275-n-d-tex-1995/\nPapke v. City of Irving — 3:95-cv-02644 — N.D. Tex. — /civil-litigation/tx/papke-v-city-of-irving-3-95-cv-02644-n-d-tex-1995/\nCaba v. City of Irving — 3:96-cv-00249 — N.D. Tex. — /civil-litigation/tx/caba-v-city-of-irving-3-96-cv-00249-n-d-tex-1996/\nDavis v. City of Irving — 3:97-cv-02512 — N.D. Tex. — /civil-litigation/tx/davis-v-city-of-irving-3-97-cv-02512-n-d-tex-1997/\nPapke v. City of Irving — 3:98-cv-00941 — N.D. Tex. — /civil-litigation/tx/papke-v-city-of-irving-3-98-cv-00941-n-d-tex-1998/\nAlrawaziq v. City of Irving — 3:99-cv-00970 — N.D. Tex. — /civil-litigation/tx/alrawaziq-v-city-of-irving-3-99-cv-00970-n-d-tex-1999/\nHowie v. City of Irving Texas — 3:00-cv-02094 — N.D. Tex. — /civil-litigation/tx/howie-v-city-of-irving-texas-3-00-cv-02094-n-d-tex-2000/\nHouse v. City of Irving, Texas — 3:03-cv-02524 — N.D. Tex. — /civil-litigation/tx/house-v-city-of-irving-texas-3-03-cv-02524-n-d-tex-2003/\nWallis v. The City of Irving — 3:07-cv-01483 — N.D. Tex. — /civil-litigation/tx/wallis-v-the-city-of-irving-3-07-cv-01483-n-d-tex-2007/\nLotts v. City of Irving et al — 3:25-CV-03329-S-BN — N.D. Tex. — /civil-litigation/tx/lotts-v-city-of-irving-et-al-3-25-cv-03329-s-bn-n-d-tex-2025/\nBarrera v. City of Irving et al — 3:25-cv-03160 — N.D. Tex. — /civil-litigation/tx/barrera-v-city-of-irving-et-al-3-25-cv-03160-n-d-tex-2025/\nYoung v. City of Irving et al — 3:23-cv-01423 — N.D. Tex. — /civil-litigation/tx/young-v-city-of-irving-et-al-3-2023cv01423-n-d-tex-2023/\nEllis v. Police Dept of Irving et al — 3:22-cv-00265-B-BN — N.D. Tex. — /civil-litigation/tx/ellis-v-police-dept-of-irving-et-al-3-22-cv-00265-b-bn-n-d-tex-2022/\nDuke v. City of Irving TX — 3:20-cv-00116-K — N.D. Tex. — /civil-litigation/tx/duke-v-city-of-irving-tx-3-20-cv-00116-k-n-d-tex-2020/\nWilliams v. City of Irving, Texas et al — 3:15-CV-1701-L — N.D. Tex. — /civil-litigation/tx/williams-v-city-of-irving-texas-et-al-3-15-cv-1701-l-n-d-tex-2015/",
      reportLinks:
        "/report/tx/2023-12-04-75039-1st-amendment-retaliation-arrest-2c545f/",
    },
    locator: { kind: "role", value: "Suggest new personnel" },
    targetPath: "/personnel/new/",
  },
  {
    name: "suggest edit",
    route: "/law-enforcement-agency/tx/irving-police-department-049f9a/",
    expectedFields: [
      "agencyName",
      "agencyPath",
      "civilLitigation",
      "departmentHead",
      "departmentWebsite",
      "jurisdiction",
      "socialLinks",
    ],
    payload: {
      agencyPath: "/law-enforcement-agency/tx/irving-police-department-049f9a/",
      agencyName: "IRVING POLICE DEPARTMENT",
      jurisdiction: "tx",
      departmentWebsite: "",
      departmentHead: "WILLIAM L. CANNADAY",
      socialLinks: "",
      civilLitigation:
        "Nichols v. City of Irving — 3:86-cv-02848 — N.D. Tex. — /civil-litigation/tx/nichols-v-city-of-irving-3-86-cv-02848-n-d-tex-1986/\nEdwards v. City of Irving — 3:90-cv-02603 — N.D. Tex. — /civil-litigation/tx/edwards-v-city-of-irving-3-90-cv-02603-n-d-tex-1990/\nHill v. City of Irving — 3:91-cv-01190 — N.D. Tex. — /civil-litigation/tx/hill-v-city-of-irving-3-91-cv-01190-n-d-tex-1991/\nIvatury v. City of Irving — 3:94-cv-01556 — N.D. Tex. — /civil-litigation/tx/ivatury-v-city-of-irving-3-94-cv-01556-n-d-tex-1994/\nRaper v. City of Irving Texas — 3:95-cv-01275 — N.D. Tex. — /civil-litigation/tx/raper-v-city-of-irving-texas-3-95-cv-01275-n-d-tex-1995/\nPapke v. City of Irving — 3:95-cv-02644 — N.D. Tex. — /civil-litigation/tx/papke-v-city-of-irving-3-95-cv-02644-n-d-tex-1995/\nCaba v. City of Irving — 3:96-cv-00249 — N.D. Tex. — /civil-litigation/tx/caba-v-city-of-irving-3-96-cv-00249-n-d-tex-1996/\nDavis v. City of Irving — 3:97-cv-02512 — N.D. Tex. — /civil-litigation/tx/davis-v-city-of-irving-3-97-cv-02512-n-d-tex-1997/\nPapke v. City of Irving — 3:98-cv-00941 — N.D. Tex. — /civil-litigation/tx/papke-v-city-of-irving-3-98-cv-00941-n-d-tex-1998/\nAlrawaziq v. City of Irving — 3:99-cv-00970 — N.D. Tex. — /civil-litigation/tx/alrawaziq-v-city-of-irving-3-99-cv-00970-n-d-tex-1999/\nHowie v. City of Irving Texas — 3:00-cv-02094 — N.D. Tex. — /civil-litigation/tx/howie-v-city-of-irving-texas-3-00-cv-02094-n-d-tex-2000/\nHouse v. City of Irving, Texas — 3:03-cv-02524 — N.D. Tex. — /civil-litigation/tx/house-v-city-of-irving-texas-3-03-cv-02524-n-d-tex-2003/\nWallis v. The City of Irving — 3:07-cv-01483 — N.D. Tex. — /civil-litigation/tx/wallis-v-the-city-of-irving-3-07-cv-01483-n-d-tex-2007/\nLotts v. City of Irving et al — 3:25-CV-03329-S-BN — N.D. Tex. — /civil-litigation/tx/lotts-v-city-of-irving-et-al-3-25-cv-03329-s-bn-n-d-tex-2025/\nBarrera v. City of Irving et al — 3:25-cv-03160 — N.D. Tex. — /civil-litigation/tx/barrera-v-city-of-irving-et-al-3-25-cv-03160-n-d-tex-2025/\nYoung v. City of Irving et al — 3:23-cv-01423 — N.D. Tex. — /civil-litigation/tx/young-v-city-of-irving-et-al-3-2023cv01423-n-d-tex-2023/\nEllis v. Police Dept of Irving et al — 3:22-cv-00265-B-BN — N.D. Tex. — /civil-litigation/tx/ellis-v-police-dept-of-irving-et-al-3-22-cv-00265-b-bn-n-d-tex-2022/\nDuke v. City of Irving TX — 3:20-cv-00116-K — N.D. Tex. — /civil-litigation/tx/duke-v-city-of-irving-tx-3-20-cv-00116-k-n-d-tex-2020/\nWilliams v. City of Irving, Texas et al — 3:15-CV-1701-L — N.D. Tex. — /civil-litigation/tx/williams-v-city-of-irving-texas-et-al-3-15-cv-1701-l-n-d-tex-2015/",
    },
    locator: { kind: "role", value: "Suggest edit" },
    targetPath: "/law-enforcement-agency/suggest-edit/",
  },
  {
    name: "subscribe",
    route: "/law-enforcement-agency/tx/irving-police-department-049f9a/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Subscriber",
      message:
        "Please notify me when this agency page changes: /law-enforcement-agency/tx/irving-police-department-049f9a/",
    },
    locator: { kind: "testId", value: "agency-subscribe-link" },
    targetPath: "/about/contact/",
  },
  {
    name: "claim profile",
    route: "/law-enforcement-agency/tx/irving-police-department-049f9a/",
    expectedFields: ["message", "whoami"],
    payload: {
      whoami: "Profile Owner",
      message:
        "I would like to claim ownership of this profile.\nProfile path: /law-enforcement-agency/tx/irving-police-department-049f9a/",
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
