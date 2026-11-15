import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const pr = process.env.PR_NUMBER;
if (pr && !/^[1-9]\d*$/.test(pr)) throw new Error("Invalid PR_NUMBER");
const releaseId = (pr ? "pr-" + pr : "prod") + "-" + randomUUID();
const options = {
  stdio: "inherit",
  env: { ...process.env, RELEASE_ID: releaseId },
};

rmSync(".release/id", { force: true });
rmSync(".release/data", { recursive: true, force: true });
mkdirSync(".release", { recursive: true });
execFileSync("npm", ["run", "build:site"], options);
if (pr) writeFileSync("dist/robots.txt", "User-agent: *\nDisallow: /\n");
execFileSync(process.execPath, ["scripts/write-release-news.mjs"], options);
execFileSync(
  process.execPath,
  ["scripts/release-files.mjs", "--record", releaseId],
  options,
);
writeFileSync(".release/id", releaseId + "\n");
console.log("Built release " + releaseId);
