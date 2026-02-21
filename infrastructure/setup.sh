#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# policeconduct.org — One-time AWS infrastructure setup
#
# Prerequisites:
#   - AWS CLI configured with appropriate IAM permissions
#   - Domain DNS managed (Route 53 or external)
#
# What this creates:
#   1. S3 bucket for production
#   2. S3 bucket for PR previews
#   3. ACM certificate (must be validated via DNS)
#   4. CloudFront distribution for production
#   5. CloudFront distribution for previews (wildcard subdomain)
#   6. CloudFront Origin Access Control
#   7. S3 bucket policies for CloudFront access
#
# After running:
#   - Validate the ACM cert (add the CNAME records it gives you)
#   - Add DNS records pointing to CloudFront
#   - Add secrets/vars to GitHub repo
# =============================================================================

NONINTERACTIVE="${NONINTERACTIVE:-false}"

DOMAIN="policeconduct.org"
PROD_BUCKET="policeconduct.org"
PREVIEW_BUCKET="policeconduct.org-preview"
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

GITHUB_ORG="${GITHUB_ORG:-PoliceConductUS}"
GITHUB_REPO="${GITHUB_REPO:-generate.policeconduct.org}"

echo "=== Account: $ACCOUNT_ID | Region: $REGION ==="
echo "=== GitHub: $GITHUB_ORG/$GITHUB_REPO ==="

# -----------------------------------------------------------------------------
# 1. GitHub OIDC Provider + IAM Role
# -----------------------------------------------------------------------------
echo "--- Configuring GitHub OIDC ---"

OIDC_PROVIDER_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"

# Create OIDC provider if it doesn't exist
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" >/dev/null 2>&1; then
  echo "  OIDC provider already exists"
else
  aws iam create-open-id-connect-provider \
    --url "https://token.actions.githubusercontent.com" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" \
    > /dev/null
  echo "  Created OIDC provider"
fi

# Create IAM role for GitHub Actions
ROLE_NAME="policeconduct-github-actions"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "  IAM role $ROLE_NAME already exists"
else
  TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "$OIDC_PROVIDER_ARN"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:${GITHUB_ORG}/${GITHUB_REPO}:*"
      }
    }
  }]
}
EOF
)
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --description "GitHub Actions OIDC role for policeconduct.org" \
    > /dev/null
  echo "  Created IAM role: $ROLE_NAME"
fi

# Attach inline policy with required permissions
POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:PutBucketPolicy",
        "s3:GetBucketPolicy",
        "s3:PutPublicAccessBlock",
        "s3:GetPublicAccessBlock",
        "s3:HeadBucket",
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::${PROD_BUCKET}",
        "arn:aws:s3:::${PROD_BUCKET}/*",
        "arn:aws:s3:::${PREVIEW_BUCKET}",
        "arn:aws:s3:::${PREVIEW_BUCKET}/*"
      ]
    },
    {
      "Sid": "CloudFrontAccess",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateDistribution",
        "cloudfront:UpdateDistribution",
        "cloudfront:GetDistribution",
        "cloudfront:ListDistributions",
        "cloudfront:CreateInvalidation",
        "cloudfront:CreateOriginAccessControl",
        "cloudfront:ListOriginAccessControls",
        "cloudfront:GetOriginAccessControl",
        "cloudfront:CreateFunction",
        "cloudfront:UpdateFunction",
        "cloudfront:PublishFunction",
        "cloudfront:DescribeFunction",
        "cloudfront:ListFunctions"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ACMAccess",
      "Effect": "Allow",
      "Action": [
        "acm:RequestCertificate",
        "acm:DescribeCertificate",
        "acm:ListCertificates"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Route53Access",
      "Effect": "Allow",
      "Action": [
        "route53:CreateHostedZone",
        "route53:GetHostedZone",
        "route53:ListHostedZonesByName",
        "route53:ChangeResourceRecordSets",
        "route53:ListResourceRecordSets"
      ],
      "Resource": "*"
    }
  ]
}
EOF
)
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "policeconduct-deploy" \
  --policy-document "$POLICY_DOC" \
  > /dev/null
echo "  Attached deploy policy to role"

# -----------------------------------------------------------------------------
# 2. S3 Buckets
# -----------------------------------------------------------------------------
echo "--- Creating S3 buckets ---"

for BUCKET in "$PROD_BUCKET" "$PREVIEW_BUCKET"; do
  if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
    echo "  Bucket $BUCKET already exists"
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
    echo "  Created $BUCKET"
  fi

  # Block all public access — CloudFront uses OAC, not public bucket
  aws s3api put-public-access-block --bucket "$BUCKET" \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
done

# -----------------------------------------------------------------------------
# 2. ACM Certificate
# -----------------------------------------------------------------------------
echo "--- Requesting ACM certificate ---"

EXISTING_CERT=$(aws acm list-certificates --region "$REGION" \
  --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn" \
  --output text 2>/dev/null || true)

if [ -n "$EXISTING_CERT" ] && [ "$EXISTING_CERT" != "None" ]; then
  CERT_ARN="$EXISTING_CERT"
  echo "  Using existing cert: $CERT_ARN"
else
  CERT_ARN=$(aws acm request-certificate --region "$REGION" \
    --domain-name "$DOMAIN" \
    --subject-alternative-names "www.$DOMAIN" "*.preview.$DOMAIN" \
    --validation-method DNS \
    --query CertificateArn --output text)
  echo "  Requested cert: $CERT_ARN"
  NEW_CERT=true
fi

# --- Route 53 Hosted Zone (needed for cert validation) ---
echo "--- Configuring Route 53 hosted zone ---"

EXISTING_ZONE=$(aws route53 list-hosted-zones-by-name \
  --dns-name "$DOMAIN." --max-items 1 \
  --query "HostedZones[?Name=='$DOMAIN.'].Id" --output text 2>/dev/null || true)

if [ -n "$EXISTING_ZONE" ] && [ "$EXISTING_ZONE" != "None" ]; then
  ZONE_ID=$(echo "$EXISTING_ZONE" | sed 's|/hostedzone/||')
  echo "  Using existing hosted zone: $ZONE_ID"
else
  ZONE_ID=$(aws route53 create-hosted-zone \
    --name "$DOMAIN" \
    --caller-reference "$(date +%s)-$DOMAIN" \
    --query 'HostedZone.Id' --output text | sed 's|/hostedzone/||')
  echo "  Created hosted zone: $ZONE_ID"
  echo ""
  echo "  ⚠️  Update your domain registrar's nameservers to:"
  aws route53 get-hosted-zone --id "$ZONE_ID" \
    --query 'DelegationSet.NameServers' --output text | tr '\t' '\n' | sed 's/^/    /'
  echo ""
  if [ "$NONINTERACTIVE" != "true" ]; then
    read -p "  Press Enter once nameservers are updated at your registrar..."
  else
    echo "  ⚠️  IMPORTANT: Update nameservers at your registrar before DNS will work."
  fi
fi

# --- Add ACM validation DNS records ---
echo "  Adding ACM validation records to Route 53..."
sleep 5  # Give ACM a moment to populate validation records
VALIDATION_RECORDS=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" --region "$REGION" \
  --query 'Certificate.DomainValidationOptions[].ResourceRecord' --output json)

VALIDATION_BATCH=$(cat <<EOF
{
  "Changes": $(echo "$VALIDATION_RECORDS" | python3 -c "
import json, sys
records = json.load(sys.stdin)
seen = set()
changes = []
for r in records:
    if r and r['Name'] not in seen:
        seen.add(r['Name'])
        changes.append({
            'Action': 'UPSERT',
            'ResourceRecordSet': {
                'Name': r['Name'],
                'Type': r['Type'],
                'TTL': 300,
                'ResourceRecords': [{'Value': r['Value']}]
            }
        })
print(json.dumps(changes))
")
}
EOF
)
echo "$VALIDATION_BATCH" | aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch file:///dev/stdin > /dev/null 2>&1 || true
echo "  ACM validation records added"

# --- Wait for cert to be issued ---
CERT_STATUS=$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --region "$REGION" \
  --query 'Certificate.Status' --output text)
if [ "$CERT_STATUS" != "ISSUED" ]; then
  echo "  ⏳ Cert status is $CERT_STATUS — polling up to 10 minutes for validation..."
  for i in $(seq 1 60); do
    sleep 10
    CERT_STATUS=$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --region "$REGION" \
      --query 'Certificate.Status' --output text)
    if [ "$CERT_STATUS" = "ISSUED" ]; then break; fi
    echo "    ... still $CERT_STATUS ($((i * 10))s)"
  done
  if [ "$CERT_STATUS" != "ISSUED" ]; then
    echo "  ❌ Cert status is $CERT_STATUS after 10 minutes — must be ISSUED. Exiting."
    exit 1
  fi
fi
echo "  ✅ Cert is ISSUED"

# -----------------------------------------------------------------------------
# 3. Origin Access Control
# -----------------------------------------------------------------------------
echo "--- Creating Origin Access Control ---"

OAC_NAME="policeconduct-oac"
EXISTING_OAC=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$OAC_NAME'].Id" \
  --output text 2>/dev/null || true)

if [ -n "$EXISTING_OAC" ] && [ "$EXISTING_OAC" != "None" ]; then
  OAC_ID="$EXISTING_OAC"
  echo "  Using existing OAC: $OAC_ID"
else
  OAC_ID=$(aws cloudfront create-origin-access-control \
    --origin-access-control-config "{
      \"Name\": \"$OAC_NAME\",
      \"Description\": \"OAC for policeconduct.org\",
      \"SigningProtocol\": \"sigv4\",
      \"SigningBehavior\": \"always\",
      \"OriginAccessControlOriginType\": \"s3\"
    }" --query 'OriginAccessControl.Id' --output text)
  echo "  Created OAC: $OAC_ID"
fi

# -----------------------------------------------------------------------------
# 4. CloudFront — Production Distribution
# -----------------------------------------------------------------------------
echo "--- Creating production CloudFront distribution ---"

create_distribution() {
  local BUCKET_NAME=$1
  local ALIASES=$2
  local COMMENT=$3
  local DEFAULT_ROOT=$4
  local ORIGIN_PATH=$5

  local ORIGIN_DOMAIN="${BUCKET_NAME}.s3.${REGION}.amazonaws.com"
  local ORIGIN_ID="S3-${BUCKET_NAME}"

  local CONFIG=$(cat <<EOF
{
  "CallerReference": "$(date +%s)-${BUCKET_NAME}",
  "Comment": "$COMMENT",
  "Enabled": true,
  "Aliases": $ALIASES,
  "DefaultRootObject": "$DEFAULT_ROOT",
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "$ORIGIN_ID",
      "DomainName": "$ORIGIN_DOMAIN",
      "OriginPath": "$ORIGIN_PATH",
      "S3OriginConfig": { "OriginAccessIdentity": "" },
      "OriginAccessControlId": "$OAC_ID"
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "$ORIGIN_ID",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "ResponseHeadersPolicyId": "67f7725c-6f97-4210-82d7-5512b31e9d03",
    "FunctionAssociations": {
      "Quantity": 1,
      "Items": [{
        "FunctionARN": "$PROD_FUNC_ARN",
        "EventType": "viewer-request"
      }]
    }
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [{
      "ErrorCode": 404,
      "ResponsePagePath": "/404.html",
      "ResponseCode": "404",
      "ErrorCachingMinTTL": 300
    }]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "$CERT_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "HttpVersion": "http2and3",
  "PriceClass": "PriceClass_100"
}
EOF
)

  echo "$CONFIG"
}

# Create CloudFront Function for index.html rewriting (prod)
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
  PROD_FUNC_ETAG=$(aws cloudfront describe-function --name "$PROD_FUNC_NAME" \
    --query 'ETag' --output text)
  aws cloudfront update-function --name "$PROD_FUNC_NAME" \
    --function-config '{"Comment":"Rewrite directory paths to index.html","Runtime":"cloudfront-js-2.0"}' \
    --function-code fileb://<(echo "$PROD_FUNC_CODE") \
    --if-match "$PROD_FUNC_ETAG" > /dev/null
  PROD_FUNC_ETAG=$(aws cloudfront describe-function --name "$PROD_FUNC_NAME" \
    --query 'ETag' --output text)
  aws cloudfront publish-function --name "$PROD_FUNC_NAME" --if-match "$PROD_FUNC_ETAG" > /dev/null
  PROD_FUNC_ARN="$EXISTING_PROD_FUNC"
  echo "  Updated function: $PROD_FUNC_NAME"
else
  PROD_FUNC_ARN=$(aws cloudfront create-function \
    --name "$PROD_FUNC_NAME" \
    --function-config '{"Comment":"Rewrite directory paths to index.html","Runtime":"cloudfront-js-2.0"}' \
    --function-code fileb://<(echo "$PROD_FUNC_CODE") \
    --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text)
  PROD_FUNC_ETAG=$(aws cloudfront describe-function --name "$PROD_FUNC_NAME" \
    --query 'ETag' --output text)
  aws cloudfront publish-function --name "$PROD_FUNC_NAME" --if-match "$PROD_FUNC_ETAG" > /dev/null
  echo "  Created function: $PROD_FUNC_NAME"
fi

# Check for existing prod distribution
PROD_DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='policeconduct.org production'].Id" \
  --output text 2>/dev/null || true)

if [ -n "$PROD_DIST_ID" ] && [ "$PROD_DIST_ID" != "None" ]; then
  echo "  Using existing prod distribution: $PROD_DIST_ID"
else
  PROD_CONFIG=$(create_distribution \
    "$PROD_BUCKET" \
    '{"Quantity": 2, "Items": ["policeconduct.org", "www.policeconduct.org"]}' \
    "policeconduct.org production" \
    "index.html" \
    "")

  PROD_DIST_ID=$(echo "$PROD_CONFIG" | \
    aws cloudfront create-distribution \
      --distribution-config file:///dev/stdin \
      --query 'Distribution.Id' --output text)
  echo "  Created prod distribution: $PROD_DIST_ID"
fi

PROD_CF_DOMAIN=$(aws cloudfront get-distribution --id "$PROD_DIST_ID" \
  --query 'Distribution.DomainName' --output text)

# -----------------------------------------------------------------------------
# 5. CloudFront — Preview Distribution
# -----------------------------------------------------------------------------
echo "--- Creating preview CloudFront distribution ---"

PREVIEW_DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='policeconduct.org previews'].Id" \
  --output text 2>/dev/null || true)

if [ -n "$PREVIEW_DIST_ID" ] && [ "$PREVIEW_DIST_ID" != "None" ]; then
  echo "  Using existing preview distribution: $PREVIEW_DIST_ID"
else
  # Preview needs a CloudFront Function to rewrite Host → S3 path
  # e.g., pr-123.preview.policeconduct.org → /pr-123/
  FUNC_NAME="policeconduct-preview-router"

  FUNC_CODE=$(cat <<'JSEOF'
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

  # Create or update the function
  EXISTING_FUNC=$(aws cloudfront list-functions \
    --query "FunctionList.Items[?Name=='$FUNC_NAME'].FunctionMetadata.FunctionARN" \
    --output text 2>/dev/null || true)

  if [ -n "$EXISTING_FUNC" ] && [ "$EXISTING_FUNC" != "None" ]; then
    FUNC_ETAG=$(aws cloudfront describe-function --name "$FUNC_NAME" \
      --query 'ETag' --output text)
    aws cloudfront update-function --name "$FUNC_NAME" \
      --function-config '{"Comment":"Route preview subdomains to S3 prefixes","Runtime":"cloudfront-js-2.0"}' \
      --function-code fileb://<(echo "$FUNC_CODE") \
      --if-match "$FUNC_ETAG" > /dev/null
    FUNC_ETAG=$(aws cloudfront describe-function --name "$FUNC_NAME" \
      --query 'ETag' --output text)
    aws cloudfront publish-function --name "$FUNC_NAME" --if-match "$FUNC_ETAG" > /dev/null
    FUNC_ARN="$EXISTING_FUNC"
    echo "  Updated function: $FUNC_NAME"
  else
    FUNC_ARN=$(aws cloudfront create-function \
      --name "$FUNC_NAME" \
      --function-config '{"Comment":"Route preview subdomains to S3 prefixes","Runtime":"cloudfront-js-2.0"}' \
      --function-code fileb://<(echo "$FUNC_CODE") \
      --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text)
    FUNC_ETAG=$(aws cloudfront describe-function --name "$FUNC_NAME" \
      --query 'ETag' --output text)
    aws cloudfront publish-function --name "$FUNC_NAME" --if-match "$FUNC_ETAG" > /dev/null
    echo "  Created function: $FUNC_NAME"
  fi

  PREVIEW_ORIGIN="$PREVIEW_BUCKET.s3.${REGION}.amazonaws.com"

  PREVIEW_CONFIG=$(cat <<EOF
{
  "CallerReference": "$(date +%s)-preview",
  "Comment": "policeconduct.org previews",
  "Enabled": true,
  "Aliases": {"Quantity": 1, "Items": ["*.preview.policeconduct.org"]},
  "DefaultRootObject": "",
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "S3-preview",
      "DomainName": "$PREVIEW_ORIGIN",
      "OriginPath": "",
      "S3OriginConfig": { "OriginAccessIdentity": "" },
      "OriginAccessControlId": "$OAC_ID"
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-preview",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "FunctionAssociations": {
      "Quantity": 1,
      "Items": [{
        "FunctionARN": "$FUNC_ARN",
        "EventType": "viewer-request"
      }]
    }
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [{
      "ErrorCode": 404,
      "ResponsePagePath": "/404.html",
      "ResponseCode": "404",
      "ErrorCachingMinTTL": 60
    }]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "$CERT_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "HttpVersion": "http2and3",
  "PriceClass": "PriceClass_100"
}
EOF
)

  PREVIEW_DIST_ID=$(echo "$PREVIEW_CONFIG" | \
    aws cloudfront create-distribution \
      --distribution-config file:///dev/stdin \
      --query 'Distribution.Id' --output text)
  echo "  Created preview distribution: $PREVIEW_DIST_ID"
fi

PREVIEW_CF_DOMAIN=$(aws cloudfront get-distribution --id "$PREVIEW_DIST_ID" \
  --query 'Distribution.DomainName' --output text)

# -----------------------------------------------------------------------------
# 6. S3 Bucket Policies (allow CloudFront OAC)
# -----------------------------------------------------------------------------
echo "--- Setting S3 bucket policies ---"

for BUCKET in "$PROD_BUCKET" "$PREVIEW_BUCKET"; do
  POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontOAC",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${BUCKET}/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceAccount": "$ACCOUNT_ID"
      }
    }
  }]
}
EOF
)
  echo "$POLICY" | aws s3api put-bucket-policy --bucket "$BUCKET" --policy file:///dev/stdin
  echo "  Set policy on $BUCKET"
done

# -----------------------------------------------------------------------------
# 7. Route 53 — CloudFront DNS Records
# -----------------------------------------------------------------------------
echo "--- Adding CloudFront DNS records ---"
CHANGE_BATCH=$(cat <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$DOMAIN",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "$PROD_CF_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$DOMAIN",
        "Type": "AAAA",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "$PROD_CF_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.$DOMAIN",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "$PROD_CF_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.$DOMAIN",
        "Type": "AAAA",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "$PROD_CF_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "*.preview.$DOMAIN",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "$PREVIEW_CF_DOMAIN"}]
      }
    }
  ]
}
EOF
)
aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch file:///dev/stdin <<< "$CHANGE_BATCH" > /dev/null
echo "  DNS records created"

# -----------------------------------------------------------------------------
# 8. Summary
# -----------------------------------------------------------------------------
echo ""
echo "==========================================="
echo "  ✅  Infrastructure ready!"
echo "==========================================="
echo ""
echo "  Production CloudFront:  $PROD_DIST_ID"
echo "  Production domain:      $PROD_CF_DOMAIN"
echo "  Preview CloudFront:     $PREVIEW_DIST_ID"
echo "  Preview domain:         $PREVIEW_CF_DOMAIN"
echo "  ACM Certificate:        $CERT_ARN"
echo "  Route 53 Zone:          $ZONE_ID"
echo "  IAM Role:               $ROLE_ARN"
echo ""
echo "  DNS records created:"
echo "    policeconduct.org          → A/AAAA ALIAS → $PROD_CF_DOMAIN"
echo "    www.policeconduct.org      → A/AAAA ALIAS → $PROD_CF_DOMAIN"
echo "    *.preview.policeconduct.org → CNAME       → $PREVIEW_CF_DOMAIN"
echo ""
echo "  GitHub environment variables:"
echo "    production:"
echo "      AWS_ROLE_ARN=$ROLE_ARN"
echo "      S3_BUCKET=$PROD_BUCKET"
echo "      CLOUDFRONT_DIST_ID=$PROD_DIST_ID"
echo "    preview:"
echo "      AWS_ROLE_ARN=$ROLE_ARN"
echo "      S3_BUCKET=$PREVIEW_BUCKET"
echo "      CLOUDFRONT_DIST_ID=$PREVIEW_DIST_ID"
echo ""
echo "  No secrets needed — OIDC federation handles auth automatically."
echo ""
