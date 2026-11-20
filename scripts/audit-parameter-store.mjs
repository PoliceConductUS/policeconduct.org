// Fails unless every Parameter Store parameter under /policeconduct.org/ is a
// SecureString. This repo keeps only secrets there. It reads names and types
// only; no value is fetched.
import { execFileSync } from "node:child_process";

const parameters = JSON.parse(
  execFileSync(
    "aws",
    [
      "ssm",
      "describe-parameters",
      "--region",
      process.env.PARAMETER_STORE_REGION || "us-east-1",
      "--parameter-filters",
      "Key=Path,Option=Recursive,Values=/policeconduct.org",
      "--query",
      "Parameters[].[Name,Type]",
      "--output",
      "json",
    ],
    { encoding: "utf8" },
  ),
);

if (parameters.length === 0) {
  console.error(
    "Error: no parameters found under /policeconduct.org/ in Parameter Store. Check AWS_PROFILE.",
  );
  process.exit(1);
}

const plain = parameters.filter(([, type]) => type !== "SecureString");
for (const [name, type] of plain) {
  console.error(
    `Error: ${name} in Parameter Store must be a SecureString, but its type is '${type}'.`,
  );
}
if (plain.length > 0) {
  console.error("Store the secret again with `npm run secret:set`.");
  process.exit(1);
}

console.log(
  `Parameter Store: ${parameters.length} parameter(s) under /policeconduct.org/ checked.`,
);
