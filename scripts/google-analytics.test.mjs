import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const analytics = readFileSync(
  new URL("../src/lib/client/analytics.js", import.meta.url),
  "utf8",
);

const consentModule = readFileSync(
  new URL("../src/lib/client/analytics-consent.js", import.meta.url),
  "utf8",
);
function loadTag(choice) {
  const atExternalLoad = [];
  const browser = {
    URL,
    localStorage: { getItem: () => choice },
    document: {
      title: "Public records",
      referrer: "",
      createElement: () => ({}),
      head: { appendChild: () => atExternalLoad.push([...browser.dataLayer]) },
    },
    location: {
      protocol: "https:",
      host: "policeconduct.org",
      origin: "https://policeconduct.org",
      href: "https://policeconduct.org/?query=agency",
      pathname: "/",
      search: "?query=agency",
    },
  };
  browser.window = browser;
  runInNewContext(
    (consentModule + analytics.replace(/^import [\s\S]*?;\n/m, "")).replaceAll(
      "export const ",
      "const ",
    ) + "\ninitializeAnalytics();",
    browser,
  );
  return { browser, atExternalLoad };
}

test("advertising is denied before the external tag can load", () => {
  const { atExternalLoad } = loadTag();
  assert.equal(atExternalLoad.length, 1);
  const consent = atExternalLoad[0].find(
    (entry) => entry[0] === "consent" && entry[1] === "default",
  );
  assert.ok(consent, "consent defaults must precede the external script");
  for (const key of ["ad_storage", "ad_user_data", "ad_personalization"]) {
    assert.equal(consent[2][key], "denied");
  }
});

test("page views default to advertising opt-out while retaining ordinary analytics", () => {
  const { browser } = loadTag();
  const configs = browser.dataLayer.filter((entry) => entry[0] === "config");
  assert.equal(configs.length, 1);
  const [, id, config] = configs[0];
  assert.equal(id, "G-40S6M70XP7");
  const flags = browser.dataLayer.find(
    (entry) => entry[0] === "set" && "allow_google_signals" in entry[1],
  )[1];
  assert.equal(flags.allow_ad_personalization_signals, false);
  assert.equal(flags.allow_google_signals, false);
  assert.equal(config.page_title, browser.document.title);
  assert.equal(config.page_location, "https://policeconduct.org/");
  assert.equal(config.page_path, "/");
  browser.gtag("event", "search", { search_term: "agency" });
  assert.equal(browser.dataLayer.at(-1)[0], "event");
});

for (const [choice, expected] of [
  [undefined, "denied"],
  ["denied", "denied"],
  ["granted", "granted"],
  ["invalid", "denied"],
]) {
  test(`analytics storage defaults to ${expected} for saved choice ${choice}`, () => {
    const { atExternalLoad } = loadTag(choice);
    assert.equal(
      atExternalLoad.length,
      1,
      "advanced mode loads Google even when denied",
    );
    const state = atExternalLoad[0].find((entry) => entry[0] === "consent")[2];
    assert.equal(state.analytics_storage, expected);
    for (const key of ["ad_storage", "ad_user_data", "ad_personalization"])
      assert.equal(state[key], "denied");
  });
}

for (const analytics of ["granted", "denied"]) {
  for (const advertising of ["granted", "denied"]) {
    test(`saved independent choices: analytics=${analytics}, advertising=${advertising}`, () => {
      const { atExternalLoad } = loadTag(
        JSON.stringify({ analytics, advertising }),
      );
      const queue = atExternalLoad[0];
      const state = queue.find((entry) => entry[0] === "consent")[2];
      assert.equal(state.analytics_storage, analytics);
      for (const key of ["ad_storage", "ad_user_data", "ad_personalization"])
        assert.equal(state[key], advertising);
      const flags = queue.find(
        (entry) => entry[0] === "set" && "allow_google_signals" in entry[1],
      )[1];
      assert.equal(flags.allow_google_signals, advertising === "granted");
      assert.equal(
        flags.allow_ad_personalization_signals,
        advertising === "granted",
      );
    });
  }
}
