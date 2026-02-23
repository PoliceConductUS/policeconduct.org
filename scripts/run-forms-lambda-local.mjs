import http from "node:http";
import { handler } from "../infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs";

const host = process.env.FORMS_LAMBDA_LOCAL_HOST || "127.0.0.1";
const port = Number(process.env.FORMS_LAMBDA_LOCAL_PORT || "8787");
const REQUIRED_ENV_VARS = [
  "DRAFTS_BUCKET",
  "DRAFTS_KMS_KEY_ID",
  "SUBMISSIONS_BUCKET",
  "SUBMISSIONS_KMS_KEY_ID",
  "RECAPTCHA_PROJECT_ID",
  "RECAPTCHA_SITE_KEY",
  "RECAPTCHA_SERVICE_ACCOUNT_EMAIL",
  "RECAPTCHA_WIF_PROVIDER_RESOURCE_NAME",
  "RECAPTCHA_WIF_AUDIENCE",
];

function validateRequiredEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter((name) => {
    const value = process.env[name];
    return typeof value !== "string" || value.trim() === "";
  });

  if (missing.length > 0) {
    console.error(
      `forms-api local lambda missing required env vars:\n- ${missing.join("\n- ")}`,
    );
    process.exit(1);
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function toQueryParams(url) {
  const result = {};
  for (const [key, value] of url.searchParams.entries()) {
    result[key] = value;
  }
  return Object.keys(result).length > 0 ? result : null;
}

validateRequiredEnvVars();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${host}:${port}`);
    const body = await readRequestBody(req);
    const sourceIp =
      req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    const event = {
      version: "2.0",
      routeKey: "$default",
      rawPath: url.pathname,
      rawQueryString: url.search ? url.search.slice(1) : "",
      queryStringParameters: toQueryParams(url),
      headers: Object.fromEntries(
        Object.entries(req.headers).map(([k, v]) => [
          k,
          Array.isArray(v) ? v.join(",") : (v ?? ""),
        ]),
      ),
      requestContext: {
        http: {
          method: (req.method || "GET").toUpperCase(),
          path: url.pathname,
          sourceIp,
          userAgent: req.headers["user-agent"] || "",
        },
      },
      body: body.length > 0 ? body : null,
      isBase64Encoded: false,
    };

    const lambdaResponse = await handler(event);
    const statusCode = Number(lambdaResponse?.statusCode || 200);
    const headers = lambdaResponse?.headers || {};
    let responseBody = lambdaResponse?.body ?? "";

    if (typeof responseBody !== "string") {
      responseBody = JSON.stringify(responseBody);
    }

    for (const [name, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        res.setHeader(name, String(value));
      }
    }
    res.statusCode = statusCode;
    res.end(responseBody);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Local lambda runner failed.",
      }),
    );
  }
});

server.listen(port, host, () => {
  console.log(`forms-api local lambda listening on http://${host}:${port}`);
});
