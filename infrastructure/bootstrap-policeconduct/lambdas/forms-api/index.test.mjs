import assert from "node:assert/strict";
import test from "node:test";
import { S3Client } from "@aws-sdk/client-s3";

process.env.SENTRY_DSN = "";
process.env.SENTRY_ENVIRONMENT = "";
process.env.SUBMISSIONS_BUCKET = "test-submissions-bucket";
process.env.SUBMISSIONS_KMS_KEY_ID = "test-kms-key";
process.env.DRAFTS_BUCKET = "test-drafts-bucket";
process.env.DRAFTS_KMS_KEY_ID = "test-drafts-kms-key";
process.env.EMAIL_VERIFICATION_FROM_ADDRESS = "noreply@mail.policeconduct.org";
process.env.EMAIL_VERIFICATION_HMAC_SECRET = "test-hmac-secret";

const { __testables, handler } = await import("./index.mjs");

function apiEvent({ method, path, origin, body }) {
  return {
    rawPath: path,
    headers: origin === undefined ? {} : { Origin: origin },
    requestContext: {
      requestId: "req_test",
      http: { method, path, sourceIp: "203.0.113.10", userAgent: "test" },
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

const WRITE_ROUTES = ["/forms/submit", "/forms/draft", "/forms/verify-link"];

const UNTRUSTED_ORIGINS = [
  // No Origin header at all — the curl default, and the bug in INS-21.
  undefined,
  "https://policeconduct.org.attacker.example",
  "https://evil.example",
  // Right host, wrong scheme.
  "http://www.policeconduct.org",
  // Preview pattern must not be satisfiable by a suffix.
  "https://pr-1.preview.policeconduct.org.evil.example",
];

test("sendVerificationEmail sends the expected Resend request", async () => {
  process.env.RESEND_API_KEY = "re_test_123";

  const originalFetch = global.fetch;
  let capturedUrl = "";
  let capturedInit = null;
  global.fetch = async (url, init) => {
    capturedUrl = String(url);
    capturedInit = init;
    return new Response(JSON.stringify({ id: "email_123" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const result = await __testables.sendVerificationEmail({
      formName: "contact",
      origin: "https://www.policeconduct.org",
      submissionId: "sub_123",
      toAddress: "person@example.org",
      token: "verify.token",
      ttlMs: 900000,
    });

    assert.equal(capturedUrl, "https://api.resend.com/emails");
    assert.equal(capturedInit.method, "POST");
    assert.equal(capturedInit.headers.Authorization, "Bearer re_test_123");

    const requestBody = JSON.parse(capturedInit.body);
    assert.equal(
      requestBody.subject,
      "Verify your PoliceConduct.org submission",
    );
    assert.equal(requestBody.from, "noreply@mail.policeconduct.org");
    assert.deepEqual(requestBody.to, ["person@example.org"]);
    assert.match(
      requestBody.text,
      /https:\/\/www\.policeconduct\.org\/verify\/\?token=verify\.token/,
    );
    assert.deepEqual(requestBody.tags, [
      { name: "formName", value: "contact" },
      { name: "submissionId", value: "sub_123" },
      { name: "environment", value: "unknown" },
    ]);
    assert.deepEqual(result, { id: "email_123" });
  } finally {
    global.fetch = originalFetch;
  }
});

test("sendVerificationEmail surfaces Resend API failures", async () => {
  process.env.RESEND_API_KEY = "re_test_123";

  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response(JSON.stringify({ message: "invalid sender" }), {
      status: 422,
      headers: { "content-type": "application/json" },
    });

  try {
    await assert.rejects(
      () =>
        __testables.sendVerificationEmail({
          formName: "contact",
          origin: "https://www.policeconduct.org",
          submissionId: "sub_123",
          toAddress: "person@example.org",
          token: "verify.token",
          ttlMs: 900000,
        }),
      /Resend email send failed \(422\): invalid sender/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("verificationConfig requires RESEND_API_KEY", () => {
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    assert.throws(
      () => __testables.verificationConfig(),
      /Missing RESEND_API_KEY/,
    );
  } finally {
    if (previousKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = previousKey;
    }
  }
});

test("every write route rejects an unverifiable origin with 403", async () => {
  for (const path of WRITE_ROUTES) {
    for (const origin of UNTRUSTED_ORIGINS) {
      const response = await handler(
        apiEvent({
          method: "POST",
          path,
          origin,
          body: {
            formName: "dataSubjectAccessRequest",
            recaptchaToken: "bogus",
            data: { email: "person@example.org" },
          },
        }),
      );

      const label = `${path} origin=${origin ?? "(absent)"}`;
      assert.equal(response.statusCode, 403, `${label} should be rejected`);

      const body = JSON.parse(response.body);
      assert.equal(body.error, "Origin not allowed.", label);
      // The old missing-origin path answered 200 with a message that told the
      // caller their submission had been received. It had not been.
      assert.equal(body.message, undefined, `${label} must not reassure`);
      assert.equal(body.verificationFailureReason, undefined, label);
      // CORS headers must not be echoed to an origin we just refused.
      assert.equal(
        response.headers["access-control-allow-origin"],
        undefined,
        label,
      );
    }
  }
});

test("a rejected write never reaches S3", async () => {
  // The point of the gate is that nothing is persisted, so assert on the
  // storage layer directly rather than on the status code alone. Every write
  // in this Lambda goes through this one client.
  const originalSend = S3Client.prototype.send;
  const commands = [];
  S3Client.prototype.send = async function (command) {
    commands.push(command?.constructor?.name ?? "unknown");
    throw new Error("S3 must not be called for a rejected write");
  };

  try {
    for (const path of WRITE_ROUTES) {
      const response = await handler(
        apiEvent({
          method: "POST",
          path,
          body: { formName: "contact", recaptchaToken: "bogus", data: {} },
        }),
      );
      assert.equal(response.statusCode, 403, path);
    }
    assert.deepEqual(commands, [], "no S3 command should be issued");
  } finally {
    S3Client.prototype.send = originalSend;
  }
});

test("an allowed origin still reaches the submit handler", async () => {
  for (const origin of [
    "https://www.policeconduct.org",
    "https://policeconduct.org",
    "https://pr-42.preview.policeconduct.org",
  ]) {
    const response = await handler(
      apiEvent({
        method: "POST",
        path: "/forms/submit",
        origin,
        // No formName: submitForm's own validation answers, which proves the
        // origin gate passed without needing a live reCAPTCHA assessment.
        body: { recaptchaToken: "bogus", data: {} },
      }),
    );

    assert.equal(response.statusCode, 400, `${origin} should reach submitForm`);
    assert.equal(
      JSON.parse(response.body).error,
      "Missing required formName.",
      origin,
    );
  }
});

test("same-origin GET reads are not gated on Origin", async () => {
  // Browsers omit Origin on same-origin GET. Draft restore and status polling
  // are same-origin GETs from our own pages; gating them breaks real users.
  const draft = await handler(
    apiEvent({ method: "GET", path: "/forms/draft" }),
  );
  assert.equal(draft.statusCode, 200);

  const status = await handler(apiEvent({ method: "GET", path: "/status/" }));
  assert.notEqual(status.statusCode, 403);
});

test("path prefix /api is stripped before route matching", async () => {
  // CloudFront routes /api/* to the Lambda; the gate must see the real path.
  const response = await handler({
    rawPath: "/api/forms/submit",
    headers: {},
    requestContext: {
      requestId: "req_test",
      http: {
        method: "POST",
        path: "/api/forms/submit",
        sourceIp: "203.0.113.10",
      },
    },
    body: JSON.stringify({ formName: "contact", recaptchaToken: "bogus" }),
  });

  assert.equal(response.statusCode, 403);
  assert.equal(JSON.parse(response.body).error, "Origin not allowed.");
});

test("origin header casing does not change the verdict", async () => {
  for (const headerName of ["origin", "Origin", "ORIGIN"]) {
    const response = await handler({
      rawPath: "/forms/submit",
      headers: { [headerName]: "https://www.policeconduct.org" },
      requestContext: {
        requestId: "req_test",
        http: {
          method: "POST",
          path: "/forms/submit",
          sourceIp: "203.0.113.10",
        },
      },
      body: JSON.stringify({ recaptchaToken: "bogus" }),
    });

    assert.notEqual(response.statusCode, 403, `${headerName} should be read`);
  }
});

test("submitForm rejects suspended personnel form names before storing anything", async () => {
  for (const formName of ["personnelNew", "officerEdit"]) {
    const response = await __testables.submitForm(
      {
        requestContext: { http: { sourceIp: "203.0.113.10" } },
        body: JSON.stringify({
          formName,
          recaptchaToken: "token",
          data: { submitterEmail: "person@example.org" },
        }),
      },
      "req_test",
    );

    assert.equal(response.statusCode, 403, `${formName} should be rejected`);
    assert.match(
      JSON.parse(response.body).error,
      /paused community submissions about individual personnel/i,
    );
  }
});

test("suspended personnel form names remain known form names", () => {
  for (const formName of __testables.SUSPENDED_FORM_NAMES) {
    assert.ok(
      __testables.ALLOWED_FORM_NAMES.has(formName),
      `${formName} should stay in ALLOWED_FORM_NAMES so re-enabling is one edit`,
    );
  }
});

test("agency and site-wide form names are not suspended", () => {
  for (const formName of [
    "agencyNew",
    "agencyEdit",
    "reportNew",
    "civilLitigationNew",
    "civilLitigationEdit",
    "contact",
    "volunteer",
    "dataSubjectAccessRequest",
  ]) {
    assert.ok(
      !__testables.SUSPENDED_FORM_NAMES.has(formName),
      `${formName} is out of scope for the personnel UGC suspension`,
    );
  }
});
