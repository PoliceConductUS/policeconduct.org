// Usage: npm run secret:set -- NAME < file-holding-the-value
// Stores the value read from standard input as the SecureString parameter
// /policeconduct/secrets/NAME, replacing any stored value. The value is never a
// command-line argument, so it stays out of shell history and the process list.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const names = process.argv.slice(2);
if (names.length !== 1 || !/^[A-Z][A-Z0-9_]*$/.test(names[0])) {
  console.error("Usage: npm run secret:set -- NAME < file-holding-the-value");
  console.error(
    "NAME is the environment variable name, such as RESEND_API_KEY.",
  );
  process.exit(1);
}
if (process.stdin.isTTY) {
  console.error(
    "Error: send the value on standard input, from a file or a pipe.",
  );
  process.exit(1);
}

const parameter = `/policeconduct/secrets/${names[0]}`;
const value = readFileSync(0, "utf8").replace(/\r?\n$/, "");
if (!value) {
  console.error(`Error: no value was given for ${parameter}.`);
  process.exit(1);
}

execFileSync(
  "aws",
  [
    "ssm",
    "put-parameter",
    "--region",
    process.env.PARAMETER_STORE_REGION || "us-east-1",
    "--name",
    parameter,
    "--type",
    "SecureString",
    "--overwrite",
    "--value",
    "file:///dev/stdin",
  ],
  { input: value, stdio: ["pipe", "ignore", "inherit"] },
);
console.log(`Stored ${parameter} as a SecureString.`);
