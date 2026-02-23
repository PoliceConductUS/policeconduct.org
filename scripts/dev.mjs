import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import dotenv from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envFiles = [".env", ".env-recaptcha", ".env-policeconduct"];

for (const envFile of envFiles) {
  dotenv.config({
    path: path.join(repoRoot, envFile),
    override: true,
  });
}

const formsApiProxyTarget = (process.env.FORMS_API_PROXY_TARGET || "").trim();
if (formsApiProxyTarget.length === 0) {
  console.error(
    "Dev startup failed: missing FORMS_API_PROXY_TARGET (expected preview forms API URL).",
  );
  process.exit(1);
}
if (!/^https?:\/\//.test(formsApiProxyTarget)) {
  console.error(
    "Dev startup failed: FORMS_API_PROXY_TARGET must be an absolute http(s) URL.",
  );
  process.exit(1);
}
process.env.FORMS_API_PROXY_TARGET = formsApiProxyTarget;

const requiredVars = ["RECAPTCHA_SITE_KEY"];
const missingVars = requiredVars.filter((name) => {
  const value = process.env[name];
  return typeof value !== "string" || value.trim() === "";
});

if (missingVars.length > 0) {
  console.error(
    "Dev startup failed: missing required environment variable(s):",
  );
  for (const name of missingVars) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

const args = process.argv.slice(2);
const child = spawn("astro", ["dev", ...args], {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
