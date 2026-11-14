import { execFileSync } from "node:child_process";

const { PR_NUMBER, S3_BUCKET_PREVIEW, KVS_ARN_PREVIEW } = process.env;
if (
  !/^[1-9]\d*$/.test(PR_NUMBER ?? "") ||
  !S3_BUCKET_PREVIEW ||
  !KVS_ARN_PREVIEW
) {
  throw new Error("Missing preview configuration or invalid PR number");
}
const aws = (args) =>
  execFileSync("aws", [...args, "--output", "json"], { encoding: "utf8" });
const namespace = "pr-" + PR_NUMBER;
const releases = new Set();
let token;
do {
  const args = [
    "s3api",
    "list-objects-v2",
    "--bucket",
    S3_BUCKET_PREVIEW,
    "--prefix",
    "builds/" + namespace + "-",
    "--delimiter",
    "/",
    "--no-paginate",
  ];
  if (token) args.push("--continuation-token", token);
  const page = JSON.parse(aws(args));
  for (const { Prefix } of page.CommonPrefixes ?? []) releases.add(Prefix);
  token = page.NextContinuationToken;
} while (token);

const deletes = [];
do {
  const args = [
    "cloudfront-keyvaluestore",
    "list-keys",
    "--kvs-arn",
    KVS_ARN_PREVIEW,
    "--no-paginate",
  ];
  if (token) args.push("--next-token", token);
  const page = JSON.parse(aws(args));
  for (const { Key } of page.Items ?? []) {
    if (
      Key === "current:" + namespace ||
      Key.startsWith("r:" + namespace + "-") ||
      Key.startsWith("o:" + namespace + "-")
    )
      deletes.push({ Key });
  }
  token = page.NextToken;
} while (token);
for (let offset = 0; offset < deletes.length; offset += 50) {
  const { ETag } = JSON.parse(
    aws([
      "cloudfront-keyvaluestore",
      "describe-key-value-store",
      "--kvs-arn",
      KVS_ARN_PREVIEW,
    ]),
  );
  aws([
    "cloudfront-keyvaluestore",
    "update-keys",
    "--cli-input-json",
    JSON.stringify({
      KvsARN: KVS_ARN_PREVIEW,
      IfMatch: ETag,
      Deletes: deletes.slice(offset, offset + 50),
    }),
  ]);
}
for (const prefix of releases) {
  execFileSync("aws", [
    "s3",
    "rm",
    "s3://" + S3_BUCKET_PREVIEW + "/" + prefix,
    "--recursive",
    "--only-show-errors",
  ]);
}
