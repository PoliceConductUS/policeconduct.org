#!/usr/bin/env node

import process from "node:process";

const DOMAIN_NAME = "mail.policeconduct.org";
const DNS_ZONE_NAME = "policeconduct.org";
const TRACKING_SUBDOMAIN = "links";
const REGION = "us-east-1";
const OPEN_TRACKING_ENABLED = false;
const CLICK_TRACKING_ENABLED = false;
const RESEND_RATE_LIMIT_RETRY_ATTEMPTS = 3;
const RESEND_RATE_LIMIT_RETRY_DELAY_MS = 300;

function trimToNull(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function qualifyRecordName(name, domainName) {
  const normalizedDomain = trimToNull(domainName);
  const normalizedName = trimToNull(name);
  if (!normalizedDomain) {
    throw new Error("Missing domain name");
  }
  if (!normalizedName || normalizedName === "@") {
    return normalizedDomain;
  }
  if (
    normalizedName === normalizedDomain ||
    normalizedName.endsWith(`.${normalizedDomain}`)
  ) {
    return normalizedName;
  }
  return `${normalizedName}.${normalizedDomain}`;
}

function route53ValueForRecord(record) {
  if (
    record &&
    typeof record === "object" &&
    String(record.type || "").toUpperCase() === "MX" &&
    Number.isFinite(Number(record.priority))
  ) {
    return `${Number(record.priority)} ${String(record.value || "").trim()}`;
  }
  return String(record?.value || "").trim();
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildRoute53Records(domain) {
  const records = Array.isArray(domain?.records) ? domain.records : [];
  return records
    .filter((record) => {
      const type = String(record?.type || "").toUpperCase();
      if (!type) {
        return false;
      }
      if (
        record?.record === "Tracking" &&
        !(OPEN_TRACKING_ENABLED || CLICK_TRACKING_ENABLED)
      ) {
        return false;
      }
      return true;
    })
    .map((record, index) => ({
      id: `${String(record?.record || "record").toLowerCase()}-${index}`,
      name: qualifyRecordName(record?.name, DNS_ZONE_NAME),
      ttl: 600,
      type: String(record?.type || "").toUpperCase(),
      values: [route53ValueForRecord(record)],
    }));
}

async function resendRequest(apiKey, path, { method = "GET", body } = {}) {
  for (
    let attempt = 0;
    attempt <= RESEND_RATE_LIMIT_RETRY_ATTEMPTS;
    attempt += 1
  ) {
    const response = await fetch(`https://api.resend.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (response.ok) {
      return payload;
    }

    if (
      response.status === 429 &&
      attempt < RESEND_RATE_LIMIT_RETRY_ATTEMPTS
    ) {
      const retryAfterSeconds = Number(response.headers.get("retry-after"));
      const retryDelayMs =
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds * 1000
          : RESEND_RATE_LIMIT_RETRY_DELAY_MS * (attempt + 1);
      await sleep(retryDelayMs);
      continue;
    }

    let detail = "";
    if (payload && typeof payload === "object") {
      detail =
        payload.message ||
        payload.error ||
        payload.name ||
        JSON.stringify(payload);
    } else if (typeof payload === "string") {
      detail = payload;
    }
    throw new Error(
      `Resend API ${method} ${path} failed (${response.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  throw new Error(`Resend API ${method} ${path} failed after retries`);
}

async function listDomains(apiKey) {
  const payload = await resendRequest(apiKey, "/domains");
  return Array.isArray(payload?.data) ? payload.data : [];
}

async function getDomain(apiKey, domainId) {
  return resendRequest(apiKey, `/domains/${encodeURIComponent(domainId)}`);
}

async function createDomain(apiKey, config) {
  return resendRequest(apiKey, "/domains", {
    method: "POST",
    body: {
      name: config.domainName,
      region: config.region,
    },
  });
}

async function updateDomain(apiKey, config, domainId) {
  const body = {
    clickTracking: config.clickTracking,
    openTracking: config.openTracking,
    trackingSubdomain:
      config.trackingSubdomain || TRACKING_SUBDOMAIN,
  };
  return resendRequest(apiKey, `/domains/${encodeURIComponent(domainId)}`, {
    method: "PATCH",
    body,
  });
}

async function verifyDomain(apiKey, domainId) {
  return resendRequest(
    apiKey,
    `/domains/${encodeURIComponent(domainId)}/verify`,
    { method: "POST" },
  );
}

async function findDomainByName(apiKey, domainName) {
  const domains = await listDomains(apiKey);
  return domains.find((domain) => domain?.name === domainName) || null;
}

async function ensureDomain(config) {
  let existing = await findDomainByName(config.apiKey, config.domainName);
  let created = false;

  if (!existing) {
    existing = await createDomain(config.apiKey, config);
    created = true;
  }

  let domain = await getDomain(config.apiKey, existing.id);
  const needsUpdate =
    Boolean(domain?.open_tracking) !== config.openTracking ||
    Boolean(domain?.click_tracking) !== config.clickTracking ||
    trimToNull(domain?.tracking_subdomain) !== config.trackingSubdomain;

  if (needsUpdate) {
    await updateDomain(config.apiKey, config, domain.id);
    domain = await getDomain(config.apiKey, domain.id);
  }

  if (config.verify) {
    await verifyDomain(config.apiKey, domain.id);
  }

  return {
    created,
    domain,
    verificationTriggered: false,
  };
}

async function verifyExistingDomain(config) {
  const existing = await findDomainByName(config.apiKey, config.domainName);
  if (!existing?.id) {
    throw new Error(`Resend domain not found: ${config.domainName}`);
  }
  const domain = await getDomain(config.apiKey, existing.id);
  await verifyDomain(config.apiKey, existing.id);
  return {
    created: false,
    domain,
    verificationTriggered: true,
  };
}

async function readJsonStdin() {
  if (process.stdin.isTTY) {
    return null;
  }
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
}

function loadConfig() {
  return {
    apiKey: trimToNull(process.env.RESEND_API_KEY_FULL_ACCESS),
    clickTracking: CLICK_TRACKING_ENABLED,
    domainName: DOMAIN_NAME,
    openTracking: OPEN_TRACKING_ENABLED,
    region: REGION,
    trackingSubdomain:
      OPEN_TRACKING_ENABLED || CLICK_TRACKING_ENABLED
        ? TRACKING_SUBDOMAIN
        : null,
  };
}

function validateConfig(config) {
  if (!config.apiKey) {
    throw new Error("Missing RESEND_API_KEY_FULL_ACCESS");
  }
}

function formatTerraformResult(result) {
  return {
    click_tracking: String(Boolean(result.domain?.click_tracking)),
    created: String(Boolean(result.created)),
    domain_id: String(result.domain?.id || ""),
    domain_name: String(result.domain?.name || ""),
    open_tracking: String(Boolean(result.domain?.open_tracking)),
    records_json: JSON.stringify(buildRoute53Records(result.domain)),
    status: String(result.domain?.status || ""),
    tracking_subdomain: String(result.domain?.tracking_subdomain || ""),
  };
}

function parseMode(argv) {
  const apply = argv.includes("--apply");
  const verify = argv.includes("--verify");
  if (apply === verify) {
    throw new Error("Specify exactly one of --apply or --verify");
  }
  return apply ? "apply" : "verify";
}

async function main() {
  const stdin = await readJsonStdin();
  const mode = parseMode(process.argv);
  const config = loadConfig();
  validateConfig(config);
  const result =
    mode === "apply"
      ? await ensureDomain(config)
      : await verifyExistingDomain(config);

  if (stdin) {
    process.stdout.write(`${JSON.stringify(formatTerraformResult(result))}\n`);
    return;
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        created: result.created,
        domain: result.domain,
        route53Records: buildRoute53Records(result.domain),
        verificationTriggered: result.verificationTriggered,
      },
      null,
      2,
    )}\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}

export const __testables = {
  buildRoute53Records,
  findDomainByName,
  formatTerraformResult,
  loadConfig,
  parseMode,
  qualifyRecordName,
  resendRequest,
  route53ValueForRecord,
  verifyExistingDomain,
  updateDomain,
};
