# Outcome

Production URL redirects must be testable on preview through the same routing implementation. Keep the existing distributions, buckets, and root/PR-prefix layouts; do not introduce atomic promotion or GitHub deployments. Use each deployed build's authoritative redirect map. Preview rollout is authorized; the scope of immediate production rollout is awaiting user clarification.
