import assert from "node:assert/strict";
import test from "node:test";

process.env.SENTRY_DSN = "";
process.env.SENTRY_ENVIRONMENT = "";
process.env.SUBMISSIONS_BUCKET = "test-submissions-bucket";
process.env.SUBMISSIONS_KMS_KEY_ID = "test-kms-key";
process.env.EMAIL_VERIFICATION_FROM_ADDRESS =
  "noreply@mail.policeconduct.org";
process.env.EMAIL_VERIFICATION_HMAC_SECRET = "test-hmac-secret";

const { __testables } = await import("./index.mjs");

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
