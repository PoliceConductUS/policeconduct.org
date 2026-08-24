import assert from "node:assert/strict";
import test from "node:test";

import { __testables } from "./validate-redirect-targets.mjs";

const {
  resolveInterpolations,
  loadHandler,
  resolveThroughHandler,
  parseSitemapUrls,
} = __testables;

test("resolveInterpolations rejects unknown Terraform interpolations", () => {
  assert.throws(
    () => resolveInterpolations("var x = ${local.something_new};"),
    /Unrecognised Terraform interpolation/,
    "an unmapped interpolation must fail loudly rather than validate a stale handler",
  );
});

test("resolveInterpolations substitutes the known production values", () => {
  const resolved = resolveInterpolations(
    'var a = ${jsonencode(var.domain_name)}; var b = ${local.include_www ? "true" : "false"};',
  );
  assert.match(resolved, /"policeconduct\.org"/);
  assert.match(resolved, /var b = true;/);
});

test("parseSitemapUrls extracts loc values", () => {
  const urls = parseSitemapUrls(
    "<urlset><url><loc>https://www.policeconduct.org/a/</loc></url>" +
      "<url><loc>\n  https://www.policeconduct.org/b/\n</loc></url></urlset>",
  );
  assert.deepEqual(urls, [
    "https://www.policeconduct.org/a/",
    "https://www.policeconduct.org/b/",
  ]);
});

test("resolveThroughHandler detects a redirect loop instead of hanging", () => {
  const handler = () => ({
    statusCode: 301,
    headers: { location: { value: "/loop/" } },
  });
  const resolved = resolveThroughHandler(handler, "/start/");
  assert.equal(resolved.status, "redirect-loop");
  assert.equal(resolved.originKey, null);
});

test("resolveThroughHandler follows a redirect to its final origin key", () => {
  const handler = (event) => {
    if (event.request.uri === "/old/") {
      return { statusCode: 301, headers: { location: { value: "/new/" } } };
    }
    return { ...event.request, uri: `${event.request.uri}index.html` };
  };
  const resolved = resolveThroughHandler(handler, "/old/");
  assert.equal(resolved.originKey, "/new/index.html");
  assert.deepEqual(resolved.hops, [
    { from: "/old/", to: "/new/", statusCode: 301 },
  ]);
});

/**
 * INS-28 regression guard.
 *
 * The outage was a 301 from a page that existed to a path that did not. Until the
 * origin build publishes /civil-cases/ pages, the deployed handler must leave
 * /civil-litigation/{state}/{slug}/ alone so it keeps rewriting to the index.html
 * the build actually contains. If someone restores the rewrite rule without the
 * matching build, this test fails.
 */
test("civil-litigation case pages rewrite to origin rather than redirecting to /civil-cases/", async () => {
  const handler = await loadHandler();
  const uri =
    "/civil-litigation/mn/floyd-v-city-of-minneapolis-0-20-cv-01577-d-minn-2020/";

  const resolved = resolveThroughHandler(handler, uri);

  assert.equal(
    resolved.status,
    "rewrite",
    "case detail pages must rewrite to the origin, not redirect",
  );
  assert.equal(resolved.originKey, `${uri}index.html`);
  assert.deepEqual(resolved.hops, [], "no redirect hop should occur");
});

test("civil-litigation state indexes still redirect to the canonical state page", async () => {
  const handler = await loadHandler();

  // These 301 -> /mn/ and were verified 200 in production during INS-28; the fix
  // must not disturb them.
  const resolved = resolveThroughHandler(handler, "/civil-litigation/mn/");
  assert.deepEqual(resolved.hops, [
    { from: "/civil-litigation/mn/", to: "/mn/", statusCode: 301 },
  ]);
  assert.equal(resolved.originKey, "/mn/index.html");
});

test("apex host still redirects to www", async () => {
  const handler = await loadHandler();
  const result = handler({
    request: {
      uri: "/mn/",
      headers: { host: { value: "policeconduct.org" } },
      querystring: {},
    },
  });
  assert.equal(result.statusCode, 301);
  assert.equal(
    result.headers.location.value,
    "https://www.policeconduct.org/mn/",
  );
});
