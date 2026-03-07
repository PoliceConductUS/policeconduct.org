import { expect, type Page, test } from "@playwright/test";
import {
  assertPrefillApplied,
  assertPrefillConsumed,
  type PrefillKey,
  seedFlashPrefill,
} from "./prefill";

type SenderLink = {
  href: string;
  key: string;
  testId: string;
  payload: Record<string, unknown>;
};

const staticSenderRoutes = [
  "/civil-litigation/",
  "/donate/",
  "/law-enforcement-agency/tx/irving-police-department-049f9a/",
  "/legal-notice/",
  "/news/",
  "/partner/",
  "/partner/academic/",
  "/partner/bail-bonds/",
  "/partner/bar-association/",
  "/partner/creator/",
  "/partner/law-enforcement-agency/",
  "/partner/law-enforcement-officer/",
  "/partner/law-firm/",
  "/partner/media/",
  "/partner/nonprofit/",
  "/partner/peace-officer-standards-and-training/",
  "/partner/prosecutor/",
  "/partner/technology/",
  "/personnel/james-markham-v-7635c7/",
  "/report/tx/2023-12-04-75039-1st-amendment-retaliation-arrest-2c545f/",
  "/volunteer/",
];

async function getFirstMatchingHref(
  page: Page,
  route: string,
  pattern: string,
): Promise<string> {
  await page.goto(route);
  const href = await page.evaluate((regexSource) => {
    const regex = new RegExp(regexSource);
    const links = Array.from(document.querySelectorAll("a[href]"));
    const match = links.find((link) => {
      const href = link.getAttribute("href") || "";
      return regex.test(href);
    });
    return match?.getAttribute("href") || "";
  }, pattern);
  expect(href).not.toBe("");
  return href;
}

async function collectSenderLinks(
  page: Page,
  route: string,
): Promise<SenderLink[]> {
  await page.goto(route);
  return await page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll("a[data-prefill-key][data-prefill-payload]"),
    );
    return nodes
      .map((node) => {
        const style = window.getComputedStyle(node);
        const isVisible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          node.getClientRects().length > 0;
        if (!isVisible) {
          return null;
        }
        const href = node.getAttribute("href") || "";
        const key = node.getAttribute("data-prefill-key") || "";
        const testId = node.getAttribute("data-testid") || "";
        const payloadRaw = node.getAttribute("data-prefill-payload") || "";
        if (!href || !key || !payloadRaw) {
          return null;
        }
        try {
          const payload = JSON.parse(payloadRaw);
          if (
            !payload ||
            typeof payload !== "object" ||
            Array.isArray(payload)
          ) {
            return null;
          }
          return { href, key, testId, payload };
        } catch (_error) {
          return null;
        }
      })
      .filter(Boolean) as SenderLink[];
  });
}

function targetPathFromHref(currentUrl: string, href: string): string {
  return new URL(href, currentUrl).pathname;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertClearedAfterReload(
  page: Page,
  key: PrefillKey,
  payload: Record<string, unknown>,
): Promise<void> {
  await page.reload();
  switch (key) {
    case "prefill:contact":
      if (typeof payload.message === "string") {
        await expect(page.locator("#message")).toHaveValue("");
      }
      break;
    case "prefill:reportNew":
      if (typeof payload["officers[0][department]"] === "string") {
        await expect(
          page.locator(".officer-entry .officer-department").first(),
        ).toHaveValue("");
      }
      break;
    case "prefill:issueNew":
      if (typeof payload.message === "string") {
        await expect(page.locator("#message")).toHaveValue("");
      }
      break;
    case "prefill:civilLitigationNew":
      if (typeof payload.jurisdiction === "string") {
        await expect(page.locator("#jurisdiction")).toHaveValue("");
      }
      break;
    case "prefill:personnelNew":
      if (typeof payload.currentAgency === "string") {
        await expect(page.locator("#currentAgency")).toHaveValue("");
      }
      break;
    case "prefill:personnelSuggestEdit":
      if (typeof payload.officerPath === "string") {
        await expect(page.locator("#officerPath")).toHaveValue("");
      }
      break;
    case "prefill:agencySuggestEdit":
      if (typeof payload.agencyPath === "string") {
        await expect(page.locator("#agencyPath")).toHaveValue("");
      }
      break;
  }
}

test.describe("prefill links", () => {
  test("all sender routes apply expected prefill payloads", async ({
    page,
  }) => {
    for (const route of staticSenderRoutes) {
      const links = await collectSenderLinks(page, route);
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        if (
          link.testId === "personnel-subscribe-link" ||
          link.testId === "personnel-claim-profile-link" ||
          link.testId === "agency-subscribe-link" ||
          link.testId === "agency-claim-profile-link"
        ) {
          continue;
        }
        await page.goto(route);
        const expectedPath = targetPathFromHref(page.url(), link.href);
        await page
          .locator(
            `a[data-prefill-key="${link.key}"][href="${link.href}"]:visible`,
          )
          .first()
          .click();
        await expect(page).toHaveURL(
          new RegExp(`${escapeRegExp(expectedPath)}$`),
        );
        await assertPrefillApplied(page, link.key, link.payload);
      }
    }
  });

  test("profile contact links use expected payload per CTA", async ({
    page,
  }) => {
    const personnelRoute = "/personnel/james-markham-v-7635c7/";
    const agencyRoute = await getFirstMatchingHref(
      page,
      "/law-enforcement-agency/",
      "^/law-enforcement-agency/[^/]+/[^/]+/$",
    );

    await page.goto(personnelRoute);
    await page.getByTestId("personnel-subscribe-link").click();
    await assertPrefillApplied(page, "prefill:contact", {
      whoami: "Subscriber",
    });

    await page.goto(personnelRoute);
    await page.getByTestId("personnel-claim-profile-link").click();
    await assertPrefillApplied(page, "prefill:contact", {
      whoami: "Profile Owner",
    });

    await page.goto(agencyRoute);
    await page.getByTestId("agency-subscribe-link").click();
    await assertPrefillApplied(page, "prefill:contact", {
      whoami: "Subscriber",
    });

    await page.goto(agencyRoute);
    await page.getByTestId("agency-claim-profile-link").click();
    await assertPrefillApplied(page, "prefill:contact", {
      whoami: "Profile Owner",
    });
  });

  test("flash prefills are consumed once", async ({ page }) => {
    const cases: Array<{
      key: PrefillKey;
      route: string;
      payload: Record<string, unknown>;
    }> = [
      {
        key: "prefill:contact",
        route: "/about/contact/",
        payload: { whoami: "Subscriber", message: "One-time contact prefill" },
      },
      {
        key: "prefill:reportNew",
        route: "/report/new/",
        payload: {
          "officers[0][department]": "Test Department",
          "officers[0][name]": "Test Officer",
        },
      },
      {
        key: "prefill:issueNew",
        route: "/issue/new/",
        payload: { message: "One-time issue prefill" },
      },
      {
        key: "prefill:civilLitigationNew",
        route: "/civil-litigation/new/",
        payload: { jurisdiction: "tx" },
      },
      {
        key: "prefill:personnelNew",
        route: "/personnel/new/",
        payload: {
          currentAgency: "Test Agency",
          currentAgencyCity: "Austin",
          currentAgencyState: "TX",
        },
      },
      {
        key: "prefill:personnelSuggestEdit",
        route: "/personnel/suggest-edit/",
        payload: { officerPath: "/personnel/example/" },
      },
      {
        key: "prefill:agencySuggestEdit",
        route: "/law-enforcement-agency/suggest-edit/",
        payload: {
          agencyPath: "/law-enforcement-agency/tx/example/",
          jurisdiction: "tx",
        },
      },
    ];

    for (const entry of cases) {
      await seedFlashPrefill(page, entry.key, entry.payload);
      await page.goto(entry.route);
      await assertPrefillApplied(page, entry.key, entry.payload);
      await assertPrefillConsumed(page, entry.key);
      await assertClearedAfterReload(page, entry.key, entry.payload);
    }
  });
});
