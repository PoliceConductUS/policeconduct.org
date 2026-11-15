# Existing repositories: manage only the requested PR merge settings.
# Other repository controls retain their current owners.
locals {
  merge_policy_repositories = toset([".github", "3-25-CV-03329-S-BN-casegraph", "casegraph", "demo-repository", "engineering-standards", "institute-for-police-conduct.org", "intake", "papercliping", "policeconduct.org", "project-template", "recap-chrome", "section-1983-skills", "section1983.org"])
}

import {
  for_each = local.merge_policy_repositories
  to       = github_repository.merge_policy[each.key]
  id       = each.key
}

resource "github_repository" "merge_policy" {
  for_each = local.merge_policy_repositories
  name     = each.key

  allow_squash_merge     = true
  allow_merge_commit     = false
  allow_rebase_merge     = false
  delete_branch_on_merge = true

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [allow_auto_merge, allow_forking, allow_update_branch, archived, default_branch, description, has_discussions, has_downloads, has_issues, has_projects, has_wiki, homepage_url, is_template, merge_commit_message, merge_commit_title, private, squash_merge_commit_message, squash_merge_commit_title, topics, visibility, vulnerability_alerts, web_commit_signoff_required, pages, security_and_analysis, template]
  }
}
