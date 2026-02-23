import { spawn } from "node:child_process";
import net from "node:net";

const lambdaHost = process.env.FORMS_LAMBDA_LOCAL_HOST || "127.0.0.1";
const lambdaPort = Number(process.env.FORMS_LAMBDA_LOCAL_PORT || "8787");
const siteHost = process.env.SITE_DEV_HOST || "127.0.0.1";
const sitePort = Number(process.env.SITE_DEV_PORT || "4321");

const lambdaBaseUrl = `http://${lambdaHost}:${lambdaPort}`;
const siteBaseUrl = `http://${siteHost}:${sitePort}`;

function startProcess(cmd, args, name, env = process.env) {
  const child = spawn(cmd, args, {
    env,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (code !== 0 && signal == null) {
      console.error(`${name} exited with code ${code}`);
    }
  });

  return child;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessRunning(child) {
  return child.exitCode === null && child.signalCode === null;
}

async function waitForPort(host, port, timeoutMs, name, child = null) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (child && !isProcessRunning(child)) {
      throw new Error(`${name} exited before becoming ready`);
    }
    try {
      await new Promise((resolve, reject) => {
        const socket = net.connect({ host, port }, () => {
          socket.end();
          resolve();
        });
        socket.on("error", reject);
      });
      return;
    } catch (_error) {
      // Retry until timeout.
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${name} on ${host}:${port}`);
}

async function waitForUrl(url, timeoutMs, name) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.status < 500) {
        return;
      }
    } catch (_error) {
      // Retry until timeout.
    }
    await sleep(400);
  }
  throw new Error(`Timed out waiting for ${name} at ${url}`);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  let body = null;
  try {
    body = await response.json();
  } catch (_error) {
    body = null;
  }
  return { status: response.status, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runSmokeChecks() {
  const draftCreate = await requestJson(`${lambdaBaseUrl}/forms/draft`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      data: { firstName: "Test", email: "test@example.org" },
    }),
  });
  assert(draftCreate.status === 200, "POST /forms/draft should return 200");
  assert(
    typeof draftCreate.body?.draftId === "string" &&
      draftCreate.body.draftId.length > 0,
    "POST /forms/draft should return draftId",
  );
  const draftId = draftCreate.body.draftId;

  const draftRead = await requestJson(
    `${lambdaBaseUrl}/forms/draft?draftId=${encodeURIComponent(draftId)}`,
    { method: "GET" },
  );
  assert(draftRead.status === 200, "GET /forms/draft should return 200");
  assert(
    draftRead.body?.data?.email === "test@example.org",
    "GET /forms/draft should return saved data",
  );

  const submitMissingForm = await requestJson(`${lambdaBaseUrl}/forms/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data: { foo: "bar" } }),
  });
  assert(
    submitMissingForm.status === 400,
    "POST /forms/submit missing formName should return 400",
  );

  const submitUnsupportedForm = await requestJson(
    `${lambdaBaseUrl}/forms/submit`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        formName: "not-allowed-form",
        recaptchaToken: "fake-token",
        data: { foo: "bar" },
      }),
    },
  );
  assert(
    submitUnsupportedForm.status === 400,
    "POST /forms/submit unsupported formName should return 400",
  );

  const contactPage = await fetch(`${siteBaseUrl}/about/contact/`);
  assert(
    contactPage.status === 200,
    "GET /about/contact/ should return 200 in dev",
  );
}

async function main() {
  const lambdaEnv = {
    ...process.env,
    FORMS_LAMBDA_LOCAL_HOST: lambdaHost,
    FORMS_LAMBDA_LOCAL_PORT: String(lambdaPort),
  };
  const siteEnv = {
    ...process.env,
    HOST: siteHost,
    PORT: String(sitePort),
  };

  const lambda = startProcess(
    "node",
    ["scripts/run-forms-lambda-local.mjs"],
    "forms lambda local",
    lambdaEnv,
  );
  const site = startProcess(
    "npm",
    ["run", "dev", "--", "--host", siteHost, "--port", String(sitePort)],
    "astro dev",
    siteEnv,
  );

  const cleanup = () => {
    if (!lambda.killed) {
      lambda.kill("SIGTERM");
    }
    if (!site.killed) {
      site.kill("SIGTERM");
    }
  };

  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(143);
  });

  try {
    await waitForPort(lambdaHost, lambdaPort, 45000, "forms lambda", lambda);
    await waitForUrl(
      `${lambdaBaseUrl}/forms/draft`,
      15000,
      "forms lambda HTTP",
    );
    await waitForUrl(`${siteBaseUrl}/`, 45000, "astro dev server");
    await runSmokeChecks();
    console.log("forms local smoke checks passed");
  } finally {
    cleanup();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
