// Usage: npm run secret:set -- [ENVIRONMENT] NAME < file-holding-the-value
// Stores the value read from standard input as a SecureString parameter,
// replacing any stored value. Without ENVIRONMENT the parameter is the shared
// /policeconduct/secrets/NAME. With ENVIRONMENT, which is production or preview,
// it is /policeconduct/ENVIRONMENT/secrets/NAME. The value is never a
// command-line argument, so it stays out of shell history and the process list.
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const [environment, name] = args.length === 2 ? args : [null, args[0]];
if (
  args.length < 1 ||
  args.length > 2 ||
  (environment !== null && !["production", "preview"].includes(environment)) ||
  !/^[A-Z][A-Z0-9_]*$/.test(name ?? "")
) {
  console.error(
    "Usage: npm run secret:set -- [ENVIRONMENT] NAME < file-holding-the-value",
  );
  console.error(
    "NAME is the environment variable name, such as RESEND_API_KEY.",
  );
  console.error(
    "ENVIRONMENT is production or preview. Leave it out for a secret every environment shares.",
  );
  process.exit(1);
}
if (process.stdin.isTTY) {
  console.error(
    "Error: send the value on standard input, from a file or a pipe.",
  );
  process.exit(1);
}

const parameter = environment
  ? `/policeconduct/${environment}/secrets/${name}`
  : `/policeconduct/secrets/${name}`;
// Wait for the whole value. A pipe whose writer has not written yet has nothing
// to read at first, and a single synchronous read fails there.
let input = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) input += chunk;
const value = input.replace(/\r?\n$/, "");
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
