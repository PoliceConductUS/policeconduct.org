#!/usr/bin/env bash
set -euo pipefail

# Creates (or updates) a least-privilege IAM user that can run the Terraform
# bootstrap stack. Must be executed using admin-capable AWS credentials.

USER_NAME="${1:-policeconduct-bootstrap-user}"
POLICY_NAME="${2:-policeconduct-bootstrap-user-inline}"
PROFILE_NAME="${3:-policeconduct-bootstrap}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POLICY_FILE="${SCRIPT_DIR}/bootstrap-user-policy.json"

if [[ ! -f "${POLICY_FILE}" ]]; then
  echo "Policy file not found: ${POLICY_FILE}"
  exit 1
fi

ACCOUNT_ID="$(aws sts get-caller-identity --query 'Account' --output text)"

echo "Using AWS account: ${ACCOUNT_ID}"
echo "Ensuring IAM user exists: ${USER_NAME}"

if aws iam get-user --user-name "${USER_NAME}" >/dev/null 2>&1; then
  echo "User already exists: ${USER_NAME}"
else
  aws iam create-user --user-name "${USER_NAME}" >/dev/null
  echo "Created user: ${USER_NAME}"
fi

echo "Applying inline policy: ${POLICY_NAME}"
aws iam put-user-policy \
  --user-name "${USER_NAME}" \
  --policy-name "${POLICY_NAME}" \
  --policy-document "file://${POLICY_FILE}" \
  >/dev/null

KEY_COUNT="$(aws iam list-access-keys \
  --user-name "${USER_NAME}" \
  --query 'length(AccessKeyMetadata)' \
  --output text)"

if [[ "${KEY_COUNT}" -ge 2 ]]; then
  echo "User already has 2 access keys. Delete one key first, then rerun."
  echo "List keys:"
  aws iam list-access-keys --user-name "${USER_NAME}" --output table
  exit 1
fi

echo "Creating new access key for ${USER_NAME}..."
read -r ACCESS_KEY_ID SECRET_ACCESS_KEY < <(
  aws iam create-access-key \
    --user-name "${USER_NAME}" \
    --query 'AccessKey.[AccessKeyId,SecretAccessKey]' \
    --output text
)

cat <<EOF

Bootstrap IAM user is ready.

Save these credentials now. The secret key is shown only once.

AWS Access Key ID: ${ACCESS_KEY_ID}
AWS Secret Access Key: ${SECRET_ACCESS_KEY}

Recommended next steps:

1) Configure a local profile:
   aws configure set aws_access_key_id "${ACCESS_KEY_ID}" --profile "${PROFILE_NAME}"
   aws configure set aws_secret_access_key "${SECRET_ACCESS_KEY}" --profile "${PROFILE_NAME}"
   aws configure set region "us-east-1" --profile "${PROFILE_NAME}"
   export AWS_PROFILE="${PROFILE_NAME}"

2) Verify identity:
   aws sts get-caller-identity

3) Run bootstrap Terraform:
   terraform -chdir=infrastructure/bootstrap-policeconduct init
   terraform -chdir=infrastructure/bootstrap-policeconduct apply
EOF
