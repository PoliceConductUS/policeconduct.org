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
    assert.equal(config.clickTracking, false);
    assert.equal(config.openTracking, false);
    assert.equal(config.trackingSubdomain, null);
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

test("updateDomain sends an explicit tracking-disabled payload", async () => {
  const originalFetch = global.fetch;
  let capturedBody = null;

  global.fetch = async (_url, init) => {
    capturedBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ id: "domain_123" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    await __testables.updateDomain(
      "re_test_full_access",
      {
        clickTracking: false,
        openTracking: false,
        trackingSubdomain: null,
      },
      "domain_123",
    );

    assert.deepEqual(capturedBody, {
      clickTracking: false,
      openTracking: false,
      trackingSubdomain: "links",
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("parseMode requires exactly one explicit mode", () => {
  assert.equal(__testables.parseMode(["node", "script", "--apply"]), "apply");
  assert.equal(__testables.parseMode(["node", "script", "--verify"]), "verify");
  assert.throws(
    () => __testables.parseMode(["node", "script"]),
    /Specify exactly one of --apply or --verify/,
  );
  assert.throws(
    () => __testables.parseMode(["node", "script", "--apply", "--verify"]),
    /Specify exactly one of --apply or --verify/,
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
