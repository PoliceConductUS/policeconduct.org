import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const pr = process.env.PR_NUMBER;
if (pr && !/^[1-9]\d*$/.test(pr)) throw new Error("Invalid PR_NUMBER");
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const branch = execFileSync("git", ["branch", "--show-current"], {
  encoding: "utf8",
}).trim();
const releaseId = commit;
if (process.env.RELEASE_ID && process.env.RELEASE_ID !== commit)
  throw new Error("Deployment folder must equal the current commit hash");
if (
  execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
    encoding: "utf8",
  }).trim()
)
  throw new Error("Deployment requires a clean repository");
const options = {
  stdio: "inherit",
  env: { ...process.env, RELEASE_ID: releaseId },
};

rmSync(".release/id", { force: true });
rmSync(".release/data", { recursive: true, force: true });
mkdirSync(".release", { recursive: true });
writeFileSync(
  ".release/source.json",
  JSON.stringify({ commit, branch, pr: pr || null }),
);
execFileSync("npm", ["run", "build:site"], options);
if (pr || process.env.PREVIEW_NAME)
  writeFileSync("dist/robots.txt", "User-agent: *\nDisallow: /\n");
execFileSync(process.execPath, ["scripts/write-release-news.mjs"], options);
execFileSync(
  process.execPath,
  ["scripts/release-files.mjs", "--record", releaseId],
  options,
);
writeFileSync(".release/id", releaseId + "\n");
console.log("Built release " + releaseId);
