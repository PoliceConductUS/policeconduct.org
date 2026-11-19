## 1. Remove the daily delivery probe

- [x] Delete the probe source, tests, configuration, and Terraform resources (PR #30).
- [x] Keep verified-submission notifications.
- [x] Run scoped checks and review the deletion plan on the PR #30 head (see verify.md).
- [x] Merge PR #30 (merged 2026-10-26, commit 93b62da).

## 2. Clean up what PR #30 left

- [ ] `infrastructure/bootstrap-policeconduct/logs.tf`: remove `/aws/lambda/policeconduct-notification-canary` from the `for_each` set, delete its `import` block, and drop "or the retired canary's log contents" from the line 2 comment. Pass: `grep -rn canary infrastructure/` finds nothing; `terraform -chdir=infrastructure/bootstrap-policeconduct validate` passes.
- [ ] `infrastructure/bootstrap-policeconduct/EGM.md:253-254`: describe `aws_cloudwatch_log_group.existing_lambda` as the two forms API log groups only. Pass: no "canary" in the file.
- [ ] `.gitignore`: delete the `notification-canary.zip` line. Pass: `grep -n notification-canary .gitignore` finds nothing.
- [ ] `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs`: keep the verified-only gate in `notifySubmissionEvent`. Remove every branch that only a non-`"verified"` event can reach after the gate (for example, the `"received"` subject label becomes `const action = "VERIFIED";`, and any `"received"` receipt-key branch goes). Pass: `grep -n '"received"' index.mjs` finds nothing.
- [ ] `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.test.mjs`: change the tests that pass `eventType: "received"` to `"verified"`, except the gate regression test, which keeps a non-verified event and asserts no side effects. Keep the test that every error-level `forms.notify` line has a CloudWatch alarm. Pass: `node --test` in that folder passes with 0 skipped.
- [ ] `infrastructure/bootstrap-policeconduct/lambdas/forms-api/index.mjs:1017-1019`: the comment says the S3 notification filters on `submissions/2` and `submissions/status/`. Change it to say it filters on `submissions/status/` only, and that a receipt written under `submissions/` could match a notification rule and fire a notification about a notification.
- [ ] `infrastructure/submission-notifications/EGM.md` "Callers": replace "the value is passed by the operator, not read automatically" with: `scripts/apply.sh` reads it from this root's output and refuses to apply if it cannot (cite `../bootstrap-policeconduct/scripts/apply.sh:resolve_submission_notifications_topic_arn`). Replace the last bullet with: no script plans or applies this root; `scripts/terraform-outputs.mjs` reads its `submission_notifications_topic_arn` output as `SUBMISSION_NOTIFICATIONS_TOPIC_ARN`.
- [ ] `infrastructure/submission-notifications/README.md`: replace "Manual merge and production deployment require approval." with "Apply from `main` after the pull request merges; there is no approval gate." Replace "after the approved apply" with "after the apply".
- [ ] `infrastructure/submission-notifications/versions.tf:11`: replace the comment with `# Existing state for the notification resources.`
- [ ] Open a pull request with these edits and merge it.

## 3. Apply and check in AWS

- [x] Apply `infrastructure/submission-notifications` (2026-11-18): 0 to add, 2 to change, 0 to destroy (see verify.md).
- [ ] Run each command in the `verify_commands` output of `infrastructure/submission-notifications`. Record that every subscription reads Confirmed and that each submissions bucket has exactly one rule, filtered on `submissions/status/`.
- [ ] For each of the 16 addresses in verify.md, run the matching `aws` get or describe call and record that it returns not found.
- [ ] After the section 2 pull request merges, run `terraform -chdir=infrastructure/bootstrap-policeconduct plan` from `main`. Record the commit SHA and every planned address in verify.md. Expect exactly one destroy, `aws_cloudwatch_log_group.existing_lambda["/aws/lambda/policeconduct-notification-canary"]`, and no other destroys. Then apply. Record that `aws logs describe-log-groups --log-group-name-prefix /aws/lambda/policeconduct-notification-canary` returns no groups.
- [ ] Compare the deployed forms API code with `main`. If they differ, deploy with `infrastructure/bootstrap-policeconduct/scripts/deploy-forms-api.sh`, preview first (`--only policeconduct-forms-api-preview`), then production. Record the result either way.
- [ ] A person submits one clearly synthetic request through the preview form (`infrastructure/submission-notifications/README.md` "Verify"). Record in verify.md: the submitter verification email arrived; no staff email and no SNS message before verification; staff email and SNS message after verification; the notification receipt key (`notifications/<date>/<id>-verified.json`), `snsPublished`, `emailSent`, and the Resend message id. Record no request content.

## 4. Close

- [ ] Run `npm run validate` on the final head and record the AGENTS.md "Validation Expectations" fields in verify.md.
- [ ] Finish retrospective.md.
- [ ] Archive this change after `notify-staff-after-verification` is archived.
