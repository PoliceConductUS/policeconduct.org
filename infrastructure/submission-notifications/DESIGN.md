# Notification paths

The forms API stores the request and sends its submitter a verification link.
After successful verification it writes `submissions/status/<id>.json`, then
sends staff notifications through Resend and SNS. The status write also triggers
the S3-to-SNS backstop. Initial request writes do not trigger staff notifications.

Notification receipts retain transport metadata for audit and acceptance checks.
No request body is copied into a notification. Reviewing or ignoring requests
remains a manual responsibility.

The board removed monitoring from scope. All scheduled checks and their dedicated
infrastructure are deleted. No replacement monitor is introduced.
