import { execFileSync } from "node:child_process";
import { resolveTerraformEnv } from "./terraform-outputs.mjs";

const [operation, folder] = process.argv.slice(2);
if (
  !["promote", "delete"].includes(operation) ||
  !folder ||
  folder === "." ||
  folder === ".." ||
  /[\\/]/.test(folder) ||
  Array.from(folder).some(
    (character) =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
  )
)
  throw new Error("Expected promote or delete and one folder name");
resolveTerraformEnv([
  "S3_BUCKET",
  "RELEASE_DATA_BUCKET",
  "KVS_ARN",
  // scripts/promote.sh also invalidates the CloudFront distribution.
  ...(operation === "promote" ? ["CLOUDFRONT_DIST_ID"] : []),
]);
const { S3_BUCKET, RELEASE_DATA_BUCKET, KVS_ARN } = process.env;
if (!S3_BUCKET || !RELEASE_DATA_BUCKET || !KVS_ARN)
  throw new Error("Missing production bucket/store configuration");
const aws = (args) =>
  JSON.parse(
    execFileSync("aws", [...args, "--output", "json"], { encoding: "utf8" }),
  );
if (operation === "promote") {
  execFileSync("bash", ["scripts/promote.sh", folder], { stdio: "inherit" });
} else {
  const { Value } = aws([
    "cloudfront-keyvaluestore",
    "get-key",
    "--kvs-arn",
    KVS_ARN,
    "--key",
    "current",
  ]);
  if (typeof Value !== "string" || !Value)
    throw new Error("Could not read the live production folder");
  if (Value === folder)
    throw new Error("Cannot delete the active production folder");
  const keys = [];
  let token;
  do {
    const page = aws([
      "cloudfront-keyvaluestore",
      "list-keys",
      "--kvs-arn",
      KVS_ARN,
      "--no-paginate",
      ...(token ? ["--next-token", token] : []),
    ]);
    for (const { Key } of page.Items ?? []) {
      if (Key.startsWith(`r:${folder}:/`) || Key.startsWith(`o:${folder}:/`))
        keys.push({ Key });
    }
    token = page.NextToken;
  } while (token);
  for (let offset = 0; offset < keys.length; offset += 50) {
    const { ETag } = aws([
      "cloudfront-keyvaluestore",
      "describe-key-value-store",
      "--kvs-arn",
      KVS_ARN,
    ]);
    aws([
      "cloudfront-keyvaluestore",
      "update-keys",
      "--cli-input-json",
      JSON.stringify({
        KvsARN: KVS_ARN,
        IfMatch: ETag,
        Deletes: keys.slice(offset, offset + 50),
      }),
    ]);
  }
  for (const path of [
    `s3://${S3_BUCKET}/${folder}/`,
    `s3://${RELEASE_DATA_BUCKET}/builds/${folder}/`,
  ])
    execFileSync(
      "aws",
      ["s3", "rm", path, "--recursive", "--only-show-errors"],
      { stdio: "inherit" },
    );
}
