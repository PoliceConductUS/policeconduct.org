# Private workspace storage belongs to this existing infrastructure stack.
module "intake_workspace" {
  source              = "../modules/intake-workspace"
  bucket_name         = "${var.project_name}-intake-workspace-${data.aws_caller_identity.current.account_id}"
  role_prefix         = "${var.project_name}-intake-workspace"
  operator_principals = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
}
output "intake_workspace_bucket_name" { value = module.intake_workspace.bucket_name }
output "intake_workspace_prefixes" { value = module.intake_workspace.workspace_prefixes }
output "intake_workspace_operator_roles" { value = module.intake_workspace.operator_role_arns }
