// Checks that axe does not make: what a screen reader receives, forced-colors
// rendering, and zoom. They read the accessibility tree and computed styles;
// they do not replace a person using a screen reader.

const UNNAMED_NODE =
  /^\s*- (link|button|textbox|searchbox|combobox|listbox|checkbox|radio|img|navigation|dialog|region|form)\s*(\[[^\]]*\]\s*)*:?\s*$/;

// A control or region the accessibility tree lists without a quoted name is
// announced with no label.
export function unnamedNodes(ariaSnapshot) {
  return ariaSnapshot
    .split("\n")
    .filter((line) => UNNAMED_NODE.test(line))
    .map((line) => line.trim());
}

export async function screenReaderFindings(page) {
  const findings = [];
  const expectCount = async (label, locator, expected) => {
    const count = await locator.count();
    if (count !== expected) {
      findings.push(`${label}: found ${count}, expected ${expected}`);
    }
  };
  await expectCount("banner landmark", page.getByRole("banner"), 1);
  await expectCount("main landmark", page.getByRole("main"), 1);
  await expectCount("contentinfo landmark", page.getByRole("contentinfo"), 1);
  await expectCount(
    "level 1 heading",
    page.getByRole("heading", { level: 1 }),
    1,
  );
  await expectCount("image without alt", page.locator("img:not([alt])"), 0);
  if ((await page.title()).trim() === "") findings.push("empty page title");
  if (!(await page.locator("html").getAttribute("lang"))) {
    findings.push("html has no lang attribute");
  }
  for (const node of unnamedNodes(await page.locator("body").ariaSnapshot())) {
    findings.push(`no accessible name: ${node}`);
  }
  return findings;
}

function inspectFocusAndEdges() {
  // Runs in the page, where these are the browser's globals.
  const { document, getComputedStyle } = globalThis;
  const describe = (element) =>
    `${element.tagName.toLowerCase()}.${String(element.className).trim().replace(/\s+/g, ".")} "${(element.textContent ?? "").trim().slice(0, 30)}"`;
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      getComputedStyle(element).visibility !== "hidden" &&
      !element.closest("[hidden], [inert], details:not([open]) > :not(summary)")
    );
  };
  const hasOutline = (style) =>
    style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 1;
  const findings = [];
  const stops = Array.from(
    document.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(visible);
  for (const stop of stops) {
    stop.focus();
    if (document.activeElement !== stop) continue;
    // Forced colors removes box-shadow, so only an outline survives.
    if (!hasOutline(getComputedStyle(stop))) {
      findings.push(`no focus indicator: ${describe(stop)}`);
    }
  }
  document.activeElement?.blur();
  for (const control of document.querySelectorAll(
    'button, .btn, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea',
  )) {
    if (!visible(control)) continue;
    const style = getComputedStyle(control);
    // A control styled as plain text reads as a link and needs no box.
    const looksLikeText =
      style.textDecorationLine.includes("underline") ||
      (style.backgroundColor === "rgba(0, 0, 0, 0)" &&
        style.borderTopStyle === "none");
    const hasBorder =
      style.borderTopStyle !== "none" && parseFloat(style.borderTopWidth) >= 1;
    if (!hasBorder && !hasOutline(style) && !looksLikeText) {
      findings.push(`no visible edge: ${describe(control)}`);
    }
  }
  return { stops: stops.length, findings };
}

export async function forcedColorsFindings(page) {
  await page.emulateMedia({ forcedColors: "active" });
  try {
    // Keyboard modality makes :focus-visible apply to the focus() calls.
    await page.keyboard.press("Tab");
    const { stops, findings } = await page.evaluate(inspectFocusAndEdges);
    return stops === 0 ? ["no keyboard stops found"] : findings;
  } finally {
    await page.emulateMedia({ forcedColors: "none" });
  }
}

function inspectReflow() {
  // Runs in the page, where these are the browser's globals.
  const { document, getComputedStyle, Node, innerWidth } = globalThis;
  const findings = [];
  const overflow = document.documentElement.scrollWidth - innerWidth;
  if (overflow > 0) findings.push(`page scrolls sideways by ${overflow}px`);
  for (const element of document.querySelectorAll("body *")) {
    const ownText = Array.from(element.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    if (!ownText) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    if (element.closest(".visually-hidden, [hidden], [aria-hidden='true']")) {
      continue;
    }
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || style.display === "none") continue;
    const cutsX =
      /hidden|clip/.test(style.overflowX) &&
      element.scrollWidth > element.clientWidth + 1;
    const cutsY =
      /hidden|clip/.test(style.overflowY) &&
      element.scrollHeight > element.clientHeight + 1;
    if (cutsX || cutsY) {
      findings.push(
        `text cut off: ${element.tagName.toLowerCase()}.${String(element.className).trim().replace(/\s+/g, ".")} "${element.textContent.trim().slice(0, 40)}"`,
      );
    }
  }
  return findings;
}

function inspectPhoneFields() {
  // Runs in the page, where these are the browser's globals.
  const { document, getComputedStyle } = globalThis;
  const findings = [];
  const viewport =
    document.querySelector('meta[name="viewport"]')?.getAttribute("content") ??
    "";
  if (/user-scalable\s*=\s*(no|0)/i.test(viewport)) {
    findings.push("viewport meta disables zoom (user-scalable)");
  }
  if (/maximum-scale\s*=\s*1(\.0*)?(\D|$)/i.test(viewport)) {
    findings.push("viewport meta disables zoom (maximum-scale)");
  }
  for (const field of document.querySelectorAll(
    'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea',
  )) {
    const rect = field.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const size = parseFloat(getComputedStyle(field).fontSize);
    // iOS zooms the page when a focused field's text is smaller than 16px.
    if (size < 16) {
      findings.push(
        `field text ${size}px triggers automatic zoom on iOS: ${field.tagName.toLowerCase()}#${field.id}`,
      );
    }
  }
  return findings;
}

export async function zoomFindings(page) {
  const original = page.viewportSize();
  const findings = [];
  const label = (name, items) => items.map((item) => `${name}: ${item}`);
  try {
    await page.setViewportSize({ width: 640, height: 450 });
    findings.push(...label("200% zoom", await page.evaluate(inspectReflow)));
    await page.setViewportSize({ width: 320, height: 256 });
    findings.push(...label("400% zoom", await page.evaluate(inspectReflow)));
    await page.setViewportSize({ width: 390, height: 800 });
    findings.push(...label("phone", await page.evaluate(inspectPhoneFields)));
  } finally {
    if (original) await page.setViewportSize(original);
  }
  return findings;
}

// The consent dialog is modal: while it is open the rest of the page is inert.
export async function declineConsent(page) {
  const decline = page.getByRole("button", {
    name: "Decline all",
    exact: true,
  });
  if (await decline.isVisible().catch(() => false)) {
    await decline.click({ timeout: 5000 });
  }
}

export async function assistiveFindings(page) {
  await declineConsent(page);
  return [
    ...(await screenReaderFindings(page)).map(
      (item) => `screen reader: ${item}`,
    ),
    ...(await forcedColorsFindings(page)).map(
      (item) => `forced colors: ${item}`,
    ),
    ...(await zoomFindings(page)),
  ];
}
