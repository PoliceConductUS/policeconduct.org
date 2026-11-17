# Retrospective

The configured workspace directory is the complete transfer boundary; its leaf name determines the bucket prefix. Passing it directly to AWS sync avoids redundant traversal and preserves incremental transfer behavior. Streamed subprocess tests prove progress arrives before completion. Live synthetic recovery separately verified retained versions and the actual operator IAM permissions. Infrastructure ownership is clearest as a standalone root in the existing website repository.
