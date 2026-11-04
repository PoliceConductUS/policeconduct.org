import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const component = readFileSync(
  new URL("../src/components/GoogleAnalytics.astro", import.meta.url),
  "utf8",
);

function loadTag() {
  const browser = {
    document: { title: "Public records" },
    location: {
      href: "https://policeconduct.org/?query=agency",
      pathname: "/",
      search: "?query=agency",
    },
  };
  browser.window = browser;
  const atExternalLoad = [];
  for (const script of component.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/g,
  )) {
    if (/\bsrc=/.test(script[1])) {
      atExternalLoad.push([...(browser.dataLayer || [])]);
    } else {
      runInNewContext(script[2], browser);
    }
  }
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

test("every page view opts out while retaining ordinary analytics", () => {
  const { browser } = loadTag();
  const configs = browser.dataLayer.filter((entry) => entry[0] === "config");
  assert.equal(configs.length, 1);
  const [, id, config] = configs[0];
  assert.equal(id, "G-40S6M70XP7");
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.page_title, browser.document.title);
  assert.equal(config.page_location, browser.location.href);
  assert.equal(config.page_path, "/?query=agency");
  browser.gtag("event", "search", { search_term: "agency" });
  assert.equal(browser.dataLayer.at(-1)[0], "event");
});
