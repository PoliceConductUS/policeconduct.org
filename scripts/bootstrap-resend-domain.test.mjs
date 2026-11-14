import assert from "node:assert/strict";
import test from "node:test";

import { __testables } from "./bootstrap-resend-domain.mjs";

test("buildRoute53Records qualifies names and formats MX priorities", () => {
  const records = __testables.buildRoute53Records({
    name: "mail.policeconduct.org",
    open_tracking: false,
    click_tracking: true,
    records: [
      {
        name: "send.mail",
        priority: 10,
        record: "SPF",
        type: "MX",
        value: "feedback-smtp.us-east-1.amazonses.com",
      },
      {
        name: "resend._domainkey.mail",
        record: "DKIM",
        type: "TXT",
        value: "p=abc123",
      },
      {
        name: "links.mail.policeconduct.org",
        record: "Tracking",
        type: "CNAME",
        value: "links1.resend-dns.com",
      },
    ],
  });

  assert.deepEqual(records, [
    {
      id: "spf-0",
      name: "send.mail.policeconduct.org",
      ttl: 600,
      type: "MX",
      values: ["10 feedback-smtp.us-east-1.amazonses.com"],
    },
    {
      id: "dkim-1",
      name: "resend._domainkey.mail.policeconduct.org",
      ttl: 600,
      type: "TXT",
      values: ["p=abc123"],
    },
  ]);
});

test("loadConfig reads the api key from environment and uses fixed values", () => {
  const previousFullAccessKey = process.env.RESEND_API_KEY_FULL_ACCESS;
  process.env.RESEND_API_KEY_FULL_ACCESS = "re_test_full_access_123";

  try {
    const config = __testables.loadConfig(false);

    assert.equal(config.apiKey, "re_test_full_access_123");
    assert.equal(config.domainName, "mail.policeconduct.org");
  } finally {
    if (previousFullAccessKey === undefined) {
      delete process.env.RESEND_API_KEY_FULL_ACCESS;
    } else {
      process.env.RESEND_API_KEY_FULL_ACCESS = previousFullAccessKey;
    }
  }
});

test("resendRequest retries 429 responses", async () => {
  const originalFetch = global.fetch;
  let attempts = 0;

  global.fetch = async () => {
    attempts += 1;
    if (attempts < 3) {
      return new Response(
        JSON.stringify({
          message:
            "Too many requests. You can only make 5 requests per second.",
        }),
        {
          status: 429,
          headers: {
            "content-type": "application/json",
            "retry-after": "0",
          },
        },
      );
    }

    return new Response(JSON.stringify({ data: [{ id: "domain_123" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const payload = await __testables.resendRequest("re_test", "/domains");
    assert.equal(attempts, 3);
    assert.deepEqual(payload, { data: [{ id: "domain_123" }] });
  } finally {
    global.fetch = originalFetch;
  }
});

test("parseMode requires exactly one explicit mode", () => {
  assert.equal(__testables.parseMode(["node", "script", "--read"]), "read");
  assert.equal(__testables.parseMode(["node", "script", "--apply"]), "apply");
  assert.equal(__testables.parseMode(["node", "script", "--verify"]), "verify");
  for (const mode of ["--apply", "--verify"]) {
    assert.throws(
      () => __testables.parseMode(["node", "script", "--read", mode]),
      /Specify exactly one/,
    );
  }
  assert.throws(
    () => __testables.parseMode(["node", "script"]),
    /Specify exactly one of --read, --apply or --verify/,
  );
  assert.throws(
    () => __testables.parseMode(["node", "script", "--apply", "--verify"]),
    /Specify exactly one of --read, --apply or --verify/,
  );
});

test("verifyExistingDomain does not patch domain settings", async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url, init = {}) => {
    const method = init.method || "GET";
    calls.push({ method, url: String(url) });

    if (method === "GET" && String(url).endsWith("/domains")) {
      return new Response(
        JSON.stringify({
          data: [{ id: "domain_123", name: "mail.policeconduct.org" }],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    if (method === "GET" && String(url).endsWith("/domains/domain_123")) {
      return new Response(
        JSON.stringify({ id: "domain_123", name: "mail.policeconduct.org" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    if (
      method === "POST" &&
      String(url).endsWith("/domains/domain_123/verify")
    ) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error(`Unexpected call: ${method} ${String(url)}`);
  };

  try {
    const result = await __testables.verifyExistingDomain({
      apiKey: "re_test_full_access",
      domainName: "mail.policeconduct.org",
    });

    assert.equal(result.verificationTriggered, true);
    assert.deepEqual(
      calls.map(
        ({ method, url }) =>
          `${method} ${url.replace("https://api.resend.com", "")}`,
      ),
      [
        "GET /domains",
        "GET /domains/domain_123",
        "POST /domains/domain_123/verify",
      ],
    );
  } finally {
    global.fetch = originalFetch;
  }
});

// Exercise the exact Terraform program through its CLI and JSON stdin contract.
// The child has a fake key and a fetch replacement: no provider access is needed.
test("Terraform lookup is GET-only, including missing domains and tracking drift", async () => {
  const { readFile, mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join, resolve } = await import("node:path");
  const { spawnSync } = await import("node:child_process");
  const root = new URL("../", import.meta.url);
  const terraform = await readFile(
    new URL("infrastructure/bootstrap-policeconduct/main.tf", root),
    "utf8",
  );
  const program = terraform.match(
    /data "external" "resend_domain"\s*\{\s*program\s*=\s*\[([\s\S]*?)\]/,
  )?.[1];
  assert.ok(program);
  const args = [...program.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(args, [
    "node",
    "${path.module}/../../scripts/bootstrap-resend-domain.mjs",
    "--read",
  ]);
  const directory = await mkdtemp(join(tmpdir(), "resend-read-test-"));
  try {
    const mock = resolve(directory, "fetch.mjs");
    await writeFile(
      mock,
      `
      import assert from 'node:assert/strict';
      let calls = 0;
      globalThis.fetch = async (url, init) => {
        assert.equal(init.method, 'GET', 'Terraform must never write to Resend');
        calls++;
        const domain = {id: 'test-domain', name: 'mail.policeconduct.org',
          click_tracking: true, open_tracking: true, tracking_subdomain: 'different',
          records: [{record: 'DKIM', type: 'TXT', name: 'resend._domainkey.mail', value: 'test-value'}]};
        const data = url.endsWith('/domains')
          ? {data: process.env.TEST_MISSING === 'yes' ? [] : [domain]} : domain;
        return new Response(JSON.stringify(data), {headers: {'content-type': 'application/json'}});
      };
      process.on('exit', () => assert.equal(calls, process.env.TEST_MISSING === 'yes' ? 1 : 2));
    `,
    );
    for (const missing of [false, true]) {
      const result = spawnSync(
        process.execPath,
        [
          "--import",
          mock,
          new URL("scripts/bootstrap-resend-domain.mjs", root).pathname,
          args[2],
        ],
        {
          input: "{}",
          encoding: "utf8",
          env: {
            ...process.env,
            RESEND_API_KEY_FULL_ACCESS: "test-only",
            TEST_MISSING: missing ? "yes" : "no",
          },
        },
      );
      assert.equal(result.status, missing ? 1 : 0, result.stderr);
      if (missing) {
        assert.match(result.stderr, /Resend domain not found/);
        assert.equal(result.stdout, "");
      } else {
        const output = JSON.parse(result.stdout);
        assert.equal(output.created, "false");
        assert.equal(output.click_tracking, "true");
        assert.equal(output.tracking_subdomain, "different");
        assert.equal(
          JSON.parse(output.records_json)[0].values[0],
          "test-value",
        );
        assert.ok(
          Object.values(output).every((value) => typeof value === "string"),
        );
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("apply preserves enabled tracking and a custom subdomain without PATCH or verification", async () => {
  const originalFetch = global.fetch;
  const calls = [];
  const domain = {
    id: "domain_123",
    name: "mail.policeconduct.org",
    open_tracking: true,
    click_tracking: true,
    tracking_subdomain: "custom",
  };
  global.fetch = async (url, init) => {
    calls.push(init.method);
    assert.equal(init.method, "GET");
    return new Response(
      JSON.stringify(url.endsWith("/domains") ? { data: [domain] } : domain),
      { headers: { "content-type": "application/json" } },
    );
  };
  try {
    await __testables.ensureDomain({
      ...__testables.loadConfig(),
      apiKey: "test-only",
    });
    assert.deepEqual(calls, ["GET", "GET"]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("apply creates a missing domain without changing settings or verifying", async () => {
  const originalFetch = global.fetch;
  const calls = [];
  const domain = { id: "domain_123", name: "mail.policeconduct.org" };
  global.fetch = async (url, init) => {
    calls.push(`${init.method} ${new URL(url).pathname}`);
    if (init.method === "POST") {
      assert.equal(new URL(url).pathname, "/domains");
      assert.deepEqual(JSON.parse(init.body), {
        name: "mail.policeconduct.org",
        region: "us-east-1",
      });
    } else {
      assert.equal(init.method, "GET");
    }
    return new Response(
      JSON.stringify(
        init.method === "GET" && url.endsWith("/domains")
          ? { data: [] }
          : domain,
      ),
      { headers: { "content-type": "application/json" } },
    );
  };
  try {
    const result = await __testables.ensureDomain({
      ...__testables.loadConfig(),
      apiKey: "test-only",
    });
    assert.equal(result.created, true);
    assert.equal(result.verificationTriggered, false);
    assert.deepEqual(calls, [
      "GET /domains",
      "POST /domains",
      "GET /domains/domain_123",
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});
