import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL(
    "../infrastructure/bootstrap-policeconduct/functions/router.js",
    import.meta.url,
  ),
  "utf8",
);

function router(entries = {}, options = {}) {
  const kvs = {
    async exists(key) {
      if (options.existsError) throw options.existsError;
      return Object.hasOwn(entries, key);
    },
    async get(key) {
      if (options.getError) throw options.getError;
      if (!Object.hasOwn(entries, key)) throw new Error("Key not found");
      return entries[key];
    },
  };
  const rendered = source
    .replace('import cf from "cloudfront";', "")
    .replaceAll("${domain_name}", "example.org")
    .replaceAll(
      "${canonical_host}",
      options.canonicalHost ?? "www.example.org",
    );
  const context = vm.createContext({ cf: { kvs: () => kvs } });
  vm.runInContext(rendered, context);
  return (host, uri, querystring = {}) =>
    context.handler({
      request: { uri, headers: { host: { value: host } }, querystring },
    });
}

for (const [host, namespace, prefix] of [
  ["www.example.org", "prod", ""],
  ["pr-42.preview.example.org", "pr-42", "/pr-42"],
  ["sha-123.builds.example.org", "sha-123", "/sha-123"],
]) {
  test(`${host}: exact redirects win over wildcard entries and keep repeated query values`, async () => {
    const run = router({
      [`r:${namespace}:/old/page/2/`]: "/exact/",
      [`r:${namespace}:/old/page/*`]: "/wildcard/",
      "r:other:/old/page/2/": "/wrong/",
    });
    const response = await run(host, "/old/page/2/", {
      tag: {
        value: "first",
        multiValue: [{ value: "first" }, { value: "second%20value" }],
      },
      flag: { value: "" },
    });
    assert.equal(response.statusCode, 301);
    assert.equal(
      response.headers.location.value,
      "/exact/?tag=first&tag=second%20value&flag=",
    );
  });

  test(`${host}: longest wildcard prefix wins without copying the suffix`, async () => {
    const run = router({
      [`r:${namespace}:/old/*`]: "/broad/",
      [`r:${namespace}:/old/page/*`]: "/narrow/",
    });
    const response = await run(host, "/old/page/23/");
    assert.equal(response.statusCode, 301);
    assert.equal(response.headers.location.value, "/narrow/");
  });

  test(`${host}: wildcard matches only its slash-delimited prefix`, async () => {
    const run = router({ [`r:${namespace}:/old/*`]: "/new/" });
    assert.equal(
      (await run(host, "/older/")).uri,
      `${prefix}/older/index.html`,
    );
    assert.equal((await run(host, "/old")).uri, `${prefix}/old/index.html`);
    assert.equal((await run(host, "/old/")).headers.location.value, "/new/");
  });

  test(`${host}: absent keys preserve page and asset file layout`, async () => {
    const run = router({ "r:other:/current/": "/wrong/" });
    for (const [uri, file] of [
      ["/", "/index.html"],
      ["/current/", "/current/index.html"],
      ["/current", "/current/index.html"],
      ["/v1.0/current", "/v1.0/current/index.html"],
      ["/assets/site.css", "/assets/site.css"],
      ["/current/index.html", "/current/index.html"],
    ]) {
      assert.equal((await run(host, uri)).uri, prefix + file);
    }
  });

  test(`${host}: store failures remain errors`, async () => {
    const failure = new Error("KVS unavailable");
    await assert.rejects(
      router({}, { existsError: failure })(host, "/current/"),
      /KVS unavailable/,
    );
    await assert.rejects(
      router({ [`r:${namespace}:/old/`]: "/new/" }, { getError: failure })(
        host,
        "/old/",
      ),
      /KVS unavailable/,
    );
  });
}

test("apex canonicalization preserves the original path and repeated query values", async () => {
  const response = await router()("example.org", "/old/", {
    tag: { value: "one", multiValue: [{ value: "one" }, { value: "two" }] },
  });
  assert.equal(response.statusCode, 301);
  assert.equal(
    response.headers.location.value,
    "https://www.example.org/old/?tag=one&tag=two",
  );
});

test("apex uses production redirects when it is the canonical host", async () => {
  const run = router(
    { "r:prod:/old/": "/new/" },
    { canonicalHost: "example.org" },
  );
  assert.equal(
    (await run("example.org", "/old/")).headers.location.value,
    "/new/",
  );
});

test("unrelated domains and malformed preview hosts pass through", async () => {
  const run = router();
  for (const host of [
    "pr-42.preview.other.org",
    "pr-42.preview.example.org.evil.test",
    "nested.pr-42.preview.example.org",
    "preview.example.org",
    "unrelated.example.org",
  ]) {
    assert.equal((await run(host, "/current/")).uri, "/current/");
  }
});

test("host selection is case-insensitive", async () => {
  const run = router({ "r:pr-42:/old/": "/new/" });
  assert.equal(
    (await run("PR-42.PREVIEW.EXAMPLE.ORG", "/old/")).headers.location.value,
    "/new/",
  );
});
