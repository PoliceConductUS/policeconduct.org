#!/bin/bash
set -euo pipefail

REGION="us-east-1"

echo "=== 1. Create & publish prod index-rewrite function ==="

PROD_FUNC_NAME="policeconduct-index-rewrite"
PROD_FUNC_CODE=$(cat <<'JSEOF'
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }
  return request;
}
JSEOF
)

EXISTING_PROD_FUNC=$(aws cloudfront list-functions \
  --query "FunctionList.Items[?Name=='$PROD_FUNC_NAME'].FunctionMetadata.FunctionARN" \
  --output text 2>/dev/null || true)

if [ -n "$EXISTING_PROD_FUNC" ] && [ "$EXISTING_PROD_FUNC" != "None" ]; then
  echo "  Updating existing function..."
  ETAG=$(aws cloudfront describe-function --name "$PROD_FUNC_NAME" --query 'ETag' --output text)
  aws cloudfront update-function --name "$PROD_FUNC_NAME" \
    --function-config '{"Comment":"Rewrite directory paths to index.html","Runtime":"cloudfront-js-2.0"}' \
    --function-code fileb://<(echo "$PROD_FUNC_CODE") \
    --if-match "$ETAG" > /dev/null
else
  echo "  Creating new function..."
  aws cloudfront create-function \
    --name "$PROD_FUNC_NAME" \
    --function-config '{"Comment":"Rewrite directory paths to index.html","Runtime":"cloudfront-js-2.0"}' \
    --function-code fileb://<(echo "$PROD_FUNC_CODE") > /dev/null
fi

ETAG=$(aws cloudfront describe-function --name "$PROD_FUNC_NAME" --query 'ETag' --output text)
aws cloudfront publish-function --name "$PROD_FUNC_NAME" --if-match "$ETAG" > /dev/null
PROD_FUNC_ARN=$(aws cloudfront describe-function --name "$PROD_FUNC_NAME" --stage LIVE \
  --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text)
echo "  ✅ Prod function ready: $PROD_FUNC_ARN"

echo ""
echo "=== 2. Attach function to prod distribution ==="

PROD_DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='policeconduct.org production'].Id" --output text)
echo "  Prod distribution: $PROD_DIST_ID"

aws cloudfront get-distribution-config --id "$PROD_DIST_ID" --output json > /tmp/prod-dist.json
PROD_ETAG=$(jq -r '.ETag' /tmp/prod-dist.json)

jq --arg arn "$PROD_FUNC_ARN" \
  '.DistributionConfig.DefaultCacheBehavior.FunctionAssociations = {
    "Quantity": 1,
    "Items": [{"FunctionARN": $arn, "EventType": "viewer-request"}]
  } | .DistributionConfig' /tmp/prod-dist.json > /tmp/prod-dist-update.json

aws cloudfront update-distribution --id "$PROD_DIST_ID" \
  --distribution-config file:///tmp/prod-dist-update.json \
  --if-match "$PROD_ETAG" > /dev/null
echo "  ✅ Prod distribution updated"

echo ""
echo "=== 3. Update preview function with extensionless path handling ==="

PREVIEW_FUNC_NAME="policeconduct-preview-router"
PREVIEW_FUNC_CODE=$(cat <<'JSEOF'
function handler(event) {
  var request = event.request;
  var host = request.headers.host.value;
  var match = host.match(/^(pr-\d+)\.preview\./);
  if (match) {
    request.uri = '/' + match[1] + request.uri;
  }
  // Add index.html for directory requests
  if (request.uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!request.uri.includes('.')) {
    request.uri += '/index.html';
  }
  return request;
}
JSEOF
)

EXISTING_PREVIEW_FUNC=$(aws cloudfront list-functions \
  --query "FunctionList.Items[?Name=='$PREVIEW_FUNC_NAME'].FunctionMetadata.FunctionARN" \
  --output text 2>/dev/null || true)

if [ -n "$EXISTING_PREVIEW_FUNC" ] && [ "$EXISTING_PREVIEW_FUNC" != "None" ]; then
  echo "  Updating existing function..."
  ETAG=$(aws cloudfront describe-function --name "$PREVIEW_FUNC_NAME" --query 'ETag' --output text)
  aws cloudfront update-function --name "$PREVIEW_FUNC_NAME" \
    --function-config '{"Comment":"Route preview subdomains to S3 prefixes","Runtime":"cloudfront-js-2.0"}' \
    --function-code fileb://<(echo "$PREVIEW_FUNC_CODE") \
    --if-match "$ETAG" > /dev/null
  ETAG=$(aws cloudfront describe-function --name "$PREVIEW_FUNC_NAME" --query 'ETag' --output text)
  aws cloudfront publish-function --name "$PREVIEW_FUNC_NAME" --if-match "$ETAG" > /dev/null
  echo "  ✅ Preview function updated"
else
  echo "  ⚠️  Preview function doesn't exist yet — will be created by setup.sh"
fi

echo ""
echo "=== Done! CloudFront will propagate in ~2-5 minutes ==="
