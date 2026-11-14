import { randomUUID } from "node:crypto";
import "@aws-sdk/signature-v4a";
import {
  CloudFrontKeyValueStoreClient,
  DescribeKeyValueStoreCommand,
  GetKeyCommand,
  UpdateKeysCommand,
} from "@aws-sdk/client-cloudfront-keyvaluestore";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import { createHandler } from "./service.mjs";

const store = new CloudFrontKeyValueStoreClient({ region: "us-east-1" });
const s3 = new S3Client({});
const cloudFront = new CloudFrontClient({ region: "us-east-1" });
const KvsARN = process.env.KVS_ARN;

export const handler = createHandler({
  privateBucket: process.env.RELEASE_DATA_BUCKET,
  readCurrent: async () => {
    const result = await store.send(
      new GetKeyCommand({ KvsARN, Key: "current" }),
    );
    return result.Value;
  },
  verifyOverride: (Key) =>
    s3.send(new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key })),
  releasePage: async (Key) => {
    const { ETag } = await store.send(
      new DescribeKeyValueStoreCommand({ KvsARN }),
    );
    await store.send(
      new UpdateKeysCommand({
        KvsARN,
        IfMatch: ETag,
        Puts: [{ Key, Value: "1" }],
      }),
    );
  },
  invalidate: async (Items) => {
    const result = await cloudFront.send(
      new CreateInvalidationCommand({
        DistributionId: process.env.CLOUDFRONT_DIST_ID,
        InvalidationBatch: {
          CallerReference: randomUUID(),
          Paths: { Quantity: Items.length, Items },
        },
      }),
    );
    return result.Invalidation.Id;
  },
});

export async function snapshot(event) {
  if (event.operation !== "release-snapshot")
    throw new Error("Expected release-snapshot");
  return handler(event);
}
