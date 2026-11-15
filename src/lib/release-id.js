import { execFileSync } from "node:child_process";

export const releaseId =
  process.env.RELEASE_ID ||
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
