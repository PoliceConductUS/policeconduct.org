# Desired inputs for this stack. Terraform loads this file on every plan and apply,
# so every checkout and worktree plans against the same values.
# Secrets never go here: tokens and API keys come from the git-ignored .env files.

# Staff notification recipients.
submission_notification_recipients = ["hello@policeconduct.org"]
