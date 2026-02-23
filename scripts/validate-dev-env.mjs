import path from "node:path";
import { fileURLToPath } from "node:url";
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
