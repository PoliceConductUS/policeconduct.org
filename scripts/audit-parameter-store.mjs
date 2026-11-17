// Fails unless every Parameter Store parameter under /policeconduct/ is a
// SecureString or is named in PLAIN_STRING_PARAMETERS. It reads names and types
// only; no value is fetched.
import { execFileSync } from "node:child_process";

// Parameters that hold no secret and may stay a plain String. Exact names only.
const PLAIN_STRING_PARAMETERS = new Set([
  "/policeconduct/config/default/GOOGLE_CLOUD_PROJECT",
]);

const parameters = JSON.parse(
  execFileSync(
    "aws",
    [
      "ssm",
      "describe-parameters",
      "--region",
      process.env.PARAMETER_STORE_REGION || "us-east-1",
      "--parameter-filters",
      "Key=Path,Option=Recursive,Values=/policeconduct",
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
    "Error: no parameters found under /policeconduct/ in Parameter Store. Check AWS_PROFILE.",
  );
  process.exit(1);
}

const plain = parameters.filter(
  ([name, type]) =>
    type !== "SecureString" && !PLAIN_STRING_PARAMETERS.has(name),
);
for (const [name, type] of plain) {
  console.error(
    `Error: ${name} in Parameter Store must be a SecureString, but its type is '${type}'.`,
  );
}
if (plain.length > 0) {
  console.error(
    "Store a secret again with `npm run secret:set`. If the parameter holds no secret, add its exact name to PLAIN_STRING_PARAMETERS in scripts/audit-parameter-store.mjs.",
  );
  process.exit(1);
}

console.log(
  `Parameter Store: ${parameters.length} parameter(s) under /policeconduct/ checked.`,
);
