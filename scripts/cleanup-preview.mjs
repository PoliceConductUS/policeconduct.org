import { execFileSync } from "node:child_process";

const { PR_NUMBER, KVS_ARN_PREVIEW } = process.env;
if (!/^[1-9]\d*$/.test(PR_NUMBER ?? "") || !KVS_ARN_PREVIEW)
  throw new Error("Missing preview store or invalid PR number");
const aws = (args) =>
  JSON.parse(
    execFileSync("aws", [...args, "--output", "json"], { encoding: "utf8" }),
  );
const pointer = "current:pr-" + PR_NUMBER;
let found = false;
let token;
do {
  const page = aws([
    "cloudfront-keyvaluestore",
    "list-keys",
    "--kvs-arn",
    KVS_ARN_PREVIEW,
    "--no-paginate",
    ...(token ? ["--next-token", token] : []),
  ]);
  found ||= (page.Items ?? []).some(({ Key }) => Key === pointer);
  token = page.NextToken;
} while (token);
if (found) {
  const { ETag } = aws([
    "cloudfront-keyvaluestore",
    "describe-key-value-store",
    "--kvs-arn",
    KVS_ARN_PREVIEW,
  ]);
  aws([
    "cloudfront-keyvaluestore",
    "update-keys",
    "--cli-input-json",
    JSON.stringify({
      KvsARN: KVS_ARN_PREVIEW,
      IfMatch: ETag,
      Deletes: [{ Key: pointer }],
    }),
  ]);
}
// A commit folder may also serve another PR or latest-main preview.
// Closing one PR removes its host selection; folder retirement is separate.
