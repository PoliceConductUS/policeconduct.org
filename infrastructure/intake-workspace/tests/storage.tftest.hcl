mock_provider "aws" {}
variables {
  bucket_name         = "ipc-fixture-workspaces"
  role_prefix         = "fixture-workspace"
  operator_principals = ["arn:aws:iam::123456789012:root"]
}
run "private_versioned_storage" {
  command = plan
  assert {
    condition     = alltrue([for env, policy in local.policies : alltrue([for action in ["s3:GetBucketVersioning", "s3:GetBucketTagging", "s3:GetBucketPublicAccessBlock", "s3:GetEncryptionConfiguration"] : contains(policy.Statement[0].Action, action)])])
    error_message = "Operators must be able to perform the automatic pre-transfer storage validation."
  }
  assert {
    condition     = aws_s3_bucket_versioning.workspace.versioning_configuration[0].status == "Enabled" && !aws_s3_bucket.workspace.force_destroy
    error_message = "Revisions must be retained and bucket deletion protected."
  }
  assert {
    condition     = aws_s3_bucket_public_access_block.workspace.block_public_acls && aws_s3_bucket_public_access_block.workspace.block_public_policy && aws_s3_bucket_public_access_block.workspace.ignore_public_acls && aws_s3_bucket_public_access_block.workspace.restrict_public_buckets
    error_message = "Workspace storage must remain private."
  }
  assert {
    condition     = alltrue([for env, policy in local.policies : policy.Statement[2].Resource == ["arn:aws:s3:::ipc-fixture-workspaces/${env}/*"] && policy.Statement[1].Condition.StringLike["s3:prefix"] == ["${env}/*"]])
    error_message = "Operators must be restricted to their own environment."
  }
}
