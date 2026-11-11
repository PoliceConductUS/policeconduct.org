import { test, expect } from "@playwright/test";
import { createIndex, close } from "pagefind";

// Serve this checkout behind production URLs. Every external request is
// intercepted: these tests cannot reach Google or submit an actual form.
async function visitSite(page, baseURL, url, options = {}) {
  const commands = [];
  const commandTypes = [];
  const tagLoads = [];
  const submissions = [];
  await page.exposeFunction("recordAnalyticsCommand", (entryType, command) => {
    commandTypes.push(entryType);
    commands.push(command);
  });
  await page.addInitScript(() => {
    window.dataLayer = [];
    window.dataLayer.push = function (...items) {
      for (const item of items) {
        const entryType = Object.prototype.toString.call(item);
        window.recordAnalyticsCommand(entryType, Array.from(item));
      }
      return Array.prototype.push.apply(this, items);
    };
    window.grecaptcha = {
      enterprise: {
        ready(callback) {
          callback();
        },
        async execute() {
          return "intercepted-recaptcha-token";
        },
      },
    };
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const requested = new URL(request.url());
    if (requested.pathname === "/find-records/data.json") {
      await route.fulfill({ json: [] });
      return;
    }
    if (requested.hostname.endsWith("googletagmanager.com")) {
      tagLoads.push(
        await page.evaluate(() => ({
          async: [...document.scripts].find((script) =>
            script.src.includes("googletagmanager.com"),
          )?.async,
          queue: Array.from(window.dataLayer || [], (entry) =>
            Array.from(entry),
          ),
        })),
      );
      await route.fulfill({ contentType: "text/javascript", body: "" });
      return;
    }
    if (requested.pathname === "/api/forms/submit") {
      submissions.push(request.postDataJSON());
      await route.fulfill({
        status: options.responseStatus || 200,
        json: options.formResponse || { verificationPending: true },
      });
      return;
    }
    if (
      requested.hostname === "policeconduct.org" ||
      requested.hostname === "www.policeconduct.org" ||
      requested.hostname === "preview.example.org" ||
      requested.origin === new URL(baseURL).origin
    ) {
      const response = await page.request.fetch(
        new URL(requested.pathname + requested.search, baseURL).href,
        { method: request.method() },
      );
      await route.fulfill({ response });
      return;
    }
    await route.abort();
  });
  await page.goto(url, options.referer ? { referer: options.referer } : {});
  await expect
    .poll(() => page.evaluate(() => typeof window.__IPC_ANALYTICS__?.track))
    .toBe("function");
  return {
    commands,
    commandTypes,
    tagLoads,
    submissions,
    events: (name) =>
      commands.filter(
        (command) => command[0] === "event" && command[1] === name,
      ),
  };
}

test("production initializes the queue before one asynchronous Google load", async ({
  page,
  baseURL,
}) => {
  const analytics = await visitSite(
    page,
    baseURL,
    "https://policeconduct.org/find-records/?token=private-token&q=private-search&utm_source=newsletter#private-fragment",
    { referer: "https://policeconduct.org/verify/?token=private-referrer" },
  );
  await expect.poll(() => analytics.tagLoads.length).toBe(1);
  expect([...new Set(analytics.commandTypes)]).toEqual(["[object Arguments]"]);
  expect(analytics.tagLoads[0].async).toBe(true);
  expect(
    analytics.tagLoads[0].queue.some((entry) => entry[0] === "config"),
  ).toBe(true);
  const config = analytics.commands.find((command) => command[0] === "config");
  expect(config[2]).toMatchObject({
    send_page_view: false,
    page_location:
      "https://policeconduct.org/find-records/?utm_source=newsletter",
    page_path: "/find-records/",
    page_referrer: "https://policeconduct.org/verify/",
  });
  expect(analytics.events("page_view")).toHaveLength(1);
  expect(JSON.stringify(analytics.commands)).not.toContain("private-");
});

for (const origin of [
  "http://policeconduct.org",
  "http://www.policeconduct.org",
  "https://preview.example.org",
  "https://policeconduct.org:444",
  "local",
]) {
  test(`does not collect or load Google on ${origin}`, async ({
    page,
    baseURL,
  }) => {
    const analytics = await visitSite(
      page,
      baseURL,
      `${origin === "local" ? baseURL : origin}/about/contact/`,
    );
    await page.evaluate(() => {
      window.gtag = (...args) => window.dataLayer.push(args);
      window.__IPC_ANALYTICS__.track("form_submit_attempt", {
        form_name: "contact",
      });
    });
    expect(analytics.tagLoads).toEqual([]);
    expect(analytics.commands).toEqual([]);
  });
}

test("all custom URL fields remove private queries and fragments", async ({
  page,
  baseURL,
}) => {
  const analytics = await visitSite(
    page,
    baseURL,
    "https://www.policeconduct.org/about/contact/",
  );
  await page.evaluate(() => {
    window.__IPC_ANALYTICS__.track("outbound_link_click", {
      destination_url:
        "https://example.org/public/?query=private-search&token=private-token&utm_medium=email#private-fragment",
      href_path: "/find-records/?q=private-search#private-fragment",
      page_location:
        "https://www.policeconduct.org/verify/?note=private-note&token=private-token#private-fragment",
      page_path: "/verify/?token=private-token#private-fragment",
      page_referrer:
        "https://example.org/?token=private-referrer#private-fragment",
      prefill_key: "/report/new/?token=private-token#private-fragment",
    });
  });
  await expect
    .poll(() => analytics.events("outbound_link_click").length)
    .toBe(1);
  expect(analytics.events("outbound_link_click")[0][2]).toMatchObject({
    destination_url: "https://example.org/public/?utm_medium=email",
    href_path: "/find-records/",
    page_location: "https://www.policeconduct.org/verify/",
    page_path: "/verify/",
    page_referrer: "https://example.org/",
    prefill_key: "/report/new/",
  });
  expect(JSON.stringify(analytics.commands)).not.toContain("private-");
});

test("current masthead links each emit their single navigation or CTA event", async ({
  page,
  baseURL,
}) => {
  const analytics = await visitSite(
    page,
    baseURL,
    "https://policeconduct.org/about/contact/",
  );
  await page.evaluate(() =>
    document.addEventListener("click", (event) => event.preventDefault()),
  );
  for (const [label, eventName, path] of [
    ["News", "nav_link_click", "/news/"],
    ["Donate", "nav_link_click", "/donate/"],
    ["Share an experience", "nav_cta_click", "/report/new/"],
    ["Volunteer", "nav_cta_click", "/volunteer/"],
  ]) {
    const before = analytics.commands.length;
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", {
        name: label,
        exact: true,
      })
      .click();
    await expect.poll(() => analytics.commands.length).toBe(before + 1);
    expect(analytics.commands.at(-1)).toMatchObject([
      "event",
      eventName,
      { href_path: path, link_text: label },
    ]);
  }
  const before = analytics.commands.length;
  await page.locator(".masthead-mark").click();
  await expect.poll(() => analytics.commands.length).toBe(before + 1);
  expect(analytics.commands.at(-1)).toMatchObject([
    "event",
    "nav_link_click",
    { href_path: "/" },
  ]);
});

test("finder reports settled outcomes and bounded selections without query text", async ({
  page,
  baseURL,
}) => {
  const analytics = await visitSite(
    page,
    baseURL,
    "https://policeconduct.org/find-records/",
  );
  // The specific data route takes precedence over the catch-all proxy.
  await page.route("**/find-records/data.json", (route) =>
    route.fulfill({
      json: [
        {
          type: "agency",
          results: [
            {
              searchText: "private-search",
              label: "private-result-label",
              href: "/tx/example-agency/?q=private-search#private-fragment",
            },
          ],
        },
      ],
    }),
  );
  const input = page.locator("[data-record-finder-input]");
  await input.pressSequentially("private-search", { delay: 80 });
  await expect.poll(() => analytics.events("search_results").length).toBe(1);
  expect(analytics.events("search_results")[0][2]).toMatchObject({
    search_source: "record_finder",
    result_count: 1,
  });
  await input.dispatchEvent("input");
  await page.waitForTimeout(850);
  expect(analytics.events("search_results")).toHaveLength(1);
  await page.evaluate(() =>
    document.addEventListener("click", (event) => event.preventDefault()),
  );
  await page.locator(".finder-result").click();
  await expect
    .poll(() => analytics.events("search_result_selected").length)
    .toBe(1);
  expect(analytics.events("search_result_selected")[0][2]).toMatchObject({
    search_source: "record_finder",
    result_category: "agency",
  });
  await input.fill("private-no-match");
  await expect
    .poll(() => analytics.events("coverage_search_no_results").length)
    .toBe(1);
  expect(analytics.events("search_results").at(-1)[2]).toMatchObject({
    result_count: 0,
  });
  expect(JSON.stringify(analytics.commands)).not.toContain("private-");
});

for (const failure of ["http", "json"]) {
  test(`finder does not measure completed outcomes after a ${failure} dataset failure`, async ({
    page,
    baseURL,
  }) => {
    const analytics = await visitSite(
      page,
      baseURL,
      "https://policeconduct.org/find-records/",
    );
    await page.route("**/find-records/data.json", (route) =>
      route.fulfill({
        status: failure === "http" ? 503 : 200,
        contentType: "application/json",
        body: failure === "http" ? "[]" : "invalid json",
      }),
    );
    await page
      .locator("[data-record-finder-input]")
      .fill("private-unavailable");
    await expect(page.locator("[data-finder-no-results]")).toBeVisible();
    await page.waitForTimeout(850);
    expect(analytics.events("search_results")).toEqual([]);
    expect(analytics.events("coverage_search_no_results")).toEqual([]);
  });
}

for (const [destination, category] of [
  ["/tx/dallas-county/irving/irving-police-department-049f9a/", "agency"],
  ["/tx/dallas-county/irving/", "place"],
  ["/tx/dallas-county/irving/agencies/", "other"],
  ["/tx/civil-cases/", "other"],
  ["/personnel/", "other"],
  ["/civil-cases/", "other"],
  ["/tx/reports/", "other"],
  ["/federal/reports/", "other"],
  ["/personnel/fixture/", "personnel"],
  ["/civil-cases/fixture/", "civil_case"],
  ["/report/fixture/", "report"],
  ["/tx/dallas-county/irving/reports/2023/12/04/fixture/", "report"],
]) {
  test(`masthead classifies ${destination} as ${category}`, async ({
    page,
    baseURL,
  }) => {
    const analytics = await visitSite(
      page,
      baseURL,
      "https://policeconduct.org/about/contact/",
    );
    await page.route("**/pagefind/**", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: `export const search = async () => ({ results: [{ data: async () => ({ url: ${JSON.stringify(destination)}, meta: { title: "Fixture result" } }) }] });`,
      }),
    );
    await page.route(`https://policeconduct.org${destination}`, (route) =>
      route.fulfill({ contentType: "text/html", body: "Selected fixture" }),
    );
    await page
      .getByRole("combobox", { name: "Search records" })
      .fill("fixture");
    await page
      .getByRole("listbox", { name: "Search results" })
      .getByRole("option")
      .click();
    await expect
      .poll(() => analytics.events("search_result_selected").length)
      .toBe(1);
    expect(analytics.events("search_result_selected")[0][2]).toMatchObject({
      search_source: "masthead",
      result_category: category,
    });
  });
}

for (const selection of ["keyboard", "mouse"]) {
  test(`masthead counts one settled search and one ${selection} selection`, async ({
    page,
    baseURL,
  }) => {
    const { index, errors } = await createIndex();
    expect(errors).toEqual([]);
    if (!index) throw new Error("Pagefind did not create an index");
    let files;
    try {
      for (let number = 0; number < 10; number += 1) {
        const added = await index.addHTMLFile({
          url: `/personnel/fixture-${number}/?q=private-search`,
          content: `<html lang="en"><head><title>private-result-label ${number}</title></head><body data-pagefind-body>private-search</body></html>`,
        });
        expect(added.errors).toEqual([]);
      }
      const generated = await index.getFiles();
      expect(generated.errors).toEqual([]);
      files = generated.files;
    } finally {
      await close();
    }
    const analytics = await visitSite(
      page,
      baseURL,
      "https://policeconduct.org/about/contact/",
    );
    await page.route("**/pagefind/**", async (route) => {
      const asset = new URL(route.request().url()).pathname.slice(
        "/pagefind/".length,
      );
      const file = files.find((entry) => entry.path === asset);
      if (!file) throw new Error(`Missing Pagefind asset: ${asset}`);
      await route.fulfill({
        body: Buffer.from(file.content),
        contentType: asset.endsWith(".js")
          ? "text/javascript"
          : asset.endsWith(".wasm")
            ? "application/wasm"
            : "application/octet-stream",
      });
    });
    const input = page.getByRole("combobox", { name: "Search records" });
    const results = page
      .getByRole("listbox", { name: "Search results" })
      .getByRole("option");
    await input.pressSequentially("private-search", { delay: 80 });
    await expect(results).toHaveCount(8);
    await expect.poll(() => analytics.events("search_results").length).toBe(1);
    expect(analytics.events("search_results")[0][2]).toMatchObject({
      search_source: "masthead",
      result_count: 10,
    });
    // A normal pause longer than the UI's 150ms render debounce is still
    // typing, not a second settled search. The engine is already warm here.
    await input.fill("private");
    await page.waitForTimeout(350);
    expect(analytics.events("search_results")).toHaveLength(1);
    await input.fill("private-search");
    await input.dispatchEvent("input");
    await page.waitForTimeout(850);
    expect(analytics.events("search_results")).toHaveLength(1);
    // Capture the real navigation without asking the local corpus for this
    // generated search fixture's page.
    await page.route("**/personnel/fixture-*/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "Selected fixture" }),
    );
    if (selection === "keyboard") {
      await input.press("ArrowDown");
      await input.press("Enter");
    } else {
      await results.first().click();
    }
    await expect
      .poll(() => analytics.events("search_result_selected").length)
      .toBe(1);
    expect(analytics.events("search_result_selected")[0][2]).toMatchObject({
      search_source: "masthead",
      result_category: "personnel",
    });
    expect(JSON.stringify(analytics.commands)).not.toContain("private-");
  });
}

test("donation clicks preserve amount, frequency, and club fields", async ({
  page,
  baseURL,
}) => {
  const analytics = await visitSite(
    page,
    baseURL,
    "https://policeconduct.org/donate/",
  );
  await page.evaluate(() => {
    document.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a")) {
        event.preventDefault();
      }
    });
  });
  const amount = page.locator("[data-preset-button]").first();
  const amountKey = await amount.getAttribute("data-amount-key");
  const amountLabel = await amount.getAttribute("data-amount-label");
  await amount.click();
  await page.locator('label[for="frequency-oneTime"]').click();
  await amount.click();
  await expect
    .poll(() => analytics.events("donation_amount_clicked").length)
    .toBe(2);
  expect(
    analytics.events("donation_amount_clicked").map((entry) => entry[2]),
  ).toMatchObject([
    { amount_key: amountKey, amount_label: amountLabel, frequency: "monthly" },
    { amount_key: amountKey, amount_label: amountLabel, frequency: "oneTime" },
  ]);
  const club = page
    .locator('[data-club-button][data-club-frequency="annual"]')
    .first();
  await club.click();
  await expect
    .poll(() => analytics.events("donation_club_clicked").length)
    .toBe(1);
  expect(analytics.events("donation_club_clicked")[0][2]).toMatchObject({
    club_frequency: "annual",
    club_key: await club.getAttribute("data-club-key"),
    club_name: await club.getAttribute("data-club-name"),
  });
});

for (const verificationPending of [true, false, undefined]) {
  test(`submission receipt distinguishes verificationPending=${verificationPending}`, async ({
    page,
    baseURL,
  }) => {
    const analytics = await visitSite(
      page,
      baseURL,
      "https://policeconduct.org/about/contact/",
      {
        formResponse: {
          verificationPending,
          verificationFailureReason: verificationPending
            ? undefined
            : "send_failed",
          message: "Fixture submission received.",
        },
      },
    );
    const form = page.locator('form[name="contact"]');
    await form.locator("#whoami").selectOption("other");
    await form.locator("#fullName").fill("Fixture Submitter");
    await form.locator("#email").fill("fixture@example.org");
    await form.locator("#message").fill("private-form-message");
    await form.locator('button[type="submit"]').click();
    await expect(form.locator("[data-form-submit-success]")).toBeVisible();
    await expect
      .poll(() => analytics.events("form_submit_success").length)
      .toBe(1);
    expect(analytics.submissions).toHaveLength(1);
    expect(analytics.events("form_submit_success")[0][2]).toMatchObject({
      form_name: "contact",
      response_status: 200,
      verification_email_status:
        verificationPending === true
          ? "pending"
          : verificationPending === false
            ? "failed"
            : "unknown",
    });
    if (verificationPending !== false) {
      expect(analytics.events("form_verification_email_failed")).toEqual([]);
    } else {
      expect(analytics.events("form_verification_email_failed")).toHaveLength(
        1,
      );
      expect(
        analytics.events("form_verification_email_failed")[0][2],
      ).toMatchObject({
        form_name: "contact",
        response_status: 200,
        verification_email_status: "failed",
        failure_stage: "verification_email",
        failure_reason: "send_failed",
      });
      expect(analytics.events("form_submit_error")).toEqual([]);
    }
    expect(JSON.stringify(analytics.commands)).not.toContain(
      "private-form-message",
    );
    expect(JSON.stringify(analytics.commands)).not.toContain(
      "fixture@example.org",
    );
  });
}

test("an HTTP submission failure records its stage and never claims receipt", async ({
  page,
  baseURL,
}) => {
  const analytics = await visitSite(
    page,
    baseURL,
    "https://policeconduct.org/about/contact/",
    { responseStatus: 503, formResponse: { error: "private-api-error" } },
  );
  const form = page.locator('form[name="contact"]');
  await form.locator("#whoami").selectOption("other");
  await form.locator("#fullName").fill("Fixture Submitter");
  await form.locator("#email").fill("fixture@example.org");
  await form.locator("#message").fill("private-form-message");
  await form.locator('button[type="submit"]').click();
  await expect(form.locator("[data-form-submit-error]")).toBeVisible();
  await expect.poll(() => analytics.events("form_submit_error").length).toBe(1);
  expect(analytics.events("form_submit_error")[0][2]).toMatchObject({
    form_name: "contact",
    response_status: 503,
    failure_stage: "request",
  });
  expect(analytics.events("form_submit_success")).toEqual([]);
  expect(JSON.stringify(analytics.commands)).not.toContain("private-");
});

test("verification failure reasons never copy free text from the API", async ({
  page,
  baseURL,
}) => {
  const analytics = await visitSite(
    page,
    baseURL,
    "https://policeconduct.org/about/contact/",
    {
      formResponse: {
        verificationPending: false,
        verificationFailureReason: "private-api-detail",
      },
    },
  );
  const form = page.locator('form[name="contact"]');
  await form.locator("#whoami").selectOption("other");
  await form.locator("#fullName").fill("Fixture Submitter");
  await form.locator("#email").fill("fixture@example.org");
  await form.locator("#message").fill("private-form-message");
  await form.locator('button[type="submit"]').click();
  await expect
    .poll(() => analytics.events("form_verification_email_failed").length)
    .toBe(1);
  expect(
    analytics.events("form_verification_email_failed")[0][2],
  ).toMatchObject({
    failure_reason: "unknown",
  });
  expect(JSON.stringify(analytics.commands)).not.toContain("private-");
});
