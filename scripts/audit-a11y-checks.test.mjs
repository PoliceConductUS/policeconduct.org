import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "@playwright/test";
import {
  assistiveFindings,
  forcedColorsFindings,
  screenReaderFindings,
  unnamedNodes,
  zoomFindings,
} from "./audit-a11y-checks.mjs";

let browser;
before(async () => {
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
});

async function render(t, body, { head = "", lang = "en" } = {}) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  t.after(() => page.close());
  await page.setContent(
    `<!doctype html><html${lang ? ` lang="${lang}"` : ""}><head><meta name="viewport" content="width=device-width">${head}</head><body>${body}</body></html>`,
  );
  return page;
}

const shell = (main) =>
  `<header><a href="/">Site</a></header><main><h1>Page</h1>${main}</main><footer><a href="/about/">About</a></footer>`;
const title = "<title>Page</title>";

test("a well-formed page has no findings", async (t) => {
  const page = await render(
    t,
    shell(
      '<p>Text</p><img src="data:," alt="A chart"><label for="q">Search</label><input id="q" style="font-size:16px"><button>Send</button>',
    ),
    { head: title },
  );
  assert.deepEqual(await assistiveFindings(page), []);
});

test("unnamed nodes are picked out of an accessibility tree", () => {
  const tree = [
    '- link "Home"',
    "- link:",
    '  - img "Logo"',
    "- button",
    "- button [disabled]",
    '- textbox "Search"',
    "- textbox",
    "- paragraph: text",
    "- img",
  ].join("\n");
  assert.deepEqual(unnamedNodes(tree), [
    "- link:",
    "- button",
    "- button [disabled]",
    "- textbox",
    "- img",
  ]);
});

test("a screen reader finding names each missing landmark, heading, alt text and label", async (t) => {
  const page = await render(
    t,
    '<div><h2>No landmarks</h2><img src="data:,"><button><svg width="10" height="10"></svg></button><a href="/x"></a><input></div>',
    { lang: "" },
  );
  const findings = await screenReaderFindings(page);
  for (const expected of [
    "banner landmark: found 0, expected 1",
    "main landmark: found 0, expected 1",
    "contentinfo landmark: found 0, expected 1",
    "level 1 heading: found 0, expected 1",
    "image without alt: found 1, expected 0",
    "empty page title",
    "html has no lang attribute",
    "no accessible name: - img",
    "no accessible name: - button:",
    "no accessible name: - link:",
    "no accessible name: - textbox",
  ]) {
    assert.ok(
      findings.includes(expected),
      `${expected}\n${findings.join("\n")}`,
    );
  }
});

test("two page headings are reported", async (t) => {
  const page = await render(t, shell("<h1>Second</h1>"), { head: title });
  assert.deepEqual(await screenReaderFindings(page), [
    "level 1 heading: found 2, expected 1",
  ]);
});

test("forced colors: a focus ring made only of box-shadow is reported, an outline is not", async (t) => {
  const page = await render(
    t,
    shell(
      `<style>
        .shadow:focus { outline: 0; box-shadow: 0 0 0 4px blue; }
        .outlined:focus { outline: 2px solid transparent; box-shadow: 0 0 0 4px blue; }
      </style>
      <input class="shadow" aria-label="Shadow only"><input class="outlined" aria-label="Outlined">`,
    ),
    { head: title },
  );
  assert.deepEqual(await forcedColorsFindings(page), [
    'no focus indicator: input.shadow ""',
  ]);
});

test("forced colors: a filled button with no border is reported, a transparent border is not", async (t) => {
  const page = await render(
    t,
    shell(
      `<style>
        button { background: navy; color: white; }
        .bare { border: none; }
        .edged { border: 1px solid transparent; }
        .texty { border: none; background: none; color: inherit; text-decoration: underline; }
      </style>
      <button class="bare">Bare</button><button class="edged">Edged</button><button class="texty">Link-like</button>`,
    ),
    { head: title },
  );
  assert.deepEqual(await forcedColorsFindings(page), [
    'no visible edge: button.bare "Bare"',
  ]);
});

test("zoom: sideways scrolling and cut-off text are reported at 400% but not when content reflows", async (t) => {
  const broken = await render(
    t,
    shell(
      `<div style="width:600px">A fixed-width block</div>
       <p style="width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">A label that is far too long to fit</p>`,
    ),
    { head: title },
  );
  const findings = await zoomFindings(broken);
  assert.ok(
    findings.some((item) =>
      /^400% zoom: page scrolls sideways by \d+px$/.test(item),
    ),
    findings.join("\n"),
  );
  assert.ok(
    findings.some((item) => item.startsWith("400% zoom: text cut off: p.")),
    findings.join("\n"),
  );
  assert.equal(broken.viewportSize().width, 1280);

  const fluid = await render(
    t,
    shell(
      '<p style="max-width:40rem">A paragraph that wraps as the page narrows.</p>',
    ),
    { head: title },
  );
  assert.deepEqual(await zoomFindings(fluid), []);
});

test("zoom: a blocked viewport and small field text are reported for phones", async (t) => {
  const page = await browser.newPage();
  t.after(() => page.close());
  await page.setContent(
    `<!doctype html><html lang="en"><head><title>Page</title><meta name="viewport" content="width=device-width, maximum-scale=1, user-scalable=no"></head><body>${shell('<label for="a">Name</label><input id="a" style="font-size:14px">')}</body></html>`,
  );
  assert.deepEqual(await zoomFindings(page), [
    "phone: viewport meta disables zoom (user-scalable)",
    "phone: viewport meta disables zoom (maximum-scale)",
    "phone: field text 14px triggers automatic zoom on iOS: input#a",
  ]);
});
