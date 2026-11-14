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
  const releaseKeys = {
    current: "prod-one",
    "current:pr-42": "pr-42-one",
    ...entries,
  };
  const kvs = {
    async exists(key) {
      if (options.existsError) throw options.existsError;
      return Object.hasOwn(releaseKeys, key);
    },
    async get(key) {
      if (options.getError) throw options.getError;
      if (!Object.hasOwn(releaseKeys, key)) throw new Error("Key not found");
      return releaseKeys[key];
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
  ["www.example.org", "prod-one", "/builds/prod-one/static"],
  ["pr-42.preview.example.org", "pr-42-one", "/builds/pr-42-one/static"],
  ["sha-123.builds.example.org", "sha-123", "/builds/sha-123/static"],
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
    { "r:prod-one:/old/": "/new/" },
    { canonicalHost: "example.org" },
  );
  assert.equal(
    (await run("example.org", "/old/")).headers.location.value,
    "/new/",
  );
});

test("unrelated domains and malformed preview hosts cannot read the origin", async () => {
  const run = router();
  for (const host of [
    "pr-42.preview.other.org",
    "pr-42.preview.example.org.evil.test",
    "nested.pr-42.preview.example.org",
    "preview.example.org",
    "unrelated.example.org",
  ]) {
    assert.equal((await run(host, "/current/")).statusCode, 404);
  }
});

test("host selection is case-insensitive", async () => {
  const run = router({ "r:pr-42-one:/old/": "/new/" });
  assert.equal(
    (await run("PR-42.PREVIEW.EXAMPLE.ORG", "/old/")).headers.location.value,
    "/new/",
  );
});

for (const [host, releaseId] of [
  ["www.example.org", "prod-one"],
  ["pr-42.preview.example.org", "pr-42-one"],
]) {
  test(
    host + " selects overrides without exposing release data or bodies",
    async () => {
      const run = router({ ["o:" + releaseId + ":/profile/index.html"]: "1" });
      for (const path of ["/profile/", "/profile", "/profile/index.html"]) {
        assert.equal(
          (await run(host, path)).uri,
          "/builds/" + releaseId + "/override/profile/index.html",
        );
      }
      for (const path of [
        "/builds/" + releaseId + "/data/profile/index.json",
        "/data/dynamic.json",
        "/evidence/body.txt",
        "/builds/" + releaseId + "/override/profile/index.html",
        "/../data/dynamic.json",
        "/%2e%2e/data/dynamic.json",
      ]) {
        assert.equal((await run(host, path)).statusCode, 404, path);
      }
    },
  );
}
test("promotion changes the served cache key without leaking prior overrides", async () => {
  const entries = { "o:prod-one:/index.html": "1" };
  assert.equal(
    (await router(entries)("www.example.org", "/")).uri,
    "/builds/prod-one/override/index.html",
  );
  assert.equal(
    (await router({ ...entries, current: "prod-two" })("www.example.org", "/"))
      .uri,
    "/builds/prod-two/static/index.html",
  );
});

test("the private snapshot pins the served release, and a publication clears cached versions", async () => {
  const releaseId = "prod-2bb8ca63-58aa-4854-b472-866609c1e02f";
  let current = releaseId;
  const entries = { current };
  const savedPaths = new Set();
  const cache = new Map();
  const origin = new Map([
    ["/builds/" + releaseId + "/static/profile/index.html", "original"],
  ]);
  const override = "/builds/" + releaseId + "/override/profile/index.html";
  const service =
    await import("../infrastructure/bootstrap-policeconduct/lambdas/release-api/service.mjs");
  const invoke = service.createHandler({
    privateBucket: "private-production",
    readCurrent: async () => current,
    verifyOverride: async (key) => assert.ok(origin.has("/" + key)),
    releasePage: async (key) => {
      savedPaths.add(key);
      entries[key] = "1";
    },
    invalidate: async (paths) => {
      for (const path of paths) cache.delete(path);
      return "refresh-id";
    },
  });
  const fetchPage = async () => {
    const key = (await router(entries)("www.example.org", "/profile/")).uri;
    if (!cache.has(key)) cache.set(key, origin.get(key));
    return cache.get(key);
  };
  const snapshot = await invoke({ operation: "release-snapshot" });
  assert.deepEqual(snapshot, {
    releaseId,
    roster: {
      bucket: "private-production",
      key: "builds/" + releaseId + "/data/dynamic.json",
    },
  });
  assert.equal(await fetchPage(), "original");
  for (const body of ["first update", "second update"]) {
    origin.set(override, body);
    assert.deepEqual(
      await invoke({ operation: "publish-page", releaseId, path: "/profile/" }),
      { invalidationId: "refresh-id" },
    );
    assert.equal(await fetchPage(), body);
  }
  current = "prod-56f31b84-78a1-4a33-8102-05810a2acbbe";
  await assert.rejects(
    invoke({ operation: "publish-page", releaseId, path: "/profile/" }),
    /current production release/,
  );
  assert.equal(savedPaths.size, 1);
});
