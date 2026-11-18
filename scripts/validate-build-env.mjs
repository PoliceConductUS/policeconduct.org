import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envFiles = [".env"];

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

if (process.env.TZ !== "UTC") {
  console.error(
    `Build failed: TZ must be UTC so builds and checks format dates in the same time zone (got ${process.env.TZ || "unset"}). Run the build through npm.`,
  );
  process.exit(1);
}

if (missingVars.length > 0) {
  console.error("Build failed: missing required environment variable(s):");
  for (const name of missingVars) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}
